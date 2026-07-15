import { adminFetch } from "./api";

export type FormFieldType = "text" | "email" | "phone" | "number" | "date" | "textarea" | "select" | "checkbox";

export interface FormField {
  name: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[]; // for select
  rules?: string[]; // Laravel validation rules, derived on save
}

export interface FormSchema {
  fields: FormField[];
  submit_label?: string;
  success_message?: string;
}

export interface FormRecord {
  id: number;
  name: string;
  slug: string;
  type: string; // contact | lead | appointment | inquiry | custom
  schema: FormSchema;
  notifications?: { emails?: string[] } | null;
  spam_protection: boolean;
  is_active: boolean;
  submissions_count?: number;
}

export interface SubmissionRecord {
  id: number;
  data: Record<string, unknown>;
  status: string;
  created_at: string;
}

export const FORM_TYPES = ["contact", "lead", "appointment", "inquiry", "custom"] as const;

export const FIELD_TYPE_META: Record<FormFieldType, { label: string; icon: string }> = {
  text: { label: "Text", icon: "🔤" },
  email: { label: "Email", icon: "✉️" },
  phone: { label: "Phone", icon: "📞" },
  number: { label: "Number", icon: "🔢" },
  date: { label: "Date", icon: "📅" },
  textarea: { label: "Paragraph", icon: "📝" },
  select: { label: "Dropdown", icon: "▾" },
  checkbox: { label: "Checkbox", icon: "☑️" },
};

/** Server-side Laravel validation rules derived from the field definition. */
export function deriveRules(field: FormField): string[] {
  switch (field.type) {
    case "email":
      return ["email", "max:255"];
    case "number":
      return ["numeric"];
    case "date":
      return ["date"];
    case "checkbox":
      return ["boolean"];
    case "select":
      // Options containing commas can't be expressed with in: - fall back to string.
      return field.options?.length && field.options.every((o) => !o.includes(","))
        ? [`in:${field.options.join(",")}`]
        : ["string", "max:255"];
    case "textarea":
      return ["string", "max:10000"];
    default:
      return ["string", "max:255"];
  }
}

/** Unique snake_case field name from a label. */
export function fieldNameFromLabel(label: string, taken: string[]): string {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "field";
  let name = base;
  let n = 2;
  while (taken.includes(name)) name = `${base}_${n++}`;
  return name;
}

export const DEFAULT_FIELDS: FormField[] = [
  { name: "name", label: "Your name", type: "text", required: true },
  { name: "email", label: "Email address", type: "email", required: true },
  { name: "message", label: "Message", type: "textarea", required: true },
];

export interface FormsApi {
  list(): Promise<FormRecord[]>;
  create(name: string, type: string): Promise<FormRecord>;
  update(id: number, patch: Partial<Pick<FormRecord, "name" | "schema" | "notifications" | "spam_protection" | "is_active">>): Promise<FormRecord>;
  remove(id: number): Promise<void>;
  submissions(formId: number, page: number): Promise<{ data: SubmissionRecord[]; hasMore: boolean }>;
}

interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
}

export function realFormsApi(websiteId: string): FormsApi {
  return {
    list: () => adminFetch<FormRecord[]>(`websites/${websiteId}/forms`),

    create: (name, type) =>
      adminFetch<FormRecord>(`websites/${websiteId}/forms`, {
        method: "POST",
        body: JSON.stringify({
          name,
          type,
          schema: { fields: DEFAULT_FIELDS.map((f) => ({ ...f, rules: deriveRules(f) })), submit_label: "Send", success_message: "Thank you! We received your submission." },
        }),
      }),

    update: (id, patch) => adminFetch<FormRecord>(`websites/${websiteId}/forms/${id}`, { method: "PUT", body: JSON.stringify(patch) }),

    remove: async (id) => {
      await adminFetch(`websites/${websiteId}/forms/${id}`, { method: "DELETE" });
    },

    submissions: async (formId, page) => {
      const res = await adminFetch<Paginated<SubmissionRecord>>(`websites/${websiteId}/forms/${formId}/submissions?per_page=25&page=${page}`);
      return { data: res.data, hasMore: res.current_page < res.last_page };
    },
  };
}
