"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DndContext, DragEndEvent, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  FIELD_TYPE_META,
  FORM_TYPES,
  deriveRules,
  fieldNameFromLabel,
  type FormField,
  type FormFieldType,
  type FormRecord,
  type FormsApi,
  type SubmissionRecord,
} from "@/lib/form-api";
import { FormRenderer } from "./FormRenderer";

interface EditorField extends FormField {
  uid: string;
}

let uidCounter = 0;
const newUid = () => `f${Date.now().toString(36)}_${uidCounter++}`;

const inputClass = "w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-cyan-500 focus:outline-none";

// ---------- Sortable field row ----------

function FieldRow({
  field,
  expanded,
  onToggle,
  onChange,
  onRemove,
}: {
  field: EditorField;
  expanded: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<EditorField>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.uid });
  const meta = FIELD_TYPE_META[field.type];

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-lg border bg-white shadow-sm ${isDragging ? "z-10 opacity-50" : ""} ${expanded ? "border-cyan-300" : "border-slate-200"}`}
    >
      <div className="flex items-center gap-1 px-2 py-1.5">
        <span {...attributes} {...listeners} className="cursor-grab rounded px-1.5 py-1 text-slate-400 hover:bg-slate-100 active:cursor-grabbing" title="Drag to reorder">
          ⋮⋮
        </span>
        <button onClick={onToggle} className="min-w-0 flex-1 truncate px-1 text-left text-sm font-medium hover:text-cyan-700">
          {field.label || <span className="italic text-slate-400">Untitled field</span>}
          {field.required && <span className="text-red-500"> *</span>}
          <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-normal text-slate-500">
            {meta.icon} {meta.label}
          </span>
        </button>
        <button onClick={onToggle} className="rounded px-1.5 text-sm text-slate-400 hover:bg-slate-100" title={expanded ? "Collapse" : "Edit field"}>
          {expanded ? "▴" : "✎"}
        </button>
        <button onClick={onRemove} className="rounded px-1.5 text-sm text-red-400 hover:bg-red-50" title="Remove field">
          ✕
        </button>
      </div>

      {expanded && (
        <div className="grid gap-3 border-t border-slate-100 p-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Label</span>
            <input className={inputClass} value={field.label} onChange={(e) => onChange({ label: e.target.value })} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Placeholder</span>
            <input className={inputClass} value={field.placeholder ?? ""} onChange={(e) => onChange({ placeholder: e.target.value })} />
          </label>
          {field.type === "select" && (
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-semibold text-slate-600">Options (one per line)</span>
              <textarea
                rows={3}
                className={inputClass}
                value={(field.options ?? []).join("\n")}
                onChange={(e) => onChange({ options: e.target.value.split("\n").map((o) => o.trim()).filter(Boolean) })}
              />
            </label>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={field.required ?? false} onChange={(e) => onChange({ required: e.target.checked })} />
            Required
          </label>
          <p className="self-center text-xs text-slate-400">
            Field key: <code className="rounded bg-slate-100 px-1">{field.name}</code>
          </p>
        </div>
      )}
    </div>
  );
}

// ---------- Builder ----------

export function FormBuilder({ api, title = "Forms" }: { api: FormsApi; title?: string }) {
  const [forms, setForms] = useState<FormRecord[] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tab, setTab] = useState<"builder" | "submissions">("builder");

  // Editor state for the selected form
  const [fields, setFields] = useState<EditorField[]>([]);
  const [submitLabel, setSubmitLabel] = useState("Send");
  const [successMessage, setSuccessMessage] = useState("");
  const [notifyEmails, setNotifyEmails] = useState("");
  const [spamProtection, setSpamProtection] = useState(true);
  const [expandedUid, setExpandedUid] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // Submissions state
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [subsPage, setSubsPage] = useState(1);
  const [subsHasMore, setSubsHasMore] = useState(false);
  const [subsLoading, setSubsLoading] = useState(false);

  // Create-form state
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<string>("contact");

  useEffect(() => {
    api
      .list()
      .then((list) => {
        setForms(list);
        if (list.length > 0) loadForm(list[0], true);
      })
      .catch((e) => setStatusMsg({ kind: "err", text: e.message }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const loadForm = (form: FormRecord, force = false) => {
    if (!force && dirty && !window.confirm("Discard unsaved changes to the current form?")) return;
    setSelectedId(form.id);
    setFields((form.schema.fields ?? []).map((f) => ({ ...f, uid: newUid() })));
    setSubmitLabel(form.schema.submit_label ?? "Send");
    setSuccessMessage(form.schema.success_message ?? "");
    setNotifyEmails((form.notifications?.emails ?? []).join(", "));
    setSpamProtection(form.spam_protection);
    setExpandedUid(null);
    setDirty(false);
    setTab("builder");
    setStatusMsg(null);
    setSubmissions([]);
    setSubsPage(1);
  };

  const mutate = useCallback(<T,>(setter: React.Dispatch<React.SetStateAction<T>>, value: React.SetStateAction<T>) => {
    setter(value);
    setDirty(true);
  }, []);

  // --- Field operations ---

  const addField = (type: FormFieldType) => {
    const label = `${FIELD_TYPE_META[type].label} field`;
    const field: EditorField = {
      uid: newUid(),
      name: fieldNameFromLabel(label, fields.map((f) => f.name)),
      label,
      type,
      required: false,
      ...(type === "select" ? { options: ["Option 1", "Option 2"] } : {}),
    };
    mutate(setFields, (prev: EditorField[]) => [...prev, field]);
    setExpandedUid(field.uid);
  };

  const updateField = (uid: string, patch: Partial<EditorField>) => {
    mutate(setFields, (prev: EditorField[]) =>
      prev.map((f) => {
        if (f.uid !== uid) return f;
        const next = { ...f, ...patch };
        // Keep the storage key in sync with the label (old submissions keep their original keys).
        if (patch.label !== undefined) {
          next.name = fieldNameFromLabel(patch.label, prev.filter((x) => x.uid !== uid).map((x) => x.name));
        }
        return next;
      })
    );
  };

  const removeField = (uid: string) => {
    mutate(setFields, (prev: EditorField[]) => prev.filter((f) => f.uid !== uid));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    mutate(setFields, (prev: EditorField[]) => {
      const from = prev.findIndex((f) => f.uid === active.id);
      const to = prev.findIndex((f) => f.uid === over.id);
      if (from === -1 || to === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  // --- Persistence ---

  const currentSchema = useMemo(
    () => ({
      fields: fields.map(({ uid, ...f }) => {
        void uid;
        return { ...f, rules: deriveRules(f) };
      }),
      submit_label: submitLabel,
      success_message: successMessage,
    }),
    [fields, submitLabel, successMessage]
  );

  const save = async () => {
    if (selectedId == null || saving) return;
    setSaving(true);
    setStatusMsg(null);
    try {
      const emails = notifyEmails.split(",").map((e) => e.trim()).filter(Boolean);
      const updated = await api.update(selectedId, {
        schema: currentSchema,
        notifications: emails.length ? { emails } : null,
        spam_protection: spamProtection,
      });
      setForms((prev) => (prev ?? []).map((f) => (f.id === selectedId ? { ...f, ...updated } : f)));
      setDirty(false);
      setStatusMsg({ kind: "ok", text: "Saved" });
      setTimeout(() => setStatusMsg((m) => (m?.text === "Saved" ? null : m)), 2500);
    } catch (e) {
      setStatusMsg({ kind: "err", text: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  const createForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const form = await api.create(newName.trim(), newType);
      const withCount = { ...form, submissions_count: 0 };
      setForms((prev) => [...(prev ?? []), withCount]);
      setNewName("");
      loadForm(withCount);
    } catch (err) {
      setStatusMsg({ kind: "err", text: err instanceof Error ? err.message : "Could not create form" });
    }
  };

  const deleteForm = async (form: FormRecord) => {
    if (!window.confirm(`Delete form “${form.name}” and all its submissions?`)) return;
    try {
      await api.remove(form.id);
      setForms((prev) => (prev ?? []).filter((f) => f.id !== form.id));
      if (selectedId === form.id) {
        setSelectedId(null);
        setFields([]);
        setDirty(false);
      }
    } catch (err) {
      setStatusMsg({ kind: "err", text: err instanceof Error ? err.message : "Could not delete form" });
    }
  };

  const toggleActive = async (form: FormRecord) => {
    try {
      const updated = await api.update(form.id, { is_active: !form.is_active });
      setForms((prev) => (prev ?? []).map((f) => (f.id === form.id ? { ...f, is_active: updated.is_active } : f)));
    } catch (err) {
      setStatusMsg({ kind: "err", text: err instanceof Error ? err.message : "Could not update form" });
    }
  };

  // --- Submissions ---

  const loadSubmissions = (page: number, append: boolean) => {
    if (selectedId == null) return;
    setSubsLoading(true);
    api
      .submissions(selectedId, page)
      .then((res) => {
        setSubmissions((prev) => (append ? [...prev, ...res.data] : res.data));
        setSubsHasMore(res.hasMore);
        setSubsPage(page);
      })
      .catch((e) => setStatusMsg({ kind: "err", text: e.message }))
      .finally(() => setSubsLoading(false));
  };

  const openSubmissions = () => {
    setTab("submissions");
    loadSubmissions(1, false);
  };

  const selectedForm = forms?.find((f) => f.id === selectedId) ?? null;

  return (
    <div className="flex min-h-0 flex-1">
      {/* Forms list */}
      <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-4">
          <h1 className="font-bold">{title}</h1>
        </div>
        <div className="flex-1 p-2">
          {forms === null && <p className="p-2 text-sm text-slate-400">Loading…</p>}
          {forms?.length === 0 && <p className="p-2 text-sm text-slate-400">No forms yet — create your first one below.</p>}
          {forms?.map((form) => (
            <div key={form.id} className={`group flex items-center rounded-lg px-3 py-2 ${selectedId === form.id ? "bg-cyan-50" : "hover:bg-slate-50"}`}>
              <button onClick={() => loadForm(form)} className="min-w-0 flex-1 text-left">
                <p className={`truncate text-sm font-semibold ${selectedId === form.id ? "text-cyan-800" : ""}`}>
                  {form.name}
                  {!form.is_active && <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-xs font-normal text-slate-500">inactive</span>}
                </p>
                <p className="truncate text-xs text-slate-400 capitalize">
                  {form.type} · /{form.slug} · {form.submissions_count ?? 0} submissions
                </p>
              </button>
              <button onClick={() => void deleteForm(form)} className="rounded px-1.5 text-sm text-red-400 opacity-0 hover:bg-red-50 group-hover:opacity-100" title="Delete form">
                ✕
              </button>
            </div>
          ))}
        </div>
        <form onSubmit={createForm} className="space-y-2 border-t border-slate-200 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">New form</p>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Form name" className={inputClass} />
          <select value={newType} onChange={(e) => setNewType(e.target.value)} className={`${inputClass} capitalize`}>
            {FORM_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <button disabled={!newName.trim()} className="w-full rounded-lg bg-cyan-700 py-1.5 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-40">
            + Create form
          </button>
        </form>
      </aside>

      {/* Editor */}
      <main className="min-w-0 flex-1 overflow-y-auto">
        {!selectedForm ? (
          <div className="flex h-64 items-center justify-center text-slate-400">Select or create a form to edit it.</div>
        ) : (
          <div className="mx-auto max-w-6xl p-6">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-bold">{selectedForm.name}</h2>
                <p className="text-xs text-slate-400">
                  Embed with form slug <code className="rounded bg-slate-100 px-1">{selectedForm.slug}</code>
                  {dirty ? " · unsaved changes" : ""}
                </p>
              </div>
              <div className="flex rounded-lg bg-slate-100 p-1 text-sm">
                <button onClick={() => setTab("builder")} className={`rounded-md px-3 py-1 font-medium ${tab === "builder" ? "bg-white shadow" : "text-slate-500"}`}>
                  Builder
                </button>
                <button onClick={openSubmissions} className={`rounded-md px-3 py-1 font-medium ${tab === "submissions" ? "bg-white shadow" : "text-slate-500"}`}>
                  Submissions ({selectedForm.submissions_count ?? 0})
                </button>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={selectedForm.is_active} onChange={() => void toggleActive(selectedForm)} />
                Active
              </label>
              {statusMsg && <span className={`text-xs font-medium ${statusMsg.kind === "ok" ? "text-emerald-600" : "text-red-600"}`}>{statusMsg.text}</span>}
              <button
                onClick={() => void save()}
                disabled={saving || !dirty}
                className="rounded-lg bg-cyan-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-40"
              >
                {saving ? "Saving…" : "Save form"}
              </button>
            </div>

            {tab === "builder" ? (
              <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                {/* Fields + settings */}
                <div>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={fields.map((f) => f.uid)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-1.5">
                        {fields.map((field) => (
                          <FieldRow
                            key={field.uid}
                            field={field}
                            expanded={expandedUid === field.uid}
                            onToggle={() => setExpandedUid(expandedUid === field.uid ? null : field.uid)}
                            onChange={(patch) => updateField(field.uid, patch)}
                            onRemove={() => removeField(field.uid)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                  {fields.length === 0 && (
                    <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">No fields yet — add some below.</div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(Object.keys(FIELD_TYPE_META) as FormFieldType[]).map((type) => (
                      <button
                        key={type}
                        onClick={() => addField(type)}
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium hover:border-cyan-400 hover:bg-cyan-50"
                      >
                        + {FIELD_TYPE_META[type].icon} {FIELD_TYPE_META[type].label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-6 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Form settings</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold text-slate-600">Submit button text</span>
                        <input className={inputClass} value={submitLabel} onChange={(e) => mutate(setSubmitLabel, e.target.value)} />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold text-slate-600">Success message</span>
                        <input className={inputClass} value={successMessage} onChange={(e) => mutate(setSuccessMessage, e.target.value)} />
                      </label>
                      <label className="block sm:col-span-2">
                        <span className="mb-1 block text-xs font-semibold text-slate-600">Notification emails (comma-separated)</span>
                        <input className={inputClass} value={notifyEmails} placeholder="team@example.com" onChange={(e) => mutate(setNotifyEmails, e.target.value)} />
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={spamProtection} onChange={(e) => mutate(setSpamProtection, e.target.checked)} />
                        Spam protection (honeypot)
                      </label>
                    </div>
                  </div>
                </div>

                {/* Live preview */}
                <div>
                  <p className="mb-2 text-center text-xs text-slate-400">Live preview</p>
                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <FormRenderer
                      key={JSON.stringify(currentSchema)} // reset preview state on schema change
                      schema={currentSchema}
                      onSubmit={async () => {
                        await new Promise((r) => setTimeout(r, 300)); // preview only - nothing is sent
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Submissions tab */
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {subsLoading && submissions.length === 0 ? (
                  <p className="p-8 text-center text-sm text-slate-400">Loading submissions…</p>
                ) : submissions.length === 0 ? (
                  <p className="p-8 text-center text-sm text-slate-400">No submissions yet.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {submissions.map((sub) => (
                      <div key={sub.id} className="px-4 py-3">
                        <p className="mb-1 text-xs text-slate-400">
                          #{sub.id} · {new Date(sub.created_at).toLocaleString()} · <span className="capitalize">{sub.status}</span>
                        </p>
                        <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                          {Object.entries(sub.data).map(([key, value]) => (
                            <div key={key} className="flex gap-2">
                              <dt className="shrink-0 font-medium text-slate-500">{key}:</dt>
                              <dd className="min-w-0 break-words">{String(value)}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    ))}
                  </div>
                )}
                {subsHasMore && (
                  <div className="border-t border-slate-100 p-3 text-center">
                    <button onClick={() => loadSubmissions(subsPage + 1, true)} disabled={subsLoading} className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-40">
                      {subsLoading ? "Loading…" : "Load more"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
