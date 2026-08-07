"use client";

import { useEffect } from "react";

const RELOAD_GUARD_KEY = "easymatch-chunk-reload-once";

function isChunkLoadFailure(reason: unknown): boolean {
  if (reason == null) return false;
  const message =
    reason instanceof Error
      ? `${reason.name} ${reason.message}`
      : String(reason);
  const normalized = message.toLowerCase();
  return (
    normalized.includes("chunkloaderror") ||
    normalized.includes("loading chunk") ||
    normalized.includes("failed to fetch dynamically imported module") ||
    normalized.includes("importing a module script failed")
  );
}

/**
 * Dev/ngrok: after HMR or a slow tunnel, the browser may request an old JS chunk.
 * One automatic hard reload usually fixes ChunkLoadError timeouts.
 */
export function ChunkLoadRecovery() {
  useEffect(() => {
    const clearGuard = () => sessionStorage.removeItem(RELOAD_GUARD_KEY);
    window.addEventListener("load", clearGuard);
    return () => window.removeEventListener("load", clearGuard);
  }, []);

  useEffect(() => {
    const maybeReload = (reason: unknown) => {
      if (!isChunkLoadFailure(reason)) return;
      if (sessionStorage.getItem(RELOAD_GUARD_KEY)) return;
      sessionStorage.setItem(RELOAD_GUARD_KEY, "1");
      window.location.reload();
    };

    const onError = (event: ErrorEvent) => {
      maybeReload(event.error ?? event.message);
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      maybeReload(event.reason);
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
