"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FormBuilder } from "@/components/forms/FormBuilder";
import { realFormsApi } from "@/lib/form-api";

export default function FormsPage({ params }: { params: Promise<{ websiteId: string }> }) {
  const { websiteId } = use(params);
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const api = useMemo(() => realFormsApi(websiteId), [websiteId]);

  useEffect(() => {
    if (!localStorage.getItem("cms_token")) {
      router.replace("/admin/login");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) return null;

  return (
    <div className="flex h-screen flex-col bg-slate-100">
      <header className="flex h-12 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-4">
        <a href="/admin" className="text-sm text-slate-500 hover:text-slate-900">
          ← Dashboard
        </a>
        <a href={`/admin/websites/${websiteId}/pages`} className="text-sm text-slate-500 hover:text-slate-900">
          Pages
        </a>
        <a href={`/admin/websites/${websiteId}/menus`} className="text-sm text-slate-500 hover:text-slate-900">
          Menus
        </a>
        <a href={`/admin/websites/${websiteId}/theme`} className="text-sm text-slate-500 hover:text-slate-900">
          Theme
        </a>
        <span className="text-sm font-semibold">Forms</span>
      </header>
      <FormBuilder api={api} />
    </div>
  );
}
