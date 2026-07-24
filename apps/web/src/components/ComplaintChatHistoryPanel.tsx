"use client";

import { useTranslations } from "next-intl";
import type { ComplaintChatHistory } from "@/lib/admin-complaints";

type ComplaintChatHistoryPanelProps = {
  history: ComplaintChatHistory | null;
  loading: boolean;
  error: string | null;
};

export function ComplaintChatHistoryPanel({
  history,
  loading,
  error,
}: ComplaintChatHistoryPanelProps) {
  const t = useTranslations("complaintInvestigation");
  const tc = useTranslations("common");

  if (loading) {
    return <p className="text-sm text-zinc-500">{tc("loading")}</p>;
  }

  if (error) {
    return (
      <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
        {error}
      </p>
    );
  }

  if (!history) {
    return null;
  }

  return (
    <div className="space-y-5">
      {!history.hasConnection ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {t("noConnection")}
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
          {t("connectionSummary", {
            count: history.messageCount,
            level: history.privacyLevel ?? 0,
          })}
        </div>
      )}

      {history.interests.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-900">{t("interestsTitle")}</h3>
          <ul className="space-y-2">
            {history.interests.map((interest) => (
              <li
                key={interest.id}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600"
              >
                {t("interestRow", {
                  from:
                    interest.from === "reporter"
                      ? t("reporterSide")
                      : t("targetSide"),
                  status: interest.status,
                  date: new Date(interest.createdAt).toLocaleString(),
                })}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-zinc-900">{t("chatTitle")}</h3>
        {history.messages.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("noMessages")}</p>
        ) : (
          <ul className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
            {history.messages.map((message) => (
              <li
                key={message.id}
                className={`rounded-xl border p-3 text-sm ${
                  message.senderSide === "reporter"
                    ? "border-rose-200 bg-rose-50"
                    : "border-blue-200 bg-blue-50"
                }`}
              >
                <p className="text-xs font-semibold text-zinc-500">
                  {message.senderSide === "reporter"
                    ? t("reporterLabel", {
                        code: history.reporter.profileCode ?? "—",
                      })
                    : t("targetLabel", {
                        code: history.target.profileCode ?? "—",
                      })}{" "}
                  · {new Date(message.createdAt).toLocaleString()}
                  {message.isDeleted ? ` · ${t("deletedMessage")}` : null}
                  {message.editedAt ? ` · ${t("editedMessage")}` : null}
                </p>
                {message.isDeleted ? (
                  <p className="mt-1 italic text-zinc-500">{t("deletedBody")}</p>
                ) : message.messageType === "text" ? (
                  <p className="mt-1 whitespace-pre-wrap text-zinc-800">{message.body}</p>
                ) : (
                  <p className="mt-1 text-zinc-700">
                    {t("attachmentMessage", {
                      name: message.attachmentFileName ?? message.messageType,
                    })}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-zinc-500">{t("privacyNote")}</p>
    </div>
  );
}
