"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SecurityPanel } from "@/components/security/SecurityPanel";
import { realTwoFactorApi } from "@/lib/twofactor-api";

export default function SecurityPage() {
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
    <div className="min-h-screen bg-slate-100">
      <header className="flex h-12 items-center gap-4 border-b border-slate-200 bg-white px-4">
        <a href="/admin" className="text-sm text-slate-500 hover:text-slate-900">
          ← Dashboard
        </a>
        <span className="text-sm font-semibold">Security</span>
      </header>
      <SecurityPanel api={realTwoFactorApi} />
    </div>
  );
}
