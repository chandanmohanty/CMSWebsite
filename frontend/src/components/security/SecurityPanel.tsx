"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { TwoFactorApi } from "@/lib/twofactor-api";

type Stage = "loading" | "disabled" | "enrolling" | "recovery" | "enabled";

const inputClass = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none";

export function SecurityPanel({ api }: { api: TwoFactorApi }) {
  const [stage, setStage] = useState<Stage>("loading");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // enrollment state
  const [secret, setSecret] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  // disable state
  const [password, setPassword] = useState("");

  useEffect(() => {
    api
      .status()
      .then((enabled) => setStage(enabled ? "enabled" : "disabled"))
      .catch((e) => setError(e.message));
  }, [api]);

  const startEnrollment = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.enable();
      setSecret(res.secret);
      setQrDataUrl(await QRCode.toDataURL(res.otpauth_url, { width: 200, margin: 1 }));
      setStage("enrolling");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start setup");
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.confirm(code.trim());
      setRecoveryCodes(res.recovery_codes);
      setCode("");
      setStage("recovery");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid code");
    } finally {
      setBusy(false);
    }
  };

  const disable = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.disable(password);
      setPassword("");
      setStage("disabled");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not disable");
    } finally {
      setBusy(false);
    }
  };

  const copyRecoveryCodes = () => {
    void navigator.clipboard.writeText(recoveryCodes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto max-w-xl p-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-bold">Two-factor authentication</h1>
        <p className="mt-1 text-sm text-slate-500">
          Protect your account with a one-time code from an authenticator app (Google Authenticator, 1Password, Authy…).
        </p>

        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        {stage === "loading" && <p className="mt-6 text-sm text-slate-400">Loading…</p>}

        {stage === "disabled" && (
          <div className="mt-6">
            <p className="text-sm">
              Status: <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">Not enabled</span>
            </p>
            <button
              onClick={() => void startEnrollment()}
              disabled={busy}
              className="mt-4 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-40"
            >
              {busy ? "Preparing…" : "Enable two-factor authentication"}
            </button>
          </div>
        )}

        {stage === "enrolling" && (
          <form onSubmit={confirm} className="mt-6 space-y-4">
            <div className="rounded-lg bg-slate-50 p-4 text-center">
              <p className="mb-3 text-sm font-medium">1. Scan this QR code with your authenticator app</p>
              {qrDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUrl} alt="TOTP QR code" className="mx-auto rounded-lg border border-slate-200 bg-white p-2" data-testid="totp-qr" />
              )}
              <p className="mt-3 text-xs text-slate-500">
                Or enter the key manually: <code className="rounded bg-white px-1.5 py-0.5 font-mono">{secret}</code>
              </p>
            </div>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">2. Enter the 6-digit code from the app</span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                className={`${inputClass} text-center font-mono text-lg tracking-widest`}
              />
            </label>
            <button
              disabled={busy || code.trim().length < 6}
              className="w-full rounded-lg bg-cyan-700 py-2 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-40"
            >
              {busy ? "Verifying…" : "Confirm & activate"}
            </button>
          </form>
        )}

        {stage === "recovery" && (
          <div className="mt-6">
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">✅ Two-factor authentication is now active.</p>
            <p className="mt-4 text-sm font-medium">Save these recovery codes somewhere safe — each works once if you lose your device. They will not be shown again.</p>
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-4 font-mono text-sm" data-testid="recovery-codes">
              {recoveryCodes.map((rc) => (
                <span key={rc}>{rc}</span>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={copyRecoveryCodes} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50">
                {copied ? "Copied ✓" : "Copy codes"}
              </button>
              <button onClick={() => setStage("enabled")} className="rounded-lg bg-cyan-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-cyan-800">
                I saved them — done
              </button>
            </div>
          </div>
        )}

        {stage === "enabled" && (
          <div className="mt-6">
            <p className="text-sm">
              Status: <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Enabled</span>
            </p>
            <form onSubmit={disable} className="mt-6 space-y-3 rounded-lg border border-red-100 bg-red-50/50 p-4">
              <p className="text-sm font-medium text-red-800">Disable two-factor authentication</p>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-600">Confirm your password</span>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
              </label>
              <button disabled={busy || !password} className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-40">
                {busy ? "Disabling…" : "Disable 2FA"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
