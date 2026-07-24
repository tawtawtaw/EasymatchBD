import type { ReactNode } from "react";

export function FieldLabel({
  children,
  required,
}: {
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <span className="field-label">
      {children}
      {required ? (
        <span className="text-rose-700" aria-hidden="true">
          {" "}
          *
        </span>
      ) : null}
    </span>
  );
}
