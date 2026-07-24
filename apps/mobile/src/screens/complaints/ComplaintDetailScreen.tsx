import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ErrorState, LoadingState } from "../../components/ScreenState";
import { fillComplaintTemplate, tComplaints } from "../../i18n/complaints";
import { getApiErrorMessage } from "../../lib/api-error";
import type { ComplaintDetailScreenProps } from "../../navigation/types";
import {
  cancelMemberComplaint,
  getMemberComplaint,
  listComplaintMessages,
  sendComplaintMessage,
} from "../../services/complaints";
import { useLocaleStore } from "../../store/localeStore";
import type { ComplaintMessage, MemberComplaintDetail } from "../../types/complaints";
import { colors } from "../../theme/colors";

export default function ComplaintDetailScreen({
  navigation,
  route,
}: ComplaintDetailScreenProps) {
  const { complaintId } = route.params;
  const locale = useLocaleStore((s) => s.locale);
  const copy = tComplaints(locale);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<MemberComplaintDetail | null>(null);
  const [messages, setMessages] = useState<ComplaintMessage[]>([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [complaint, messageList] = await Promise.all([
        getMemberComplaint(complaintId),
        listComplaintMessages(complaintId),
      ]);
      setDetail(complaint);
      setMessages(messageList);
      navigation.setOptions({
        title: fillComplaintTemplate(copy.detailTitle, {
          code: complaint.targetProfile?.profileCode ?? "—",
        }),
      });
    } catch (err) {
      setError(getApiErrorMessage(err, copy.loadError));
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [complaintId, copy.detailTitle, copy.loadError, navigation]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSendMessage() {
    if (!messageDraft.trim()) return;
    setActing(true);
    setError(null);
    try {
      const sent = await sendComplaintMessage(complaintId, messageDraft.trim());
      setMessages((current) => [...current, sent]);
      setMessageDraft("");
    } catch (err) {
      setError(getApiErrorMessage(err, copy.actionError));
    } finally {
      setActing(false);
    }
  }

  async function handleCancel() {
    setActing(true);
    setError(null);
    try {
      await cancelMemberComplaint(complaintId);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, copy.actionError));
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return <LoadingState label={copy.title} />;
  }

  if (!detail) {
    return <ErrorState message={error ?? copy.notFound} onRetry={() => void load()} />;
  }

  const isClosed = ["resolved", "dismissed", "cancelled"].includes(detail.status);
  const canCancel = detail.viewerIsReporter && !isClosed;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable onPress={() => navigation.goBack()}>
        <Text style={styles.backLink}>{copy.backToList}</Text>
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>
            {fillComplaintTemplate(copy.detailTitle, {
              code: detail.targetProfile?.profileCode ?? "—",
            })}
          </Text>
          <Text style={styles.statusBadge}>{copy.status[detail.status]}</Text>
        </View>
        <Text style={styles.meta}>
          {copy.categories[detail.category]} · {new Date(detail.createdAt).toLocaleString()}
        </Text>
        {detail.assignedConsultantName ? (
          <Text style={styles.meta}>
            {fillComplaintTemplate(copy.assignedConsultant, {
              name: detail.assignedConsultantName,
            })}
          </Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{copy.yourDescription}</Text>
        <Text style={styles.bodyText}>{detail.description}</Text>
      </View>

      {detail.resolutionNote ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{copy.resolutionNote}</Text>
          <Text style={styles.bodyText}>{detail.resolutionNote}</Text>
        </View>
      ) : null}

      {canCancel ? (
        <Pressable
          style={[styles.secondaryButton, acting && styles.buttonDisabled]}
          disabled={acting}
          onPress={() => void handleCancel()}
        >
          <Text style={styles.secondaryButtonText}>{copy.cancelComplaint}</Text>
        </Pressable>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{copy.messagesTitle}</Text>
        {messages.length === 0 ? (
          <Text style={styles.muted}>{copy.noMessages}</Text>
        ) : (
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.messageList}
            renderItem={({ item }) => (
              <View style={styles.messageBubble}>
                <Text style={styles.messageAuthor}>
                  {item.senderIsConsultant
                    ? item.senderName ?? "Consultant"
                    : copy.you}
                </Text>
                <Text style={styles.messageBody}>{item.body}</Text>
              </View>
            )}
          />
        )}

        {!isClosed ? (
          <View style={styles.composeRow}>
            <TextInput
              value={messageDraft}
              onChangeText={setMessageDraft}
              placeholder={copy.messagePlaceholder}
              style={styles.composeInput}
              multiline
            />
            <Pressable
              style={[styles.primaryButton, acting && styles.buttonDisabled]}
              disabled={acting || !messageDraft.trim()}
              onPress={() => void handleSendMessage()}
            >
              <Text style={styles.primaryButtonText}>
                {acting ? copy.sending : copy.sendMessage}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.rose50,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  backLink: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.rose800,
  },
  error: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#fef2f2",
    color: colors.red600,
    fontSize: 13,
  },
  headerCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.rose100,
    backgroundColor: colors.white,
    padding: 16,
    gap: 6,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    alignItems: "flex-start",
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: "800",
    color: colors.zinc900,
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.rose800,
    backgroundColor: colors.rose50,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  meta: {
    fontSize: 13,
    color: colors.zinc600,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.zinc100,
    backgroundColor: colors.white,
    padding: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.zinc900,
  },
  bodyText: {
    fontSize: 14,
    color: colors.zinc800,
    lineHeight: 21,
  },
  muted: {
    fontSize: 13,
    color: colors.zinc500,
    lineHeight: 20,
  },
  secondaryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.zinc100,
    backgroundColor: colors.white,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: colors.zinc800,
    fontSize: 14,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  messageList: {
    gap: 10,
  },
  messageBubble: {
    borderRadius: 12,
    backgroundColor: colors.rose50,
    padding: 12,
    gap: 4,
  },
  messageAuthor: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.rose800,
  },
  messageBody: {
    fontSize: 14,
    color: colors.zinc800,
    lineHeight: 20,
  },
  composeRow: {
    marginTop: 8,
    gap: 10,
  },
  composeInput: {
    borderWidth: 1,
    borderColor: colors.zinc100,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 80,
    fontSize: 14,
    color: colors.zinc900,
    backgroundColor: colors.white,
    textAlignVertical: "top",
  },
  primaryButton: {
    borderRadius: 999,
    backgroundColor: colors.rose800,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
});
