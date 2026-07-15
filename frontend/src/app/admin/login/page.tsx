"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminApiUrl } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Second step (accounts with 2FA enabled)
  const [challenge, setChallenge] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);

  async function post(path: string, body: Record<string, unknown>) {
    const res = await fetch(adminApiUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      const errors = (data as { errors?: Record<string, string[]> }).errors;
      throw new Error(errors ? Object.values(errors).flat()[0] : ((data as { message?: string }).message ?? "Request failed"));
    }
    return data;
  }

  async function submitCredentials(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const body = await post("auth/login", { email, password });
      if (body.two_factor) {
        setChallenge(body.challenge);
      } else {
        localStorage.setItem("cms_token", body.token);
        router.push("/admin");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const body = await post("auth/2fa/challenge", {
        challenge,
        ...(useRecovery ? { recovery_code: code.trim() } : { code: code.trim() }),
      });
      localStorage.setItem("cms_token", body.token);
      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      {challenge === null ? (
        <form onSubmit={submitCredentials} className="w-full max-w-sm rounded-xl bg-white p-8 shadow">
          <h1 className="text-xl font-bold">CMS Admin</h1>
          <label className="mt-6 block text-sm font-medium">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="mt-4 block text-sm font-medium">
            Password
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-lg bg-cyan-700 py-2 font-semibold text-white hover:bg-cyan-800 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      ) : (
        <form onSubmit={submitCode} className="w-full max-w-sm rounded-xl bg-white p-8 shadow">
          <h1 className="text-xl font-bold">Two-factor verification</h1>
          <p className="mt-2 text-sm text-slate-500">
            {useRecovery ? "Enter one of your recovery codes." : "Enter the 6-digit code from your authenticator app."}
          </p>
          <input
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode={useRecovery ? "text" : "numeric"}
            autoComplete="one-time-code"
            placeholder={useRecovery ? "XXXX-XXXX" : "123456"}
            className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-center font-mono text-lg tracking-widest"
          />
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="mt-4 w-full rounded-lg bg-cyan-700 py-2 font-semibold text-white hover:bg-cyan-800 disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Verify"}
          </button>
          <div className="mt-4 flex justify-between text-xs">
            <button
              type="button"
              onClick={() => {
                setUseRecovery(!useRecovery);
                setCode("");
                setError(null);
              }}
              className="text-cyan-700 hover:underline"
            >
              {useRecovery ? "Use authenticator code" : "Use a recovery code"}
            </button>
            <button
              type="button"
              onClick={() => {
                setChallenge(null);
                setCode("");
                setError(null);
              }}
              className="text-slate-400 hover:underline"
            >
              Back to login
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
