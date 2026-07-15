"use client";

import { useMemo } from "react";
import { SecurityPanel } from "@/components/security/SecurityPanel";
import type { TwoFactorApi } from "@/lib/twofactor-api";

/**
 * 2FA settings playground with an in-memory mock API - works without the
 * Laravel backend. The confirmation code is 123456. Nothing is persisted.
 */
function createMockApi(): TwoFactorApi {
  let enabled = false;
  const delay = <T,>(value: T): Promise<T> => new Promise((r) => setTimeout(() => r(value), 350));

  return {
    status: () => delay(enabled),

    enable: () =>
      delay({
        secret: "JBSWY3DPEHPK3PXP",
        otpauth_url: "otpauth://totp/CMS%20Demo:demo@example.com?secret=JBSWY3DPEHPK3PXP&issuer=CMS%20Demo",
      }),

    async confirm(code) {
      await delay(undefined);
      if (code !== "123456") throw new Error("The code is invalid — in demo mode, use 123456.");
      enabled = true;
      return { recovery_codes: ["A1B2-C3D4", "E5F6-G7H8", "J1K2-L3M4", "N5P6-Q7R8", "S1T2-U3V4", "W5X6-Y7Z8", "B2C3-D4E5", "F6G7-H8J1"] };
    },

    async disable() {
      await delay(undefined);
      enabled = false;
    },
  };
}

export default function SecurityDemo() {
  const api = useMemo(createMockApi, []);

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="flex h-12 items-center gap-4 border-b border-slate-200 bg-white px-4">
        <a href="/admin" className="text-sm text-slate-500 hover:text-slate-900">
          ← Dashboard
        </a>
        <span className="text-xs text-slate-400">Demo mode — code is 123456, nothing is persisted</span>
      </header>
      <SecurityPanel api={api} />
    </div>
  );
}
