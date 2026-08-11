import { useCallback, useLayoutEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { EmptyState, ErrorState, LoadingState } from "../../components/ScreenState";
import { PaidMembershipGate } from "../../components/PaidMembershipGate";
import { tMessages } from "../../i18n/messages";
import { tVideoCalls } from "../../i18n/video-calls";
import { useIsPaidMember } from "../../hooks/use-is-paid-member";
import { getApiErrorMessage } from "../../lib/api-error";
import { formatMessageTime, messagePreviewText } from "../../lib/messages-display";
import { resolveMemberDisplayName } from "../../lib/member-display";
import type { MessagesListScreenProps } from "../../navigation/types";
import { listMessageConversations } from "../../services/messages";
import { useLocaleStore } from "../../store/localeStore";
import type { MessageConversation } from "../../types/messages";
import { colors } from "../../theme/colors";

export default function MessagesScreen({ navigation }: MessagesListScreenProps) {
  const locale = useLocaleStore((s) => s.locale);
  const isPaid = useIsPaidMember();
  const copy = tMessages(locale);
  const videoCopy = tVideoCalls(locale);
  const [conversations, setConversations] = useState<MessageConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!isPaid) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await listMessageConversations();
      setConversations(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(getApiErrorMessage(err, copy.loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [copy.loadError, isPaid]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        isPaid ? (
          <Pressable
            style={styles.headerButton}
            onPress={() => navigation.navigate("VideoCalls")}
          >
            <Text style={styles.headerButtonText}>{videoCopy.hubTitle}</Text>
          </Pressable>
        ) : null,
    });
  }, [isPaid, navigation, videoCopy.hubTitle]);

  if (!isPaid) {
    return (
      <View style={styles.gateContainer}>
        <PaidMembershipGate feature="messages" locale={locale} />
      </View>
    );
  }

  if (loading && !refreshing) {
    return <LoadingState label={copy.loading} />;
  }

  if (error && conversations.length === 0) {
    return <ErrorState message={error} onRetry={() => void load()} />;
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={conversations}
      keyExtractor={(item) => item.connectionId}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />
      }
      ListEmptyComponent={
        <EmptyState message={copy.empty} icon="message-text-outline" />
      }
      renderItem={({ item }) => {
        const name = resolveMemberDisplayName(
          {
            fullName: item.member.fullName,
            profileCode: item.member.profileCode,
          },
          undefined,
          { member: copy.member, profileRef: (code) => `${copy.profileId} ${code}` },
        );
        const preview = messagePreviewText(item.lastMessage);
        const previewLabel = preview || copy.noMessagesYet;

        return (
          <Pressable
            style={styles.card}
            onPress={() =>
              navigation.navigate("ChatThread", {
                connectionId: item.connectionId,
                memberName: name,
                profileCode: item.member.profileCode,
              })
            }
          >
            <View style={styles.cardBody}>
              <View style={styles.headerRow}>
                <Text style={styles.name} numberOfLines={1}>
                  {name}
                </Text>
                {item.lastMessage ? (
                  <Text style={styles.time}>
                    {formatMessageTime(item.lastMessage.createdAt, locale)}
                  </Text>
                ) : null}
              </View>
              {item.member.profileCode ? (
                <Text style={styles.meta}>
                  {copy.profileId} {item.member.profileCode}
                </Text>
              ) : null}
              <Text style={styles.preview} numberOfLines={1}>
                {previewLabel}
              </Text>
            </View>
            {item.unreadCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {item.unreadCount > 99 ? "99+" : item.unreadCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  gateContainer: {
    flex: 1,
    backgroundColor: colors.rose50,
    padding: 16,
    justifyContent: "center",
  },
  container: { flex: 1, backgroundColor: colors.rose50 },
  content: { padding: 16, flexGrow: 1 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.rose100,
    padding: 14,
    marginBottom: 10,
  },
  cardBody: { flex: 1, minWidth: 0 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: colors.zinc900,
  },
  time: {
    fontSize: 11,
    color: colors.zinc500,
  },
  meta: {
    marginTop: 2,
    fontSize: 12,
    color: colors.zinc600,
  },
  preview: {
    marginTop: 4,
    fontSize: 13,
    color: colors.zinc600,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.rose800,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.white,
  },
  headerButton: {
    marginRight: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.white,
  },
});
