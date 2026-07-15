import { API_URL, siteQuery } from "@/lib/api";

/**
 * Serves /robots.txt on the site's own domain by proxying the CMS API
 * (admin-managed content from the `robots` settings group). Falls back to
 * a safe default so crawlers always get a valid response.
 */
export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const fallback = `User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${origin}/sitemap.xml\n`;

  try {
    const res = await fetch(`${API_URL}/api/public/robots?${siteQuery()}&base=${encodeURIComponent(origin)}`, {
      headers: { Accept: "text/plain" },
      next: { revalidate: 600 },
    });

    if (!res.ok) return new Response(fallback, { headers: { "Content-Type": "text/plain; charset=UTF-8" } });

    return new Response(await res.text(), {
      headers: { "Content-Type": "text/plain; charset=UTF-8" },
    });
  } catch {
    return new Response(fallback, { headers: { "Content-Type": "text/plain; charset=UTF-8" } });
  }
}
