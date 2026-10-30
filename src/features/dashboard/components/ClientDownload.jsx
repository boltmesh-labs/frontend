import { ButtonGroup } from "react-bootstrap";
import { useQuery } from "@tanstack/react-query";

import {
  ASSET_PATTERNS,
  LATEST_RELEASE_URL,
  RELEASES_URL,
  detectClientPlatform,
  pickAssetUrl,
} from "@/utils/clientDownload";

// Plain fetch, deliberately: the shared axios instance attaches the session's
// bearer token, which must never be sent to github.com.
const fetchLatestRelease = async () => {
  const response = await fetch(LATEST_RELEASE_URL, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!response.ok) {
    throw new Error(`Latest release lookup failed (${response.status}).`);
  }
  return response.json();
};

const AllReleasesLink = ({ label = "All releases" }) => (
  <a
    href={RELEASES_URL}
    target="_blank"
    rel="noopener noreferrer"
    className="text-primary text-decoration-none fw-medium"
  >
    {label}
  </a>
);

/**
 * Download entry point for the desktop client. The anchor always starts out
 * pointing at the releases page and is upgraded to the exact installer once
 * the lookup resolves, so a failed lookup (offline, or the 60 req/h
 * unauthenticated cap on the GitHub API) degrades to a working link instead of
 * a dead button.
 */
export const ClientDownload = () => {
  const platform = detectClientPlatform();
  const { data } = useQuery({
    queryKey: ["client-latest-release"],
    queryFn: fetchLatestRelease,
    // Only Windows and Linux have an installer to resolve; asking for the
    // release on any other platform would spend quota on an unused answer.
    enabled: platform === "windows" || platform === "linux",
    // One lookup per session: the GitHub API caps unauthenticated calls per
    // IP, not per visitor.
    staleTime: Infinity,
    retry: false,
  });

  const assetUrl = (pattern) => pickAssetUrl(data, pattern) ?? RELEASES_URL;

  if (platform === "windows") {
    return (
      <div className="d-flex flex-wrap align-items-center justify-content-end gap-3 small">
        {/* Real anchors, not Button as="a": react-bootstrap stamps
            role="button" on those, and these are downloads, not actions. */}
        <a
          href={assetUrl(ASSET_PATTERNS.windows)}
          className="btn btn-primary btn-sm fw-bold"
        >
          Download for Windows
        </a>
        <AllReleasesLink />
      </div>
    );
  }

  // A browser cannot tell deb from rpm, so both packages stay one click away.
  if (platform === "linux") {
    return (
      <div className="d-flex flex-wrap align-items-center justify-content-end gap-3 small">
        <ButtonGroup size="sm">
          <a
            href={assetUrl(ASSET_PATTERNS.linuxDeb)}
            className="btn btn-primary fw-bold"
          >
            Download .deb
          </a>
          <a
            href={assetUrl(ASSET_PATTERNS.linuxRpm)}
            className="btn btn-primary fw-bold"
          >
            Download .rpm
          </a>
        </ButtonGroup>
        <AllReleasesLink />
      </div>
    );
  }

  // macOS, iOS, Android and anything unrecognised: Android's build job is
  // commented out in the release workflow and macOS/iOS have none at all, so
  // there is no asset to link to yet.
  return (
    <div className="small text-end">
      <AllReleasesLink label="Download BoltMesh Client" />
    </div>
  );
};
