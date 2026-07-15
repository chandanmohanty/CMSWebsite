"use client";

import { useState } from "react";
import type { FormSchema } from "@/lib/form-api";

interface Props {
  schema: FormSchema;
  /** Perform the actual submission. Throw to show an error message. */
  onSubmit: (data: Record<string, unknown>, honeypot: string) => Promise<void>;
  /** Preview mode disables real submission side effects but keeps the UX. */
  disabled?: boolean;
}

const inputClass =
  "w-full rounded-lg border border-[var(--color-border,#cbd5e1)] bg-[var(--color-surface,#ffffff)] px-3 py-2 text-sm focus:border-[var(--color-primary,#0e7490)] focus:outline-none";

/**
 * Renders a form from its stored schema - shared by the public website
 * (form_embed block), the admin builder's live preview, and the demo.
 */
export function FormRenderer({ schema, onSubmit, disabled = false }: Props) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [honeypot, setHoneypot] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const set = (name: string, value: unknown) => setValues((v) => ({ ...v, [name]: value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (disabled || state === "submitting") return;
    setState("submitting");
    setError(null);
    try {
      await onSubmit(values, honeypot);
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong — please try again.");
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-xl border border-[var(--color-border,#e2e8f0)] bg-[var(--color-surface,#ffffff)] p-8 text-center">
        <p className="text-2xl">✅</p>
        <p className="mt-2 font-semibold">{schema.success_message ?? "Thank you! We received your submission."}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate={false}>
      {schema.fields.map((field) => {
        const label = (
          <span className="mb-1 block text-sm font-medium">
            {field.label}
            {field.required && <span className="text-red-500"> *</span>}
          </span>
        );

        if (field.type === "checkbox") {
          return (
            <label key={field.name} className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" required={field.required} checked={Boolean(values[field.name])} onChange={(e) => set(field.name, e.target.checked)} />
              {field.label}
              {field.required && <span className="text-red-500">*</span>}
            </label>
          );
        }

        if (field.type === "textarea") {
          return (
            <label key={field.name} className="block">
              {label}
              <textarea
                rows={5}
                required={field.required}
                placeholder={field.placeholder}
                value={(values[field.name] as string) ?? ""}
                onChange={(e) => set(field.name, e.target.value)}
                className={inputClass}
              />
            </label>
          );
        }

        if (field.type === "select") {
          return (
            <label key={field.name} className="block">
              {label}
              <select required={field.required} value={(values[field.name] as string) ?? ""} onChange={(e) => set(field.name, e.target.value)} className={inputClass}>
                <option value="" disabled>
                  {field.placeholder || "Choose…"}
                </option>
                {(field.options ?? []).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
          );
        }

        const htmlType = field.type === "phone" ? "tel" : field.type;
        return (
          <label key={field.name} className="block">
            {label}
            <input
              type={htmlType}
              required={field.required}
              placeholder={field.placeholder}
              value={(values[field.name] as string) ?? ""}
              onChange={(e) => set(field.name, e.target.value)}
              className={inputClass}
            />
          </label>
        );
      })}

      {/* Honeypot: invisible to humans, bots fill it and get silently dropped. */}
      <input
        type="text"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
        name="_hp"
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={state === "submitting"}
        className="btn rounded-lg bg-[var(--color-primary,#0e7490)] px-6 py-2.5 font-semibold text-white hover:opacity-90 disabled:opacity-50"
      >
        {state === "submitting" ? "Sending…" : (schema.submit_label ?? "Send")}
      </button>
    </form>
  );
}
