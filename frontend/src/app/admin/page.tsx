"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/api";

interface Website {
  id: number;
  name: string;
  slug: string;
  domain: string | null;
  industry: string;
  status: string;
  pages_count: number;
  template: { name: string } | null;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [websites, setWebsites] = useState<Website[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!localStorage.getItem("cms_token")) {
      router.replace("/admin/login");
      return;
    }
    adminFetch<{ data: Website[] }>("websites")
      .then((res) => setWebsites(res.data))
      .catch((err) => setError(err.message));
  }, [router]);

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <h1 className="font-bold">CMS Admin</h1>
            <nav className="flex items-center gap-4 text-sm">
              <a href="/admin" className="font-medium text-slate-900">Websites</a>
              <a href="/admin/media" className="text-slate-500 hover:text-slate-900">Media library</a>
            </nav>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem("cms_token");
              router.push("/admin/login");
            }}
            className="text-sm text-slate-500 hover:text-slate-900"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <h2 className="text-2xl font-bold">Websites</h2>
        {error && <p className="mt-4 text-red-600">{error}</p>}
        {!websites && !error && <p className="mt-4 text-slate-500">Loading…</p>}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {websites?.map((site) => (
            <div key={site.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold">{site.name}</h3>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-600">{site.status}</span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {site.industry} · {site.pages_count} pages · {site.template?.name ?? "no template"}
              </p>
              {site.domain && <p className="mt-1 text-xs text-slate-400">{site.domain}</p>}
              <div className="mt-3 flex gap-2">
                <a href={`/admin/websites/${site.id}/pages`} className="rounded-lg bg-cyan-50 px-3 py-1.5 text-sm font-semibold text-cyan-700 hover:bg-cyan-100">
                  Pages →
                </a>
                <a href={`/admin/websites/${site.id}/menus`} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-200">
                  Menus →
                </a>
              </div>
            </div>
          ))}
          {websites?.length === 0 && <p className="text-slate-500">No websites yet — create one via the API or upcoming builder UI.</p>}
        </div>
      </div>
    </main>
  );
}
