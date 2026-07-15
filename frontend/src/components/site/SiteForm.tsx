"use client";

import { useEffect, useState } from "react";
import { API_URL, siteQuery } from "@/lib/api";
import type { FormSchema } from "@/lib/form-api";
import { FormRenderer } from "@/components/forms/FormRenderer";

/**
 * Public-site form: fetches the form definition from the public API and
 * submits visitor entries. Used by the form_embed block.
 */
export function SiteForm({ slug }: { slug: string }) {
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/public/forms/${encodeURIComponent(slug)}?${siteQuery()}`, { headers: { Accept: "application/json" } })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((form: { schema: FormSchema }) => setSchema(form.schema))
      .catch(() => setFailed(true));
  }, [slug]);

  if (failed) {
    return <p className="rounded-lg border border-dashed border-[var(--color-border,#e2e8f0)] p-6 text-center text-sm text-[var(--color-muted,#64748b)]">Form “{slug}” is unavailable.</p>;
  }

  if (!schema) {
    return <p className="p-6 text-center text-sm text-[var(--color-muted,#64748b)]">Loading form…</p>;
  }

  return (
    <FormRenderer
      schema={schema}
      onSubmit={async (data, honeypot) => {
        const res = await fetch(`${API_URL}/api/public/forms/${encodeURIComponent(slug)}/submit?${siteQuery()}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ data, _hp: honeypot || undefined }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const errors = (body as { errors?: Record<string, string[]> }).errors;
          throw new Error(errors ? Object.values(errors).flat().join(" ") : ((body as { message?: string }).message ?? "Submission failed."));
        }
      }}
    />
  );
}
