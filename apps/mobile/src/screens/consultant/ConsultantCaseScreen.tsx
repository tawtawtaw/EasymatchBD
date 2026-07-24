import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ErrorState, LoadingState } from "../../components/ScreenState";
import { tConsultant, tConsultantCase } from "../../i18n/messages";
import { getApiErrorMessage } from "../../lib/api-error";
import type { ConsultantCaseScreenProps } from "../../navigation/types";
import {
  getConsultantCaseDetail,
  listConsultantCaseMessages,
  listConsultantMeetings,
  sendConsultantCaseMessage,
  type ConsultantCaseDetail,
  type ConsultantCaseMessage,
  type ConsultantMeeting,
} from "../../services/consultant";
import { useLocaleStore } from "../../store/localeStore";
import { colors } from "../../theme/colors";

type TabKey = "messages" | "meetings";

export default function ConsultantCaseScreen({
  navigation,
  route,
}: ConsultantCaseScreenProps) {
  const { caseId } = route.params;
  const locale = useLocaleStore((s) => s.locale);
  const tc = tConsultant(locale);
  const copy = tConsultantCase(locale);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConsultantCaseDetail | null>(null);
  const [tab, setTab] = useState<TabKey>("messages");
  const [messages, setMessages] = useState<ConsultantCaseMessage[]>([]);
  const [meetings, setMeetings] = useState<ConsultantMeeting[]>([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [caseDetail, messageList, meetingList] = await Promise.all([
        getConsultantCaseDetail(caseId),
        listConsultantCaseMessages(caseId),
        listConsultantMeetings(caseId),
      ]);
      setDetail(caseDetail);
      setMessages(messageList);
      setMeetings(meetingList);
    } catch (err) {
      setError(getApiErrorMessage(err, copy.loadError));
    } finally {
      setLoading(false);
    }
  }, [caseId, copy.loadError]);

  useEffect(() => {
    void load();
  }, [load]);

  useLayoutEffect(() => {
    if (!detail) return;
    const serviceName =
      tc.services[detail.serviceType as keyof typeof tc.services] ?? detail.serviceLabelEn;
    navigation.setOptions({ title: serviceName });
  }, [detail, navigation, tc.services]);

  function formatDateTime(iso: string) {
    return new Date(iso).toLocaleString(locale === "bn" ? "bn-BD" : "en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  function audienceLabel(msg: ConsultantCaseMessage) {
    if (msg.audience === "both") return copy.audienceBoth;
    if (msg.recipient?.id && detail && !detail.viewerIsConsultant) {
      return copy.audiencePrivateToYou;
    }
    return copy.audiencePrivateTo.replace(
      "{name}",
      msg.recipient?.displayName ?? copy.memberFallback,
    );
  }

  async function handleSendMessage() {
    if (!messageDraft.trim()) return;
    setSending(true);
    setError(null);
    try {
      const sent = await sendConsultantCaseMessage(caseId, messageDraft.trim());
      setMessages((prev) => [...prev, sent]);
      setMessageDraft("");
    } catch (err) {
      setError(getApiErrorMessage(err, copy.actionError));
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <LoadingState label={copy.loading} />;
  }

  if (!detail) {
    return (
      <View style={styles.container}>
        <Text style={styles.notFound}>{copy.notFound}</Text>
      </View>
    );
  }

  const members = [detail.connection.memberLow, detail.connection.memberHigh]
    .map((m) => m.profileCode ?? m.fullName ?? "—")
    .join(" · ");

  const statusLabel =
    tc.status[detail.status as keyof typeof tc.status] ?? detail.status;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={88}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.members}>{members}</Text>
        <Text style={styles.meta}>
          {statusLabel} · ৳{detail.amountBdt}
        </Text>
        {detail.memberNotes ? (
          <Text style={styles.notes}>{detail.memberNotes}</Text>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.tabs}>
          {(["messages", "meetings"] as TabKey[]).map((key) => (
            <Pressable
              key={key}
              style={[styles.tab, tab === key && styles.tabActive]}
              onPress={() => setTab(key)}
            >
              <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>
                {copy.tabs[key]}
              </Text>
            </Pressable>
          ))}
        </View>

        {tab === "messages" ? (
          <View style={styles.panel}>
            {messages.length === 0 ? (
              <Text style={styles.empty}>{copy.noMessages}</Text>
            ) : (
              messages.map((msg) => (
                <View
                  key={msg.id}
                  style={[styles.messageBubble, msg.isMine ? styles.messageMine : styles.messageOther]}
                >
                  <Text style={styles.messageSender}>
                    {msg.sender.displayName} · {audienceLabel(msg)}
                  </Text>
                  <Text style={styles.messageBody}>{msg.body}</Text>
                  <Text style={styles.messageTime}>{formatDateTime(msg.createdAt)}</Text>
                </View>
              ))
            )}

            <View style={styles.composeRow}>
              <TextInput
                value={messageDraft}
                onChangeText={setMessageDraft}
                placeholder={copy.messagePlaceholder}
                placeholderTextColor={colors.zinc500}
                multiline
                style={styles.composeInput}
              />
              <Pressable
                style={[styles.sendButton, sending && styles.sendButtonDisabled]}
                disabled={sending || !messageDraft.trim()}
                onPress={() => void handleSendMessage()}
              >
                <Text style={styles.sendButtonText}>{copy.sendMessage}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {tab === "meetings" ? (
          <View style={styles.panel}>
            {meetings.length === 0 ? (
              <Text style={styles.empty}>{copy.noMeetings}</Text>
            ) : (
              meetings.map((meeting) => (
                <View key={meeting.id} style={styles.meetingRow}>
                  <Text style={styles.meetingTime}>{formatDateTime(meeting.scheduledAt)}</Text>
                  {meeting.agenda ? (
                    <Text style={styles.meetingAgenda}>{meeting.agenda}</Text>
                  ) : null}
                  <Text style={styles.meetingStatus}>{meeting.status}</Text>
                </View>
              ))
            )}
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.rose50 },
  content: { padding: 16, paddingBottom: 32, gap: 10 },
  notFound: { padding: 16, fontSize: 14, color: colors.zinc600 },
  members: { fontSize: 14, color: colors.zinc600 },
  meta: { fontSize: 12, color: colors.zinc500 },
  notes: {
    borderRadius: 8,
    backgroundColor: colors.zinc50,
    padding: 10,
    fontSize: 13,
    lineHeight: 18,
    color: colors.zinc700,
  },
  error: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#fef2f2",
    color: colors.red600,
    fontSize: 12,
  },
  tabs: { flexDirection: "row", gap: 8, marginTop: 4 },
  tab: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.zinc100,
  },
  tabActive: { backgroundColor: "#4c1d95" },
  tabText: { fontSize: 13, fontWeight: "600", color: colors.zinc700 },
  tabTextActive: { color: colors.white },
  panel: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.zinc100,
    backgroundColor: colors.white,
    padding: 12,
    gap: 10,
  },
  empty: { fontSize: 13, color: colors.zinc500 },
  messageBubble: {
    borderRadius: 10,
    padding: 10,
  },
  messageMine: {
    marginLeft: 24,
    backgroundColor: "#f5f3ff",
  },
  messageOther: {
    marginRight: 24,
    backgroundColor: colors.zinc50,
  },
  messageSender: { fontSize: 10, fontWeight: "600", color: colors.zinc500 },
  messageBody: { marginTop: 4, fontSize: 14, lineHeight: 20, color: colors.zinc800 },
  messageTime: { marginTop: 4, fontSize: 9, color: colors.zinc500 },
  composeRow: { flexDirection: "row", gap: 8, alignItems: "flex-end", marginTop: 4 },
  composeInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.zinc100,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.zinc900,
    textAlignVertical: "top",
  },
  sendButton: {
    borderRadius: 8,
    backgroundColor: "#4c1d95",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sendButtonDisabled: { opacity: 0.6 },
  sendButtonText: { color: colors.white, fontSize: 13, fontWeight: "700" },
  meetingRow: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.zinc100,
    backgroundColor: colors.zinc50,
    padding: 10,
    gap: 4,
  },
  meetingTime: { fontSize: 14, fontWeight: "600", color: colors.zinc900 },
  meetingAgenda: { fontSize: 13, color: colors.zinc600 },
  meetingStatus: { fontSize: 11, color: colors.zinc500, textTransform: "capitalize" },
});
