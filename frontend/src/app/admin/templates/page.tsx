"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/api";

interface TemplateCard {
  id: number;
  name: string;
  slug: string;
  industry: string;
  description: string | null;
  design_tokens: { colors?: Record<string, string> } | null;
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
  const [ready, setReady] = useState(false);
  const [templates, setTemplates] = useState<TemplateCard[] | null>(null);
  const [websites, setWebsites] = useState<WebsiteOption[]>([]);
  const [error, setError] = useState<string | null>(null);

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
    setReady(true);
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

  if (!ready) return null;

  const swatches = (t: TemplateCard) => Object.values(t.design_tokens?.colors ?? {}).slice(0, 4);

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="flex h-12 items-center gap-4 border-b border-slate-200 bg-white px-4">
        <a href="/admin" className="text-sm text-slate-500 hover:text-slate-900">
          ← Dashboard
        </a>
        <span className="text-sm font-semibold">Templates</span>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="text-2xl font-bold">Template gallery</h1>
        <p className="mt-1 text-sm text-slate-500">
          Activating a template applies its design to a website and creates its pages with starter content — everything stays editable in the page builder.
        </p>
        {error && !activating && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {templates === null && <p className="text-slate-500">Loading…</p>}
          {templates?.map((template) => (
            <div key={template.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              {/* mini design preview from the template's tokens */}
              <div className="mb-4 overflow-hidden rounded-lg border border-slate-100">
                <div className="flex h-16 items-center justify-center px-4" style={{ background: template.design_tokens?.colors?.primary ?? "#0e7490" }}>
                  <span className="truncate font-serif text-sm font-bold text-white">{template.name}</span>
                </div>
                <div className="flex gap-2 p-2" style={{ background: "#f8fafc" }}>
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="h-6 flex-1 rounded" style={{ background: "#e2e8f0" }} />
                  ))}
                  <span className="h-6 w-16 rounded" style={{ background: template.design_tokens?.colors?.accent ?? "#22d3ee" }} />
                </div>
              </div>

              <div className="flex items-start justify-between gap-2">
                <h2 className="font-bold">{template.name}</h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-600">{template.industry}</span>
              </div>
              <p className="mt-1 flex-1 text-sm text-slate-500">{template.description}</p>

              <div className="mt-3 flex items-center gap-2">
                {swatches(template).map((color) => (
                  <span key={color} className="h-4 w-4 rounded-full border border-slate-200" style={{ background: color }} title={color} />
                ))}
                <span className="ml-auto text-xs text-slate-400">
                  {template.layouts_count} page layouts · used by {template.websites_count} site{template.websites_count === 1 ? "" : "s"}
                </span>
              </div>

              <button
                onClick={() => openActivate(template)}
                className="mt-4 rounded-lg bg-cyan-700 py-2 text-sm font-semibold text-white hover:bg-cyan-800"
              >
                Activate…
              </button>
            </div>
          ))}
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
                  <a href={`/admin/websites/${result.websiteId}/pages`} className="flex-1 rounded-lg bg-cyan-700 py-2 text-center text-sm font-semibold text-white hover:bg-cyan-800">
                    Open pages & builder
                  </a>
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
