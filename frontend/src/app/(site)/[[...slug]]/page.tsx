import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlockRenderer } from "@/components/blocks";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { fetchPage, fetchSite } from "@/lib/api";

type Props = { params: Promise<{ slug?: string[] }> };

function pathFrom(slug?: string[]): string {
  return (slug ?? []).join("/");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchPage(pathFrom(slug));
  if (!data) return {};

  const seo = data.seo;
  return {
    title: seo?.meta_title ?? data.page.title,
    description: seo?.meta_description ?? undefined,
    keywords: seo?.keywords ?? undefined,
    alternates: seo?.canonical_url ? { canonical: seo.canonical_url } : undefined,
    openGraph: seo?.open_graph ?? undefined,
    twitter: seo?.twitter_card ?? undefined,
    robots: seo?.robots ?? undefined,
  };
}

export default async function SitePage({ params }: Props) {
  const { slug } = await params;
  const [site, data] = await Promise.all([fetchSite(), fetchPage(pathFrom(slug))]);

  // Friendly setup screen while the Laravel API isn't reachable yet.
  if (!site) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-8">
        <div className="max-w-lg rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold">CMS frontend is running</h1>
          <p className="mt-3 text-slate-600">
            The Laravel API at <code className="rounded bg-slate-100 px-1">{process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}</code> is
            not reachable, or no website matches <code className="rounded bg-slate-100 px-1">NEXT_PUBLIC_SITE_SLUG</code>.
          </p>
          <p className="mt-3 text-sm text-slate-500">
            Start the backend (<code>php artisan serve</code>), run migrations and the seeder, create a website in the admin, then set its slug
            in <code>frontend/.env.local</code>.
          </p>
        </div>
      </main>
    );
  }

  if (!data) notFound();

  const tokens = site.template?.design_tokens ?? {};
  const cssVars = {
    "--color-primary": tokens.colors?.primary ?? "#0e7490",
    "--color-secondary": tokens.colors?.secondary ?? "#0f172a",
    "--color-accent": tokens.colors?.accent ?? "#22d3ee",
  } as React.CSSProperties;

  return (
    <div style={cssVars}>
      {data.page.custom_css && (
        // Escape any closing style tag so admin CSS cannot break out into markup context.
        <style dangerouslySetInnerHTML={{ __html: data.page.custom_css.replace(/<\/style/gi, "<\\/style") }} />
      )}
      {data.seo?.schema_markup && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data.seo.schema_markup) }} />
      )}
      <Header site={site} />
      <main>
        <BlockRenderer sections={data.sections} />
      </main>
      <Footer site={site} />
    </div>
  );
}
