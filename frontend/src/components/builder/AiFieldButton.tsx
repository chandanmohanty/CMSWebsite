"use client";

import { useState } from "react";
import type { AiTextApi } from "@/lib/ai-api";

interface Props {
  api: AiTextApi;
  /** Current field value - used as input for rewrite/grammar. */
  value: string;
  fieldLabel: string;
  blockLabel: string;
  onResult: (text: string) => void;
}

/**
 * The ✨ button next to builder text fields: generate from a brief, rewrite,
 * or fix grammar. Results replace the field value (the builder's undo
 * history covers reverting).
 */
export function AiFieldButton({ api, value, fieldLabel, blockLabel, onResult }: Props) {
  const [open, setOpen] = useState(false);
  const [prompting, setPrompting] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setOpen(false);
    setPrompting(false);
    setError(null);
  };

  const run = async (task: string, input: string) => {
    setLoading(task);
    setError(null);
    try {
      const text = await api.generateText(task, input, { field: fieldLabel, block: blockLabel });
      onResult(text.trim());
      close();
      setPrompt("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setLoading(null);
    }
  };

  const generate = () => {
    const brief = prompt.trim();
    if (!brief) return;
    void run(
      "seo_copy",
      `Write the "${fieldLabel}" text for the "${blockLabel}" section of a website.\nBrief: ${brief}\nRespond with only the final text - no explanations, no quotes.`
    );
  };

  const menuItem = "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-cyan-50 disabled:opacity-40 disabled:hover:bg-transparent";

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        className={`rounded px-1.5 py-0.5 text-xs font-medium ${open ? "bg-cyan-100 text-cyan-800" : "text-cyan-700 hover:bg-cyan-50"}`}
        title="AI assist"
      >
        ✨ AI
      </button>

      {open && (
        <>
          {/* click-away backdrop */}
          <span className="fixed inset-0 z-30" onClick={close} aria-hidden />
          <span className="absolute right-0 top-6 z-40 block w-64 rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl">
            {loading ? (
              <span className="block px-2 py-3 text-center text-sm text-cyan-700">✨ Generating…</span>
            ) : prompting ? (
              <span className="block space-y-2 p-1">
                <textarea
                  autoFocus
                  rows={3}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={`Describe what this ${fieldLabel.toLowerCase()} should say…`}
                  className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-cyan-500 focus:outline-none"
                />
                <span className="flex gap-1.5">
                  <button type="button" onClick={generate} disabled={!prompt.trim()} className="flex-1 rounded-lg bg-cyan-700 py-1.5 text-xs font-semibold text-white hover:bg-cyan-800 disabled:opacity-40">
                    Generate
                  </button>
                  <button type="button" onClick={() => setPrompting(false)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs">
                    Back
                  </button>
                </span>
              </span>
            ) : (
              <>
                <button type="button" onClick={() => setPrompting(true)} className={menuItem}>
                  ✍️ Write with AI…
                </button>
                <button type="button" onClick={() => void run("rewrite", value)} disabled={!value.trim()} className={menuItem}>
                  🔁 Rewrite
                </button>
                <button type="button" onClick={() => void run("improve_grammar", value)} disabled={!value.trim()} className={menuItem}>
                  ✅ Fix grammar
                </button>
              </>
            )}
            {error && <span className="block px-2 py-1 text-xs text-red-600">{error}</span>}
          </span>
        </>
      )}
    </span>
  );
}
