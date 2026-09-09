"use client";

import { USED_VEHICLE_FIELDS } from "@/server/listings/templates/used-vehicle";

export function ListingFieldInputs({
  values,
  onChange,
}: {
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {USED_VEHICLE_FIELDS.map((field) => (
        <label
          key={field.key}
          className={`block text-sm font-semibold text-body ${field.type === "textarea" ? "sm:col-span-2" : ""}`}
        >
          {field.label} {!field.required && <span className="font-normal text-subtle-fg">(optional)</span>}
          {field.type === "select" ? (
            <select
              value={values[field.key] ?? ""}
              onChange={(event) => onChange(field.key, event.target.value)}
              required={field.required}
              className="mt-2 w-full rounded-2xl border border-border-strong bg-surface px-4 py-3 text-fg outline-none focus:border-accent"
            >
              <option value="">Select…</option>
              {field.options?.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          ) : field.type === "textarea" ? (
            <textarea
              value={values[field.key] ?? ""}
              onChange={(event) => onChange(field.key, event.target.value)}
              required={field.required}
              rows={3}
              className="mt-2 w-full resize-none rounded-2xl border border-border-strong bg-surface px-4 py-3 text-fg outline-none focus:border-accent"
            />
          ) : (
            <input
              type={field.type === "number" ? "number" : "text"}
              value={values[field.key] ?? ""}
              onChange={(event) => onChange(field.key, event.target.value)}
              required={field.required}
              className="mt-2 w-full rounded-2xl border border-border-strong bg-surface px-4 py-3 text-fg outline-none focus:border-accent"
            />
          )}
        </label>
      ))}
    </div>
  );
}
