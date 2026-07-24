type GenderProfilePlaceholderProps = {
  gender?: string | null;
  className?: string;
};

export function GenderProfilePlaceholder({
  gender,
  className = "h-14 w-14",
}: GenderProfilePlaceholderProps) {
  const isMale = gender === "male";
  const isFemale = gender === "female";

  const shellClass = isMale
    ? "bg-gradient-to-br from-sky-100 via-sky-50 to-slate-200"
    : isFemale
      ? "bg-gradient-to-br from-rose-100 via-rose-50 to-amber-100"
      : "bg-gradient-to-br from-zinc-100 to-zinc-200";

  const figureClass = isMale
    ? "text-sky-700"
    : isFemale
      ? "text-rose-700"
      : "text-zinc-500";

  const glowClass = isMale
    ? "bg-sky-300/35"
    : isFemale
      ? "bg-rose-300/35"
      : "bg-zinc-300/30";

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl shadow-sm ring-1 ring-black/5 ${shellClass} ${className}`}
      aria-hidden
    >
      <div
        className={`pointer-events-none absolute -right-[18%] -top-[18%] h-[72%] w-[72%] rounded-full ${glowClass}`}
      />
      <svg
        viewBox="0 0 48 48"
        className={`relative z-[1] h-[68%] w-[68%] ${figureClass}`}
        fill="currentColor"
        aria-hidden
      >
        {isFemale ? (
          <>
            <path
              d="M10 18c0-3.3 2.7-6 6-6h16c3.3 0 6 2.7 6 6v2.2c0 .8-.7 1.5-1.5 1.5H11.5c-.8 0-1.5-.7-1.5-1.5V18z"
              opacity="0.22"
            />
            <circle cx="24" cy="14" r="7.5" opacity="0.95" />
            <path
              d="M16.5 22.5c0-1.8 1.5-3.3 3.3-3.3h11.4c1.8 0 3.3 1.5 3.3 3.3V25c0 .8-.7 1.5-1.5 1.5h-2.2v12.8c0 1.2-1 2.2-2.2 2.2h-1.5v-6.4c0-.8-.7-1.5-1.5-1.5s-1.5.7-1.5 1.5v6.4h-1.5c-1.2 0-2.2-1-2.2-2.2V26.5h-2.2c-.8 0-1.5-.7-1.5-1.5v-2.5z"
              opacity="0.88"
            />
            <path
              d="M17.5 39.2c1.3 2.1 3.6 3.3 6.5 3.3s5.2-1.2 6.5-3.3c.5-.8-.1-1.9-1.1-1.9H18.6c-1 0-1.6 1.1-1.1 1.9z"
              opacity="0.72"
            />
          </>
        ) : isMale ? (
          <>
            <circle cx="24" cy="14" r="7.5" opacity="0.95" />
            <path
              d="M14.5 23c0-2.1 1.7-3.8 3.8-3.8h14.7c2.1 0 3.8 1.7 3.8 3.8v3.2c0 .9-.7 1.6-1.6 1.6h-3.4v11.8c0 1.3-1.1 2.4-2.4 2.4s-2.4-1.1-2.4-2.4V28.8h-3.8v11.8c0 1.3-1.1 2.4-2.4 2.4s-2.4-1.1-2.4-2.4V28.8h-3.4c-.9 0-1.6-.7-1.6-1.6V23z"
              opacity="0.88"
            />
          </>
        ) : (
          <>
            <circle cx="24" cy="14" r="7.5" opacity="0.9" />
            <path
              d="M16 22.5c0-1.9 1.6-3.5 3.5-3.5h11c1.9 0 3.5 1.6 3.5 3.5v2.5c0 .8-.7 1.5-1.5 1.5h-2v13.5c0 1.2-1 2.2-2.2 2.2h-1.6v-6.2c0-.8-.7-1.5-1.5-1.5s-1.5.7-1.5 1.5v6.2h-1.6c-1.2 0-2.2-1-2.2-2.2V26.5h-2c-.8 0-1.5-.7-1.5-1.5v-2.5z"
              opacity="0.85"
            />
          </>
        )}
      </svg>
    </div>
  );
}
