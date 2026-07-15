"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeCustomizer, type ThemeApi } from "@/components/theme/ThemeCustomizer";
import { adminFetch } from "@/lib/api";
import type { ThemeSettings } from "@/lib/theme";
import type { DesignTokens } from "@/lib/types";

interface WebsiteResponse {
  template: { design_tokens: DesignTokens | null } | null;
  settings: { group: string; value: Record<string, unknown> }[];
}

export default function ThemePage({ params }: { params: Promise<{ websiteId: string }> }) {
  const { websiteId } = use(params);
  const router = useRouter();
  const [ready, setReady] = useState(false);

  const api = useMemo<ThemeApi>(
    () => ({
      async load() {
        const site = await adminFetch<WebsiteResponse>(`websites/${websiteId}`);
        return {
          theme: (site.settings.find((s) => s.group === "theme")?.value as ThemeSettings) ?? {},
          templateTokens: site.template?.design_tokens ?? null,
        };
      },
      async save(theme: ThemeSettings) {
        await adminFetch(`websites/${websiteId}/settings/theme`, {
          method: "PUT",
          body: JSON.stringify({ value: theme }),
        });
      },
    }),
    [websiteId]
  );

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
        <span className="text-sm font-semibold">Theme</span>
      </header>
      <ThemeCustomizer api={api} />
    </div>
  );
}
