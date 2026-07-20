import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlockRenderer } from "@/components/blocks";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { FloatingActions } from "@/components/site/FloatingActions";
import { fetchPage, fetchSite } from "@/lib/api";
import { localizedHref, splitLocaleFromPath } from "@/lib/locales";
import { themeToCssVars, type ThemeSettings } from "@/lib/theme";

type Props = { params: Promise<{ slug?: string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const site = await fetchSite();
  if (!site) return {};

  const { locale, path } = splitLocaleFromPath(slug ?? [], site);
  const data = await fetchPage(path, false, locale);
  if (!data) return {};

  // hreflang alternates for every enabled language.
  const languages: Record<string, string> = { [site.website.default_locale]: localizedHref("", path, site.website.default_locale) };
  for (const loc of site.website.locales ?? []) {
    languages[loc] = localizedHref(loc, path, site.website.default_locale);
  }

  const seo = data.seo;
  return {
    title: seo?.meta_title ?? data.page.title,
    description: seo?.meta_description ?? undefined,
    keywords: seo?.keywords ?? undefined,
    alternates: {
      ...(seo?.canonical_url ? { canonical: seo.canonical_url } : {}),
      ...(Object.keys(languages).length > 1 ? { languages } : {}),
    },
    openGraph: seo?.open_graph ?? undefined,
    twitter: seo?.twitter_card ?? undefined,
    robots: seo?.robots ?? undefined,
  };
}

export default async function SitePage({ params }: Props) {
  const { slug } = await params;
  const site = await fetchSite();

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

  const { locale, path } = splitLocaleFromPath(slug ?? [], site);
  const data = await fetchPage(path, false, locale);
  if (!data) notFound();

  // Template design tokens + per-website theme customizer overrides.
  const cssVars = themeToCssVars(site.template?.design_tokens, site.settings.theme as ThemeSettings | undefined) as React.CSSProperties;

  return (
    <div style={cssVars} className="themed" lang={locale || site.website.default_locale}>
      {data.page.custom_css && (
        // Escape any closing style tag so admin CSS cannot break out into markup context.
        <style dangerouslySetInnerHTML={{ __html: data.page.custom_css.replace(/<\/style/gi, "<\\/style") }} />
      )}
      {data.seo?.schema_markup && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data.seo.schema_markup) }} />
      )}
      <Header site={site} currentLocale={locale} currentPath={path} />
      <main>
        <BlockRenderer sections={data.sections} />
      </main>
      <Footer site={site} />
      <FloatingActions site={site} />
    </div>
  );
}
