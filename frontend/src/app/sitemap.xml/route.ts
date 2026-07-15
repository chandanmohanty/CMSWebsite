import { API_URL, siteQuery } from "@/lib/api";

/**
 * Serves /sitemap.xml on the site's own domain by proxying the CMS API,
 * which builds the URL set from published pages and posts.
 */
export async function GET(request: Request) {
  const origin = new URL(request.url).origin;

  try {
    const res = await fetch(`${API_URL}/api/public/sitemap?${siteQuery()}&base=${encodeURIComponent(origin)}`, {
      headers: { Accept: "application/xml" },
      next: { revalidate: 600 },
    });

    if (!res.ok) return new Response("Sitemap unavailable", { status: 404 });

    return new Response(await res.text(), {
      headers: { "Content-Type": "application/xml; charset=UTF-8" },
    });
  } catch {
    return new Response("Sitemap unavailable", { status: 404 });
  }
}
