import { beforeEach, describe, expect, it, vi } from "vitest";
import { AxiosError } from "axios";
import { ApiClient } from "./client";

const REFRESHED_TOKEN = "refreshed-token-456";

const delay = (ms = 8) => new Promise((resolve) => setTimeout(resolve, ms));

const makeError = (response) =>
  new AxiosError(
    `Request failed with status code ${response.status}`,
    AxiosError.ERR_BAD_REQUEST,
    response.config,
    undefined,
    response,
  );

const responseOf = (status, config, data) => ({
  status,
  statusText: status === 200 ? "OK" : "ERROR",
  headers: config.headers || {},
  config,
  data: data ?? {},
});

const makeScenario = ({
  retryCount = 1,
  refreshFail = false,
  refreshData,
  raceRefreshes = 0,
} = {}) => {
  const refreshCalls = [];
  const calls = {};
  const seen = [];
  let raced = 0;

  const adapter = async (config) => {
    await delay();
    const url = config.url;

    // Snapshot headers using Axios 1.x clone if available, fallback to shallow copy
    seen.push({
      url,
      headers:
        config.headers && typeof config.headers.clone === "function"
          ? config.headers.clone()
          : { ...config.headers },
    });
    calls[url] = (calls[url] || 0) + 1;

    if (url.includes("/auth/refresh-token")) {
      refreshCalls.push(config);
      if (raced < raceRefreshes) {
        raced += 1;
        throw makeError(
          responseOf(401, config, {
            detail:
              "Refresh token was already rotated by a concurrent request.",
            code: "TOKEN_ROTATION_RACE",
          }),
        );
      }
      if (refreshFail) {
        throw makeError(responseOf(401, config, { detail: "expired refresh" }));
      }
      return responseOf(
        200,
        config,
        refreshData ?? { access_token: REFRESHED_TOKEN },
      );
    }

    if (url.includes("/protected")) {
      if (refreshCalls.length === 0 && calls[url] <= retryCount) {
        throw makeError(responseOf(401, config, {}));
      }
      return responseOf(200, config, { ok: true });
    }

    throw makeError(responseOf(404, config, {}));
  };

  return { adapter, refreshCalls, calls, seen };
};

const getAuthHeader = (headers) => {
  if (!headers) return null;
  if (typeof headers.get === "function") {
    return headers.get("Authorization") || headers.get("authorization");
  }
  return headers.Authorization || headers.authorization;
};

const install = (client, scenario) => {
  client.api.defaults.adapter = scenario.adapter;
  client.authApi.defaults.adapter = scenario.adapter;
  return scenario;
};

describe("ApiClient interceptor and token refresh flow", () => {
  let client;

  beforeEach(() => {
    // Instantiate a fresh ApiClient for isolation in each test
    client = new ApiClient("http://localhost:8000/v1");
  });

  it("refreshes the token and retries the original 401 request", async () => {
    const { calls, refreshCalls, seen } = install(client, makeScenario());
    const onRefreshed = vi.fn();
    client.onTokenRefreshed(onRefreshed);

    const res = await client.api.get("/protected");

    expect(res.data).toEqual({ ok: true });
    expect(calls["/protected"]).toBe(2);
    expect(refreshCalls.length).toBe(1);
    expect(onRefreshed).toHaveBeenCalledWith(REFRESHED_TOKEN);

    const lastRequestHeader = getAuthHeader(seen[seen.length - 1].headers);
    expect(lastRequestHeader).toBe(`Bearer ${REFRESHED_TOKEN}`);
  });

  it("attaches an existing bearer token on outbound requests", async () => {
    const { seen } = install(client, makeScenario());
    client.setToken("existing-token");

    await client.api.get("/protected", { params: { page: 1 } });

    const protectedRequests = seen.filter((c) => c.url.includes("/protected"));
    expect(getAuthHeader(protectedRequests[0].headers)).toBe(
      "Bearer existing-token",
    );
    expect(getAuthHeader(protectedRequests[1].headers)).toBe(
      `Bearer ${REFRESHED_TOKEN}`,
    );
  });

  it("does not retry non-401 errors", async () => {
    const scenario = makeScenario();
    scenario.adapter = async () => {
      throw makeError(responseOf(404, {}, {}));
    };
    install(client, scenario);

    await expect(client.api.get("/protected")).rejects.toMatchObject({
      response: { status: 404 },
    });
    expect(scenario.refreshCalls.length).toBe(0);
  });

  it("coalesces concurrent 401s into a single refresh request", async () => {
    const { refreshCalls } = install(client, makeScenario({ retryCount: 2 }));

    const [res1, res2] = await Promise.all([
      client.api.get("/protected"),
      client.api.get("/protected"),
    ]);

    expect(res1.data).toEqual({ ok: true });
    expect(res2.data).toEqual({ ok: true });
    expect(refreshCalls.length).toBe(1);
  });

  it("shares one refresh between a token-level caller and an in-flight 401", async () => {
    const { refreshCalls } = install(client, makeScenario());

    const [token, res] = await Promise.all([
      client.refresh(),
      client.api.get("/protected"),
    ]);

    expect(token).toBe(REFRESHED_TOKEN);
    expect(res.data).toEqual({ ok: true });
    expect(refreshCalls.length).toBe(1);
  });

  it("retries after a concurrent-rotation 401 instead of logging out", async () => {
    const { calls, refreshCalls } = install(
      client,
      makeScenario({ raceRefreshes: 1 }),
    );
    const onRefreshed = vi.fn();
    client.onTokenRefreshed(onRefreshed);

    const res = await client.api.get("/protected");

    expect(res.data).toEqual({ ok: true });
    expect(calls["/protected"]).toBe(2);
    expect(refreshCalls.length).toBe(2);
    expect(client.accessToken).toBe(REFRESHED_TOKEN);
    expect(onRefreshed).not.toHaveBeenCalledWith(null);
  });

  it("gives up and clears auth when the rotation race never resolves", async () => {
    const { refreshCalls } = install(
      client,
      makeScenario({ raceRefreshes: Number.POSITIVE_INFINITY }),
    );
    const onRefreshed = vi.fn();
    client.onTokenRefreshed(onRefreshed);

    await expect(client.api.get("/protected")).rejects.toMatchObject({
      response: { status: 401 },
    });

    // Initial attempt plus RACE_RETRY_ATTEMPTS retries.
    expect(refreshCalls.length).toBe(3);
    expect(client.accessToken).toBeNull();
    expect(client.isRefreshing).toBe(false);
    expect(onRefreshed).toHaveBeenCalledWith(null);
  });

  it("does not loop on a 401 from the authApi refresh endpoint itself", async () => {
    const { refreshCalls } = install(
      client,
      makeScenario({ refreshFail: true }),
    );

    await expect(
      client.authApi.post("/auth/refresh-token"),
    ).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(refreshCalls.length).toBe(1);
  });

  it("notifies listeners with null and rejects all queued requests when refresh fails", async () => {
    install(client, makeScenario({ refreshFail: true, retryCount: 2 }));
    const onRefreshed = vi.fn();
    client.onTokenRefreshed(onRefreshed);

    const [req1, req2] = await Promise.allSettled([
      client.api.get("/protected"),
      client.api.get("/protected"),
    ]);

    expect(req1.status).toBe("rejected");
    expect(req2.status).toBe("rejected");
    expect(onRefreshed).toHaveBeenCalledWith(null);
    expect(client.accessToken).toBeNull();
  });

  // Refresh failures that carry no session verdict (network layer, 5xx) must
  // leave the in-memory token alone so a later request can retry the refresh.
  const makeTransientRefreshFailure = (failure) => {
    const scenario = makeScenario();
    const delegate = scenario.adapter;
    scenario.adapter = async (config) => {
      if (config.url.includes("/auth/refresh-token")) throw failure(config);
      return delegate(config);
    };
    return scenario;
  };

  const expectAuthSurvives = async (scenario) => {
    install(client, scenario);
    client.setToken("existing-token");
    const onRefreshed = vi.fn();
    client.onTokenRefreshed(onRefreshed);

    await expect(client.api.get("/protected")).rejects.toBeTruthy();

    expect(client.accessToken).toBe("existing-token");
    expect(onRefreshed).not.toHaveBeenCalledWith(null);
    expect(client.isRefreshing).toBe(false);
  };

  it("keeps auth when the refresh request fails at the network layer", async () => {
    await expectAuthSurvives(
      makeTransientRefreshFailure(
        () => new AxiosError("Network Error", AxiosError.ERR_NETWORK),
      ),
    );
  });

  it("keeps auth when the refresh endpoint answers with a 5xx", async () => {
    await expectAuthSurvives(
      makeTransientRefreshFailure((config) =>
        makeError(responseOf(503, config, {})),
      ),
    );
  });

  it("refreshes successfully again once the transient failure clears", async () => {
    let offline = true;
    const refreshCalls = [];
    install(client, {
      adapter: async (config) => {
        if (config.url.includes("/auth/refresh-token")) {
          refreshCalls.push(config);
          if (offline) {
            throw new AxiosError("Network Error", AxiosError.ERR_NETWORK);
          }
          return responseOf(200, config, { access_token: REFRESHED_TOKEN });
        }
        if (config.url.includes("/protected")) {
          const auth = getAuthHeader(config.headers);
          if (auth !== `Bearer ${REFRESHED_TOKEN}`) {
            throw makeError(responseOf(401, config, {}));
          }
          return responseOf(200, config, { ok: true });
        }
        throw makeError(responseOf(404, config, {}));
      },
    });
    client.setToken("existing-token");

    // The stale bearer still gets a 401, the refresh dies on the network, and
    // the caller sees the failure — but the session token is left in place.
    await expect(client.api.get("/protected")).rejects.toBeTruthy();
    expect(client.accessToken).toBe("existing-token");
    expect(refreshCalls.length).toBe(1);

    // Network back: the next 401 retries the refresh and completes normally.
    offline = false;
    const res = await client.api.get("/protected");

    expect(res.data).toEqual({ ok: true });
    expect(refreshCalls.length).toBe(2);
    expect(client.accessToken).toBe(REFRESHED_TOKEN);
  });

  it("still clears auth when the backend reports a dead session", async () => {
    install(client, makeScenario({ refreshFail: true }));
    client.setToken("existing-token");

    await expect(client.api.get("/protected")).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(client.accessToken).toBeNull();
  });

  it("clears auth state when clearAuth is invoked", async () => {
    client.setToken("initial-token");
    client.clearAuth();

    expect(client.accessToken).toBeNull();
    expect(client.isRefreshing).toBe(false);
  });
});
