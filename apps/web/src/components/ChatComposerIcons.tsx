export function ChatPaperclipIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M21.44 11.05 12.25 20.24a6 6 0 1 1-8.49-8.49l10.6-10.6a4 4 0 0 1 5.66 5.66l-10.6 10.61a2 2 0 1 1-2.83-2.83l9.19-9.2" />
    </svg>
  );
}

export function ChatCameraIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M4 8h3l1.5-2.5h7L17 8h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z" />
      <circle cx="12" cy="14" r="3.25" />
    </svg>
  );
}

export function ChatSendIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M3.4 20.6 21 12 3.4 3.4l.1 6.8L15 12 3.5 13.8z" />
    </svg>
  );
}
