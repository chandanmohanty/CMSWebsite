"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MediaLibrary } from "@/components/media/MediaLibrary";
import { realMediaApi } from "@/lib/media-api";

export default function MediaPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

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
      </header>
      <MediaLibrary api={realMediaApi} />
    </div>
  );
}
