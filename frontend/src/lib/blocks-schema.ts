/**
 * Block definitions for the page builder: what each block is called, which
 * editable fields it exposes, and the content a new instance starts with.
 *
 * The public renderer (src/components/blocks) and this schema must agree on
 * block_type names - adding a block means one entry here + one component there.
 */

export type FieldType = "text" | "textarea" | "url" | "image" | "select";

export interface FieldDef {
  /** Dot path into the section content, e.g. "cta.label". Prefix "settings." targets section settings. */
  path: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[]; // for select
  placeholder?: string;
}

export interface RepeaterDef {
  /** Path of the array inside content, e.g. "items". */
  path: string;
  label: string;
  itemLabel: string;
  /** Which item field to show as the row title in the collapsed list. */
  titleField: string;
  fields: { key: string; label: string; type: FieldType; placeholder?: string }[];
  newItem: Record<string, string>;
}

export interface BlockDef {
  type: string;
  label: string;
  icon: string; // emoji, purely decorative
  description: string;
  fields: FieldDef[];
  repeater?: RepeaterDef;
  defaultContent: Record<string, unknown>;
  defaultSettings?: Record<string, unknown>;
}

const ctaFields = (prefix = "cta"): FieldDef[] => [
  { path: `${prefix}.label`, label: "Button text", type: "text", placeholder: "Get started" },
  { path: `${prefix}.url`, label: "Button link", type: "url", placeholder: "/contact" },
];

export const BLOCK_DEFS: BlockDef[] = [
  {
    type: "hero",
    label: "Hero",
    icon: "🏞️",
    description: "Large banner with heading and call to action",
    fields: [
      { path: "heading", label: "Heading", type: "text" },
      { path: "subheading", label: "Subheading", type: "textarea" },
      { path: "image", label: "Background image", type: "image" },
      ...ctaFields(),
      {
        path: "settings.variant",
        label: "Style",
        type: "select",
        options: [
          { value: "centered", label: "Tall / centered" },
          { value: "compact", label: "Compact" },
        ],
      },
    ],
    defaultContent: { heading: "Your headline here", subheading: "Supporting message that explains your value.", cta: { label: "", url: "" } },
    defaultSettings: { variant: "centered" },
  },
  {
    type: "rich_text",
    label: "Rich text",
    icon: "📝",
    description: "Free-form text / HTML content",
    fields: [{ path: "html", label: "Content (HTML)", type: "textarea" }],
    defaultContent: { html: "<h2>Section title</h2><p>Write your content here…</p>" },
  },
  {
    type: "services_grid",
    label: "Services",
    icon: "🧩",
    description: "Grid of services or features",
    fields: [{ path: "heading", label: "Heading", type: "text" }],
    repeater: {
      path: "items",
      label: "Services",
      itemLabel: "service",
      titleField: "title",
      fields: [
        { key: "title", label: "Title", type: "text" },
        { key: "text", label: "Description", type: "textarea" },
      ],
      newItem: { title: "New service", text: "" },
    },
    defaultContent: { heading: "Our services", items: [{ title: "Service one", text: "Describe it briefly." }] },
  },
  {
    type: "team_grid",
    label: "Team",
    icon: "👥",
    description: "Team members with photos",
    fields: [{ path: "heading", label: "Heading", type: "text" }],
    repeater: {
      path: "items",
      label: "Members",
      itemLabel: "member",
      titleField: "name",
      fields: [
        { key: "name", label: "Name", type: "text" },
        { key: "role", label: "Role", type: "text" },
        { key: "image", label: "Photo URL", type: "image" },
      ],
      newItem: { name: "New member", role: "", image: "" },
    },
    defaultContent: { heading: "Meet the team", items: [] },
  },
  {
    type: "testimonials",
    label: "Testimonials",
    icon: "💬",
    description: "Customer quotes",
    fields: [{ path: "heading", label: "Heading", type: "text" }],
    repeater: {
      path: "items",
      label: "Quotes",
      itemLabel: "quote",
      titleField: "name",
      fields: [
        { key: "quote", label: "Quote", type: "textarea" },
        { key: "name", label: "Person", type: "text" },
      ],
      newItem: { quote: "", name: "" },
    },
    defaultContent: { heading: "What people say", items: [] },
  },
  {
    type: "faq",
    label: "FAQ",
    icon: "❓",
    description: "Expandable questions and answers",
    fields: [{ path: "heading", label: "Heading", type: "text" }],
    repeater: {
      path: "items",
      label: "Questions",
      itemLabel: "question",
      titleField: "question",
      fields: [
        { key: "question", label: "Question", type: "text" },
        { key: "answer", label: "Answer", type: "textarea" },
      ],
      newItem: { question: "New question?", answer: "" },
    },
    defaultContent: { heading: "Frequently asked questions", items: [] },
  },
  {
    type: "gallery",
    label: "Gallery",
    icon: "🖼️",
    description: "Image grid",
    fields: [{ path: "heading", label: "Heading", type: "text" }],
    repeater: {
      path: "items",
      label: "Images",
      itemLabel: "image",
      titleField: "caption",
      fields: [
        { key: "image", label: "Image URL", type: "image" },
        { key: "caption", label: "Caption", type: "text" },
      ],
      newItem: { image: "", caption: "" },
    },
    defaultContent: { heading: "", items: [] },
  },
  {
    type: "cta",
    label: "Call to action",
    icon: "📣",
    description: "Banner with a single action button",
    fields: [{ path: "heading", label: "Heading", type: "text" }, ...ctaFields()],
    defaultContent: { heading: "Ready to get started?", cta: { label: "Contact us", url: "/contact" } },
  },
  {
    type: "form_embed",
    label: "Form",
    icon: "📨",
    description: "Embed a form built in the form builder",
    fields: [
      { path: "heading", label: "Heading", type: "text" },
      { path: "form_slug", label: "Form slug", type: "text", placeholder: "contact" },
    ],
    defaultContent: { heading: "Get in touch", form_slug: "contact" },
  },
  {
    type: "custom_html",
    label: "Custom HTML",
    icon: "⚙️",
    description: "Raw HTML for advanced use",
    fields: [{ path: "html", label: "HTML", type: "textarea" }],
    defaultContent: { html: "" },
  },
];

export const blockDef = (type: string): BlockDef | undefined => BLOCK_DEFS.find((b) => b.type === type);

// ---- Small path helpers used by the inspector ----

export function getAtPath(obj: Record<string, unknown> | null | undefined, path: string): unknown {
  let current: unknown = obj ?? {};
  for (const key of path.split(".")) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

export function setAtPath(obj: Record<string, unknown> | null | undefined, path: string, value: unknown): Record<string, unknown> {
  const keys = path.split(".");
  const root: Record<string, unknown> = { ...(obj ?? {}) };
  let cursor = root;
  for (let i = 0; i < keys.length - 1; i++) {
    const next = cursor[keys[i]];
    cursor[keys[i]] = typeof next === "object" && next !== null ? { ...(next as Record<string, unknown>) } : {};
    cursor = cursor[keys[i]] as Record<string, unknown>;
  }
  cursor[keys[keys.length - 1]] = value;
  return root;
}
