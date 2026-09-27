import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AuthContext, useAuth } from "./AuthContext";

const Probe = () => {
  const auth = useAuth();
  return <div>role: {auth?.user?.role ?? "none"}</div>;
};

describe("useAuth", () => {
  it("exposes the context value inside a provider", () => {
    render(
      <AuthContext value={{ user: { role: "admin" } }}>
        <Probe />
      </AuthContext>,
    );
    expect(screen.getByText("role: admin")).toBeInTheDocument();
  });

  it("throws a helpful error outside of an AuthProvider", () => {
    expect(() => render(<Probe />)).toThrow(
      "useAuth must be used within an AuthProvider",
    );
  });
});
