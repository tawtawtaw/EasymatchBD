export function isInactiveAccountAuthError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("inactive or not found") ||
    message.includes("account is inactive")
  );
}

export function friendlyAuthErrorMessage(error: unknown, staffHint: string): string {
  if (isInactiveAccountAuthError(error)) {
    return staffHint;
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return staffHint;
}
