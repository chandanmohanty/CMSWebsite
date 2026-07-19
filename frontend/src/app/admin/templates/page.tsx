"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/api";
import type { DesignTokens } from "@/lib/types";

interface TemplateCard {
  id: number;
  name: string;
  slug: string;
  industry: string;
  description: string | null;
  design_tokens: DesignTokens | null;
  layouts_count: number;
  websites_count: number;
}

interface WebsiteOption {
  id: number;
  name: string;
  template?: { id: number; name: string } | null;
}

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<TemplateCard[] | null>(null);
  const [websites, setWebsites] = useState<WebsiteOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [industry, setIndustry] = useState("all");

  // Activation dialog state
  const [activating, setActivating] = useState<TemplateCard | null>(null);
  const [targetWebsite, setTargetWebsite] = useState<string>(""); // website id or "new"
  const [newSiteName, setNewSiteName] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ website: string; websiteId: number; pages: { title: string; slug: string }[] } | null>(null);

  const load = useCallback(() => {
    Promise.all([
      adminFetch<{ data: TemplateCard[] }>("template-catalog?per_page=50"),
      adminFetch<{ data: WebsiteOption[] }>("websites?per_page=100"),
    ])
      .then(([tpl, sites]) => {
        setTemplates(tpl.data);
        setWebsites(sites.data);
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("cms_token")) {
      router.replace("/admin/login");
      return;
    }
    load();
  }, [router, load]);

  const openActivate = (template: TemplateCard) => {
    setActivating(template);
    setResult(null);
    setTargetWebsite(websites.length > 0 ? String(websites[0].id) : "new");
    setNewSiteName("");
    setError(null);
  };

  const activate = async () => {
    if (!activating || busy) return;
    setBusy(true);
    setError(null);
    try {
      let websiteId: number;
      let websiteName: string;

      if (targetWebsite === "new") {
        if (!newSiteName.trim()) return;
        const site = await adminFetch<{ id: number; name: string }>("websites", {
          method: "POST",
          body: JSON.stringify({ name: newSiteName.trim(), industry: activating.industry, template_id: activating.id }),
        });
        websiteId = site.id;
        websiteName = site.name;
      } else {
        websiteId = Number(targetWebsite);
        websiteName = websites.find((w) => w.id === websiteId)?.name ?? "website";
      }

      const res = await adminFetch<{ pages_created: { title: string; slug: string }[] }>(`websites/${websiteId}/apply-template`, {
        method: "POST",
        body: JSON.stringify({ template_id: activating.id }),
      });

      setResult({ website: websiteName, websiteId, pages: res.pages_created });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Activation failed");
    } finally {
      setBusy(false);
    }
  };

  const industries = useMemo(
    () => Array.from(new Set((templates ?? []).map((template) => template.industry))).sort(),
    [templates],
  );

  const visibleTemplates = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (templates ?? []).filter((template) => {
      const matchesIndustry = industry === "all" || template.industry === industry;
      const matchesTerm =
        !term ||
        template.name.toLowerCase().includes(term) ||
        template.industry.toLowerCase().includes(term) ||
        template.description?.toLowerCase().includes(term);
      return matchesIndustry && matchesTerm;
    });
  }, [templates, query, industry]);

  const swatches = (template: TemplateCard) =>
    Object.values(template.design_tokens?.colors ?? {})
      .filter((color): color is string => Boolean(color))
      .slice(0, 4);

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="flex h-12 items-center gap-4 border-b border-slate-200 bg-white px-4">
        <Link href="/admin" className="text-sm text-slate-500 hover:text-slate-900">
          ← Dashboard
        </Link>
        <span className="text-sm font-semibold">Templates</span>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">Design library</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Template gallery</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Launch with complete starter pages, tailored content, and a distinct visual system. Every section remains editable in the page builder.
            </p>
          </div>
          {templates && (
            <span className="w-fit rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-800">
              {templates.length} templates ready
            </span>
          )}
        </div>
        {error && !activating && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-7 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">Search templates</span>
            <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or industry…"
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>
          <label>
            <span className="sr-only">Filter by industry</span>
            <select
              value={industry}
              onChange={(event) => setIndustry(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm capitalize outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 sm:w-52"
            >
              <option value="all">All industries</option>
              {industries.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {templates === null && <p className="text-slate-500">Loading…</p>}
          {visibleTemplates.map((template) => {
            const primary = template.design_tokens?.colors?.primary ?? "#0e7490";
            const secondary = template.design_tokens?.colors?.secondary ?? "#0f172a";
            const accent = template.design_tokens?.colors?.accent ?? "#22d3ee";

            return (
            <article key={template.id} className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg">
              <div className="mb-4 overflow-hidden border border-slate-100" style={{ borderRadius: template.design_tokens?.radius ?? "0.75rem" }}>
                <div className="h-36 px-4 py-3 text-white" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
                  <div className="flex items-center justify-between border-b border-white/20 pb-2">
                    <span className="max-w-[70%] truncate text-[10px] font-bold uppercase tracking-[0.16em]">{template.name}</span>
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: accent }} />
                  </div>
                  <div className="flex h-[92px] items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="h-2 w-4/5 rounded-full bg-white/90" />
                      <div className="mt-2 h-2 w-3/5 rounded-full bg-white/55" />
                      <div className="mt-3 h-5 w-16 rounded-full" style={{ background: accent }} />
                    </div>
                    <div className="grid w-20 grid-cols-2 gap-2">
                      {[0, 1, 2, 3].map((item) => (
                        <span key={item} className="aspect-square rounded-md border border-white/15 bg-white/10 backdrop-blur" />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5">
                  {[0, 1, 2].map((item) => (
                    <span key={item} className="h-5 rounded-md border border-slate-200 bg-white" />
                  ))}
                </div>
              </div>

              <div className="flex items-start justify-between gap-2">
                <h2 className="font-bold tracking-tight" style={{ fontFamily: template.design_tokens?.typography?.heading }}>
                  {template.name}
                </h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-600">{template.industry}</span>
              </div>
              <p className="mt-1.5 flex-1 text-sm leading-5 text-slate-500">{template.description}</p>

              <div className="mt-4 flex items-center gap-2">
                {swatches(template).map((color) => (
                  <span key={color} className="h-4 w-4 rounded-full border border-slate-200" style={{ background: color }} title={color} />
                ))}
                <span className="ml-auto text-right text-xs leading-4 text-slate-400">
                  {template.layouts_count} page layouts · used by {template.websites_count} site{template.websites_count === 1 ? "" : "s"}
                </span>
              </div>

              <button
                onClick={() => openActivate(template)}
                className="mt-4 rounded-xl py-2.5 text-sm font-semibold text-white transition hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2"
                style={{ background: primary }}
              >
                Use this template
              </button>
            </article>
            );
          })}
          {templates !== null && visibleTemplates.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <p className="font-semibold text-slate-700">No templates match those filters.</p>
              <button onClick={() => { setQuery(""); setIndustry("all"); }} className="mt-2 text-sm font-semibold text-cyan-700 hover:text-cyan-900">
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Activation dialog */}
      {activating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => !busy && setActivating(null)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {result ? (
              <>
                <h2 className="text-lg font-bold">✅ {activating.name} is live on {result.website}</h2>
                <p className="mt-2 text-sm text-slate-500">These pages were created and published — open any of them in the builder to edit the content:</p>
                <ul className="mt-3 space-y-1 text-sm">
                  {result.pages.map((p) => (
                    <li key={p.slug} className="rounded bg-slate-50 px-3 py-1.5">
                      {p.title} <span className="text-slate-400">/{p.slug}</span>
                    </li>
                  ))}
                  {result.pages.length === 0 && <li className="text-slate-400">No new pages (all page types already existed) — the design was applied.</li>}
                </ul>
                <div className="mt-5 flex gap-2">
                  <Link href={`/admin/websites/${result.websiteId}/pages`} className="flex-1 rounded-lg bg-cyan-700 py-2 text-center text-sm font-semibold text-white hover:bg-cyan-800">
                    Open pages & builder
                  </Link>
                  <button onClick={() => setActivating(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
                    Done
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold">Activate “{activating.name}”</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Applies this template’s design and creates its {activating.layouts_count} pages with starter content. Existing pages, menus and content are never overwritten. Theme customizations reset to the template’s design.
                </p>

                <label className="mt-4 block">
                  <span className="mb-1 block text-xs font-semibold text-slate-600">Apply to website</span>
                  <select value={targetWebsite} onChange={(e) => setTargetWebsite(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    {websites.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                    <option value="new">+ Create a new website…</option>
                  </select>
                </label>

                {targetWebsite === "new" && (
                  <label className="mt-3 block">
                    <span className="mb-1 block text-xs font-semibold text-slate-600">New website name</span>
                    <input
                      value={newSiteName}
                      onChange={(e) => setNewSiteName(e.target.value)}
                      placeholder="e.g. Sharma & Associates"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none"
                    />
                  </label>
                )}

                {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

                <div className="mt-5 flex gap-2">
                  <button
                    onClick={() => void activate()}
                    disabled={busy || (targetWebsite === "new" && !newSiteName.trim())}
                    className="flex-1 rounded-lg bg-cyan-700 py-2 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-40"
                  >
                    {busy ? "Activating…" : "Activate template"}
                  </button>
                  <button onClick={() => setActivating(null)} disabled={busy} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
