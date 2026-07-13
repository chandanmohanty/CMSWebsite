import type { PagePayload, SitePayload } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// Which website this frontend instance renders. In production the deployment
// resolves by domain; in development we pin a site by slug.
const SITE_SLUG = process.env.NEXT_PUBLIC_SITE_SLUG ?? "";
const SITE_DOMAIN = process.env.NEXT_PUBLIC_SITE_DOMAIN ?? "";

function siteQuery(): string {
  return SITE_DOMAIN ? `domain=${encodeURIComponent(SITE_DOMAIN)}` : `site=${encodeURIComponent(SITE_SLUG)}`;
}

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}/api/${path}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    // Backend not running / unreachable - callers render a setup hint instead of crashing.
    return null;
  }
}

export function fetchSite(): Promise<SitePayload | null> {
  return getJson<SitePayload>(`public/site?${siteQuery()}`);
}

export function fetchPage(path: string, preview = false): Promise<PagePayload | null> {
  const previewParam = preview ? "&preview=1" : "";
  return getJson<PagePayload>(`public/page?${siteQuery()}&path=${encodeURIComponent(path)}${previewParam}`);
}

// ---- Admin client (browser-side, token auth) ----

export function adminApiUrl(path: string): string {
  return `${API_URL}/api/${path}`;
}

export async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("cms_token") : null;

  const res = await fetch(adminApiUrl(path), {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (res.status === 401 && typeof window !== "undefined") {
    localStorage.removeItem("cms_token");
    window.location.href = "/admin/login";
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? `Request failed (${res.status})`);
  }

  return (await res.json()) as T;
}
