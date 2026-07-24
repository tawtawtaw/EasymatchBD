"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { isStaffRole } from "@easymatch/shared";
import { useStaffAlerts } from "@/components/StaffAlertsProvider";
import { NavCountBadge } from "@/components/StaffNavBadge";
import { useAuthSession } from "@/hooks/use-auth-session";

export function StaffNotificationBell() {
  const t = useTranslations("common");
  const router = useRouter();
  const { user, ready } = useAuthSession();
  const { summary, notifications, loadNotifications, markRead, markAllRead } =
    useStaffAlerts();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    void loadNotifications();
  }, [loadNotifications, open]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  if (!ready || !user || !isStaffRole(user.role)) {
    return null;
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={t("notifications")}
        onClick={() => setOpen((value) => !value)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300 bg-white text-base text-zinc-700 shadow-sm hover:border-rose-300 hover:text-rose-800"
      >
        🔔
        {summary.unreadNotifications > 0 ? (
          <span className="absolute -right-1 -top-1">
            <NavCountBadge count={summary.unreadNotifications} />
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-[220] mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-zinc-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
            <p className="text-sm font-bold text-zinc-900">{t("notifications")}</p>
            {summary.unreadNotifications > 0 ? (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-xs font-semibold text-rose-800 hover:underline"
              >
                {t("markAllRead")}
              </button>
            ) : null}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-sm text-zinc-500">{t("noNotifications")}</p>
            ) : (
              notifications.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    void markRead([item.id]);
                    setOpen(false);
                    router.push(item.linkPath);
                  }}
                  className={`block w-full border-b border-zinc-50 px-4 py-3 text-left hover:bg-rose-50 ${
                    item.read ? "opacity-70" : ""
                  }`}
                >
                  <p className="text-sm font-semibold text-zinc-900">{item.title}</p>
                  <p className="mt-1 text-xs text-zinc-600">{item.body}</p>
                  <p className="mt-1 text-[11px] text-zinc-400">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
