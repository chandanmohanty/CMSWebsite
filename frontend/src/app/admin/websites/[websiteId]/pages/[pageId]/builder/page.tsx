"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/api";
import { PageBuilder, newUid, type BuilderSection } from "@/components/builder/PageBuilder";

interface ApiSection {
  id: number;
  block_type: string;
  content: Record<string, unknown> | null;
  settings: Record<string, unknown> | null;
  is_visible: boolean;
  global_block_id: number | null;
}

interface ApiPage {
  id: number;
  title: string;
  status: string;
  sections: ApiSection[];
}

export default function BuilderPage({ params }: { params: Promise<{ websiteId: string; pageId: string }> }) {
  const { websiteId, pageId } = use(params);
  const router = useRouter();
  const [page, setPage] = useState<ApiPage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!localStorage.getItem("cms_token")) {
      router.replace("/admin/login");
      return;
    }
    adminFetch<ApiPage>(`websites/${websiteId}/pages/${pageId}`)
      .then(setPage)
      .catch((e) => setError(e.message));
  }, [websiteId, pageId, router]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-red-600">{error}</p>
      </main>
    );
  }

  if (!page) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-slate-500">Loading builder…</p>
      </main>
    );
  }

  const initialSections: BuilderSection[] = page.sections.map((s) => ({
    uid: newUid(),
    block_type: s.block_type,
    content: s.content,
    settings: s.settings,
    is_visible: s.is_visible,
    global_block_id: s.global_block_id,
  }));

  return (
    <PageBuilder
      pageTitle={page.title}
      pageStatus={page.status}
      initialSections={initialSections}
      backHref={`/admin/websites/${websiteId}/pages`}
      onSave={async (sections) => {
        await adminFetch(`websites/${websiteId}/pages/${pageId}/sections`, {
          method: "PUT",
          body: JSON.stringify({
            sections: sections.map((s) => ({
              block_type: s.block_type,
              content: s.content,
              settings: s.settings,
              is_visible: s.is_visible,
              global_block_id: s.global_block_id ?? null,
            })),
          }),
        });
      }}
      onPublish={async () => {
        await adminFetch(`websites/${websiteId}/pages/${pageId}/publish`, { method: "POST" });
        setPage((p) => (p ? { ...p, status: "published" } : p));
      }}
    />
  );
}
