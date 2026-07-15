"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/api";

interface PageRow {
  id: number;
  title: string;
  slug: string;
  page_type: string;
  status: string;
  updated_at: string;
}

const PAGE_TYPES = ["home", "about", "services", "products", "team", "portfolio", "testimonials", "blog", "contact", "landing", "custom"];

export default function PagesList({ params }: { params: Promise<{ websiteId: string }> }) {
  const { websiteId } = use(params);
  const router = useRouter();
  const [pages, setPages] = useState<PageRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [pageType, setPageType] = useState("custom");
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    adminFetch<{ data: PageRow[] }>(`websites/${websiteId}/pages?per_page=100`)
      .then((res) => setPages(res.data))
      .catch((e) => setError(e.message));
  }, [websiteId]);

  useEffect(() => {
    if (!localStorage.getItem("cms_token")) {
      router.replace("/admin/login");
      return;
    }
    load();
  }, [load, router]);

  async function createPage(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const page = await adminFetch<{ id: number }>(`websites/${websiteId}/pages`, {
        method: "POST",
        body: JSON.stringify({ title, page_type: pageType }),
      });
      router.push(`/admin/websites/${websiteId}/pages/${page.id}/builder`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create page");
      setCreating(false);
    }
  }

  async function deletePage(page: PageRow) {
    if (!window.confirm(`Delete “${page.title}”? This can be restored from the database trash only.`)) return;
    try {
      await adminFetch(`websites/${websiteId}/pages/${page.id}`, { method: "DELETE" });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  const badge = (status: string) =>
    status === "published" ? "bg-emerald-100 text-emerald-700" : status === "scheduled" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600";

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-6">
          <a href="/admin" className="text-sm text-slate-500 hover:text-slate-900">
            ← Websites
          </a>
          <h1 className="font-bold">Pages</h1>
          <a href={`/admin/websites/${websiteId}/menus`} className="text-sm text-slate-500 hover:text-slate-900">
            Menus
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <form onSubmit={createPage} className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="min-w-56 flex-1">
            <span className="mb-1 block text-xs font-semibold text-slate-600">New page title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. About us" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold text-slate-600">Type</span>
            <select value={pageType} onChange={(e) => setPageType(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm capitalize">
              {PAGE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <button disabled={creating || !title.trim()} className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-40">
            {creating ? "Creating…" : "+ Create & open builder"}
          </button>
        </form>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        {!pages && !error && <p className="text-slate-500">Loading…</p>}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {pages?.map((page) => (
            <div key={page.id} className="flex items-center gap-4 border-b border-slate-100 px-4 py-3 last:border-0 hover:bg-slate-50">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{page.title}</p>
                <p className="text-xs text-slate-400">
                  /{page.slug} · <span className="capitalize">{page.page_type}</span>
                </p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${badge(page.status)}`}>{page.status}</span>
              <a
                href={`/admin/websites/${websiteId}/pages/${page.id}/builder`}
                className="rounded-lg bg-cyan-50 px-3 py-1.5 text-sm font-semibold text-cyan-700 hover:bg-cyan-100"
              >
                Open builder
              </a>
              <button onClick={() => deletePage(page)} className="rounded-lg px-2 py-1.5 text-sm text-red-500 hover:bg-red-50" title="Delete page">
                🗑
              </button>
            </div>
          ))}
          {pages?.length === 0 && <p className="p-6 text-center text-sm text-slate-400">No pages yet — create your first one above.</p>}
        </div>
      </div>
    </main>
  );
}
