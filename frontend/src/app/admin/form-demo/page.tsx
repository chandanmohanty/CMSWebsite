"use client";

import { useMemo } from "react";
import { FormBuilder } from "@/components/forms/FormBuilder";
import { DEFAULT_FIELDS, deriveRules, type FormRecord, type FormsApi, type SubmissionRecord } from "@/lib/form-api";

/**
 * Form builder playground with an in-memory mock API - works without the
 * Laravel backend. Nothing is persisted.
 */
function createMockApi(): FormsApi {
  let nextId = 10;

  const forms: FormRecord[] = [
    {
      id: 1,
      name: "Contact form",
      slug: "contact",
      type: "contact",
      schema: {
        fields: [
          ...DEFAULT_FIELDS.map((f) => ({ ...f, rules: deriveRules(f) })),
          { name: "topic", label: "Topic", type: "select" as const, options: ["Sales", "Support", "Other"], rules: ["in:Sales,Support,Other"] },
        ],
        submit_label: "Send message",
        success_message: "Thanks! We'll get back to you within one business day.",
      },
      notifications: { emails: ["team@example.com"] },
      spam_protection: true,
      is_active: true,
      submissions_count: 2,
    },
  ];

  const submissions: Record<number, SubmissionRecord[]> = {
    1: [
      { id: 101, data: { name: "Priya S.", email: "priya@example.com", message: "Do you take weekend appointments?", topic: "Support" }, status: "new", created_at: "2026-07-14T10:30:00Z" },
      { id: 100, data: { name: "Rahul M.", email: "rahul@example.com", message: "Please send a quote.", topic: "Sales" }, status: "read", created_at: "2026-07-13T15:12:00Z" },
    ],
  };

  const delay = <T,>(value: T): Promise<T> => new Promise((r) => setTimeout(() => r(value), 250));

  return {
    list: () => delay(structuredClone(forms)),

    async create(name, type) {
      const form: FormRecord = {
        id: nextId++,
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        type,
        schema: { fields: DEFAULT_FIELDS.map((f) => ({ ...f, rules: deriveRules(f) })), submit_label: "Send", success_message: "Thank you!" },
        spam_protection: true,
        is_active: true,
        submissions_count: 0,
      };
      forms.push(form);
      return delay(structuredClone(form));
    },

    async update(id, patch) {
      const form = forms.find((f) => f.id === id);
      if (!form) throw new Error("Form not found");
      Object.assign(form, patch);
      return delay(structuredClone(form));
    },

    async remove(id) {
      const i = forms.findIndex((f) => f.id === id);
      if (i !== -1) forms.splice(i, 1);
      await delay(undefined);
    },

    submissions: (formId) => delay({ data: structuredClone(submissions[formId] ?? []), hasMore: false }),
  };
}

export default function FormDemo() {
  const api = useMemo(createMockApi, []);

  return (
    <div className="flex h-screen flex-col bg-slate-100">
      <header className="flex h-12 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-4">
        <a href="/admin" className="text-sm text-slate-500 hover:text-slate-900">
          ← Dashboard
        </a>
        <span className="text-xs text-slate-400">Demo mode — nothing is persisted</span>
      </header>
      <FormBuilder api={api} title="Forms (demo)" />
    </div>
  );
}
