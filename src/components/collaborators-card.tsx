"use client";

import { FormEvent, useState } from "react";

type Collaborator = {
  id: string;
  email: string;
  status: "ACTIVE" | "PENDING";
  memberName: string | null;
};

const MAX = 2;

export function CollaboratorsCard({ initialCollaborators }: { initialCollaborators: Collaborator[] }) {
  const [collaborators, setCollaborators] = useState(initialCollaborators);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function add(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/account/collaborators", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json() as { ok: boolean; message?: string; collaborator?: Collaborator };
      if (!response.ok || !result.ok || !result.collaborator) throw new Error(result.message ?? "Unable to add this person.");
      setCollaborators((prev) => {
        const rest = prev.filter((c) => c.id !== result.collaborator!.id);
        return [...rest, result.collaborator!];
      });
      setEmail("");
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "Unable to add this person.");
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    const previous = collaborators;
    setCollaborators((prev) => prev.filter((c) => c.id !== id));
    const response = await fetch(`/api/account/collaborators/${id}`, { method: "DELETE" });
    if (!response.ok) setCollaborators(previous);
  }

  return (
    <div>
      {collaborators.length > 0 && (
        <ul className="mb-3 flex flex-col gap-2">
          {collaborators.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-fg">{c.memberName ?? c.email}</p>
                {c.memberName && <p className="truncate text-xs text-subtle-fg">{c.email}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                  c.status === "ACTIVE"
                    ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
                    : "bg-amber-500/12 text-amber-700 dark:text-amber-300"
                }`}>
                  {c.status === "ACTIVE" ? "Active" : "Invited"}
                </span>
                <button type="button" onClick={() => remove(c.id)} className="text-xs font-bold text-red-600">
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {collaborators.length < MAX && (
        <form onSubmit={add} className="flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            placeholder="teammate@example.com"
            className="flex-1 rounded-2xl border border-border-strong bg-surface px-4 py-2.5 text-sm text-fg outline-none placeholder:text-subtle-fg focus:border-accent"
          />
          <button disabled={loading || !email} type="submit" className="rounded-2xl bg-fg px-4 py-2.5 text-sm font-bold text-bg disabled:cursor-not-allowed disabled:opacity-40">
            {loading ? "Adding…" : "Add collaborator"}
          </button>
        </form>
      )}

      {error && <p role="alert" className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
      <p className="mt-2 text-xs text-subtle-fg">
        Collaborators sign in with their own email. They can create, edit, publish and close your listings and see
        interested buyers — but can&rsquo;t change your handle or manage this list. Up to {MAX}.
      </p>
    </div>
  );
}
