"use client";
import { useState } from "react";
export type Field = {
  name: string;
  label: string;
  type?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  min?: number;
  max?: number;
  step?: string;
};
export default function Form({
  fields,
  initial = {},
  submit,
  label = "Save changes",
  onDone,
}: {
  fields: Field[];
  initial?: any;
  submit: (d: any) => Promise<any>;
  label?: string;
  onDone?: (d: any) => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  return (
    <form
      className="form-grid"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data: any = Object.fromEntries(new FormData(form));
        fields
          .filter((f) => f.type === "number")
          .forEach((f) => (data[f.name] = Number(data[f.name])));
        setBusy(true);
        setError("");
        setSuccess("");
        try {
          const d = await submit(data);
          setSuccess(d.message || "Saved successfully.");
          onDone?.(d);
        } catch (e: any) {
          setError(e.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      {fields.map((f) => (
        <label key={f.name} className={f.type === "textarea" ? "full" : ""}>
          {f.label}
          {f.options ? (
            <select
              name={f.name}
              defaultValue={initial[f.name] ?? f.options[0]?.value}
              required={f.required !== false}
            >
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : f.type === "textarea" ? (
            <textarea
              name={f.name}
              defaultValue={initial[f.name] ?? ""}
              required={f.required !== false}
              maxLength={3000}
              rows={4}
            />
          ) : (
            <input
              name={f.name}
              type={f.type || "text"}
              defaultValue={initial[f.name] ?? ""}
              required={f.required !== false}
              min={f.min}
              max={f.max}
              step={f.step}
              minLength={f.type === "password" ? 10 : undefined}
              maxLength={f.type === "password" ? 128 : 200}
              autoComplete={
                f.type === "password"
                  ? "new-password"
                  : f.type === "email"
                    ? "email"
                    : undefined
              }
            />
          )}
        </label>
      ))}
      {error && (
        <p className="form-error full" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="form-success full" role="status">
          {success}
        </p>
      )}
      <div className="full">
        <button className="btn primary" disabled={busy}>
          {busy ? "Saving…" : label}
          <span aria-hidden="true">↗</span>
        </button>
      </div>
    </form>
  );
}
