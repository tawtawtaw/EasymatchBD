"use client";

import { useEffect } from "react";
import { isNativeVideoCallShell } from "@/lib/mobile-video-call";

type NativeCallCommandMessage = {
  type?: string;
  cmd?: string;
};

function handleNativeCommandMessage(raw: unknown) {
  if (typeof raw !== "string" || !raw.trim()) return;
  let data: NativeCallCommandMessage;
  try {
    data = JSON.parse(raw) as NativeCallCommandMessage;
  } catch {
    return;
  }
  if (data.type !== "native_call_cmd" || !data.cmd) return;
  if (window.__easymatchRunNativeCommand?.(data.cmd)) {
    return;
  }
  window.__easymatchNativeCommandQueue = window.__easymatchNativeCommandQueue ?? [];
  window.__easymatchNativeCommandQueue.push(data.cmd);
}

declare global {
  interface Window {
    __easymatchNativeCommandQueue?: string[];
    __easymatchRunNativeCommand?: (cmd: string) => boolean;
  }
}

export function NativeCallCommandListener() {
  useEffect(() => {
    if (!isNativeVideoCallShell()) return;

    const onWindowMessage = (event: MessageEvent) => {
      handleNativeCommandMessage(event.data);
    };

    const onDocumentMessage = (event: Event) => {
      const messageEvent = event as MessageEvent;
      handleNativeCommandMessage(messageEvent.data);
    };

    window.addEventListener("message", onWindowMessage);
    document.addEventListener("message", onDocumentMessage);
    return () => {
      window.removeEventListener("message", onWindowMessage);
      document.removeEventListener("message", onDocumentMessage);
    };
  }, []);

  return null;
}
