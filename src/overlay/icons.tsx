import type { ReactNode } from "react";

export function IconButton({
  label,
  pressed,
  onClick,
  children,
  className,
}: {
  label: string;
  pressed?: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={["icon-btn", className].filter(Boolean).join(" ")}
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3.2 3.2a.75.75 0 0 1 1.06 0L8 6.94l3.74-3.74a.75.75 0 1 1 1.06 1.06L9.06 8l3.74 3.74a.75.75 0 1 1-1.06 1.06L8 9.06l-3.74 3.74a.75.75 0 1 1-1.06-1.06L6.94 8 3.2 4.26a.75.75 0 0 1 0-1.06z"
      />
    </svg>
  );
}

export function HideIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06L7.28 12.78a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06z"
      />
    </svg>
  );
}

export function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M5 2.5A1.5 1.5 0 0 1 6.5 1h6A1.5 1.5 0 0 1 14 2.5v8A1.5 1.5 0 0 1 12.5 12H11v1.5A1.5 1.5 0 0 1 9.5 15h-6A1.5 1.5 0 0 1 2 13.5v-8A1.5 1.5 0 0 1 3.5 4H5V2.5zm1.5-.5a.5.5 0 0 0-.5.5V4h4.5A1.5 1.5 0 0 1 12 5.5V11h.5a.5.5 0 0 0 .5-.5v-8a.5.5 0 0 0-.5-.5h-6zM3.5 5a.5.5 0 0 0-.5.5v8a.5.5 0 0 0 .5.5h6a.5.5 0 0 0 .5-.5v-8a.5.5 0 0 0-.5-.5h-6z"
      />
    </svg>
  );
}

export function MicIcon({ off }: { off?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 1.6A2.2 2.2 0 0 0 5.8 3.8v3.4a2.2 2.2 0 1 0 4.4 0V3.8A2.2 2.2 0 0 0 8 1.6zM3.9 7.2a.7.7 0 0 1 .7.7 3.4 3.4 0 0 0 6.8 0 .7.7 0 1 1 1.4 0 4.8 4.8 0 0 1-4.1 4.75V14h2.1a.7.7 0 1 1 0 1.4H5.2a.7.7 0 1 1 0-1.4h2.1v-1.35A4.8 4.8 0 0 1 3.2 7.9a.7.7 0 0 1 .7-.7z"
      />
      {off ? (
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          d="M3.2 3.2 12.8 12.8"
        />
      ) : null}
    </svg>
  );
}

export function CameraIcon({ off }: { off?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M2.4 4.2A1.7 1.7 0 0 1 4.1 2.5h5.2A1.7 1.7 0 0 1 11 4.2v7.6a1.7 1.7 0 0 1-1.7 1.7H4.1A1.7 1.7 0 0 1 2.4 11.8V4.2zm9.3 1.55 2.05-1.2A.8.8 0 0 1 15 5.25v5.5a.8.8 0 0 1-1.25.7l-2.05-1.2V5.75z"
      />
      {off ? (
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          d="M3.2 3.2 12.8 12.8"
        />
      ) : null}
    </svg>
  );
}
