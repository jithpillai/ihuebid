"use client";

export function ThemeToggle({ className = "" }: { className?: string }) {
  // No React state: the icon is driven purely by the `.dark` class via CSS
  // (`dark:hidden` / `dark:block`), and the click reads the class live from the
  // DOM. This keeps SSR and first paint identical and avoids a hydration/state
  // dance for a control that only flips one class.
  function toggle() {
    const root = document.documentElement;
    const next = root.classList.contains("dark") ? "light" : "dark";
    root.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("ihue-bid-theme", next);
    } catch {
      /* private mode / storage disabled — the toggle still works for this session */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dark mode"
      className={`grid size-9 place-items-center rounded-full border border-border text-muted-fg transition hover:bg-muted hover:text-fg ${className}`}
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-[18px] dark:hidden" aria-hidden="true">
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
        <path
          d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6l1.4 1.4m10 10 1.4 1.4m0-13.2-1.4 1.4m-10 10-1.4 1.4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <svg viewBox="0 0 24 24" fill="none" className="hidden size-[18px] dark:block" aria-hidden="true">
        <path
          d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
