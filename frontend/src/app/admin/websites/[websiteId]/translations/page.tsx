"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TranslationsEditor } from "@/components/translations/TranslationsEditor";
import { realTranslationsApi } from "@/lib/translations-api";

export default function TranslationsPage({ params }: { params: Promise<{ websiteId: string }> }) {
  const { websiteId } = use(params);
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const api = useMemo(() => realTranslationsApi(websiteId), [websiteId]);

  useEffect(() => {
    if (!localStorage.getItem("cms_token")) {
      router.replace("/admin/login");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="flex h-12 items-center gap-4 border-b border-slate-200 bg-white px-4">
        <a href="/admin" className="text-sm text-slate-500 hover:text-slate-900">
          ← Dashboard
        </a>
        <a href={`/admin/websites/${websiteId}/pages`} className="text-sm text-slate-500 hover:text-slate-900">
          Pages
        </a>
        <span className="text-sm font-semibold">Translations</span>
      </header>
      <TranslationsEditor api={api} />
    </div>
  );
}
