import { useFocusEffect } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MessageBubble } from "../../components/MessageBubble";
import { PaidMembershipGate } from "../../components/PaidMembershipGate";
import { PartnerPausedBanner, ProfilePausedBanner } from "../../components/ProfilePausedBanner";
import { VideoCallPanel } from "../../components/VideoCallPanel";
import { ErrorState, LoadingState } from "../../components/ScreenState";
import { useIsPaidMember } from "../../hooks/use-is-paid-member";
import { tMessages, tEndConnection, tProfileAccountStatus } from "../../i18n/messages";
import { getApiErrorMessage } from "../../lib/api-error";
import { confirmEndConnection } from "../../lib/end-connection";
import { getConnectionPrivacyLevel } from "../../lib/connection-privacy";
import type { ChatThreadScreenProps } from "../../navigation/types";
import { endConnection } from "../../services/discovery";
import {
  listConnectionMessages,
  sendConnectionAttachment,
  sendConnectionMessage,
  setConnectionTyping,
} from "../../services/messages";
import { useAuthStore } from "../../store/authStore";
import { useLocaleStore } from "../../store/localeStore";
import type { MessageItem } from "../../types/messages";
import { colors } from "../../theme/colors";

const POLL_MS = 8_000;
const TYPING_THROTTLE_MS = 2_500;

export default function ChatThreadScreen({ route, navigation }: ChatThreadScreenProps) {
  const { connectionId, memberName } = route.params;
  const locale = useLocaleStore((s) => s.locale);
  const session = useAuthStore((s) => s.session);
  const insets = useSafeAreaInsets();
  const isPaid = useIsPaidMember();
  const copy = tMessages(locale);
  const endCopy = tEndConnection(locale);
  const accountCopy = tProfileAccountStatus(locale);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [privacyLevel, setPrivacyLevel] = useState(1);
  const [viewerIsPaused, setViewerIsPaused] = useState(Boolean(session?.isPaused));
  const [partnerIsPaused, setPartnerIsPaused] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const listRef = useRef<FlatList<MessageItem>>(null);
  const typingSentAtRef = useRef(0);
  const latestMessageAtRef = useRef<string | null>(null);

  function mergeMessages(current: MessageItem[], incoming: MessageItem[]) {
    if (incoming.length === 0) return current;
    const byId = new Map(current.map((message) => [message.id, message]));
    for (const message of incoming) {
      byId.set(message.id, message);
    }
    return [...byId.values()].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }

  function trackLatestMessage(messages: MessageItem[]) {
    const last = messages[messages.length - 1];
    latestMessageAtRef.current = last?.createdAt ?? null;
  }

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const composerBottomInset = keyboardHeight > 0 ? keyboardHeight : insets.bottom;

  const loadPrivacyLevel = useCallback(async () => {
    try {
      const level = await getConnectionPrivacyLevel(connectionId);
      setPrivacyLevel(level);
    } catch {
      setPrivacyLevel(1);
    }
  }, [connectionId]);

  function handleEndConnection() {
    confirmEndConnection(endCopy, privacyLevel, () => {
      void (async () => {
        try {
          await endConnection(connectionId);
          navigation.goBack();
        } catch (err) {
          setError(getApiErrorMessage(err, endCopy.error));
        }
      })();
    });
  }

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={handleEndConnection} hitSlop={8}>
          <Text style={styles.headerEndText}>{endCopy.button}</Text>
        </Pressable>
      ),
    });
  }, [endCopy.button, navigation, privacyLevel]);

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!isPaid) return;
      if (!options?.silent) {
        setLoading(true);
      }
      setError(null);
      try {
        const since = options?.silent ? latestMessageAtRef.current : null;
        const thread = since
          ? await listConnectionMessages(connectionId, { since })
          : await listConnectionMessages(connectionId);

        if (since && thread.messages.length > 0) {
          setMessages((current) => {
            const merged = mergeMessages(current, thread.messages);
            trackLatestMessage(merged);
            return merged;
          });
        } else if (!since) {
          setMessages(thread.messages);
          trackLatestMessage(thread.messages);
          setHasMore(thread.hasMore);
        }

        setPartnerTyping(thread.partnerTyping);
        if (typeof thread.viewerIsPaused === "boolean") {
          setViewerIsPaused(thread.viewerIsPaused);
        }
        if (typeof thread.partnerIsPaused === "boolean") {
          setPartnerIsPaused(thread.partnerIsPaused);
        }
      } catch (err) {
        if (!options?.silent) {
          setError(getApiErrorMessage(err, copy.threadLoadError));
        }
      } finally {
        if (!options?.silent) {
          setLoading(false);
        }
      }
    },
    [connectionId, copy.threadLoadError, isPaid],
  );

  useFocusEffect(
    useCallback(() => {
      if (!isPaid) return;
      setViewerIsPaused(Boolean(session?.isPaused));
      void loadPrivacyLevel();
      void load();
      const interval = setInterval(() => {
        void load({ silent: true });
      }, POLL_MS);
      return () => clearInterval(interval);
    }, [isPaid, load, loadPrivacyLevel, session?.isPaused]),
  );

  function openVideoCall(callId: string) {
    navigation.navigate("VideoCallRoom", {
      connectionId,
      callId,
      memberName,
    });
  }

  if (!isPaid) {
    return (
      <View style={styles.gateContainer}>
        <PaidMembershipGate feature="messages" locale={locale} />
      </View>
    );
  }

  async function loadOlder() {
    if (!messages.length || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const older = await listConnectionMessages(connectionId, {
        before: messages[0]?.createdAt,
        markRead: false,
      });
      setMessages((current) => [...older.messages, ...current]);
      setHasMore(older.hasMore);
    } catch (err) {
      setError(getApiErrorMessage(err, copy.threadLoadError));
    } finally {
      setLoadingMore(false);
    }
  }

  function notifyTyping() {
    const now = Date.now();
    if (now - typingSentAtRef.current < TYPING_THROTTLE_MS) return;
    typingSentAtRef.current = now;
    void setConnectionTyping(connectionId);
  }

  async function handleSend() {
    const body = draft.trim();
    if (!body || sending) return;

    setSending(true);
    setDraft("");
    try {
      const message = await sendConnectionMessage(connectionId, body);
      setMessages((current) => {
        const merged = mergeMessages(current, [message]);
        trackLatestMessage(merged);
        return merged;
      });
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    } catch (err) {
      setDraft(body);
      setError(getApiErrorMessage(err, copy.sendError));
    } finally {
      setSending(false);
    }
  }

  const handleMessageUpdated = useCallback((updated: MessageItem) => {
    setMessages((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  }, []);

  function showAttachOptions() {
    Alert.alert(copy.attachTitle, undefined, [
      { text: copy.attachPhoto, onPress: () => void handleAttachPhoto() },
      { text: copy.attachDocument, onPress: () => void handleAttachDocument() },
      { text: copy.cancel, style: "cancel" },
    ]);
  }

  async function handleAttachPhoto() {
    if (sending) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(copy.photoPermissionDenied);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setSending(true);
    setError(null);
    try {
      const message = await sendConnectionAttachment(
        connectionId,
        {
          uri: asset.uri,
          name: asset.fileName ?? `photo-${Date.now()}.jpg`,
          type: asset.mimeType ?? "image/jpeg",
        },
        draft.trim() || undefined,
      );
      setMessages((current) => {
        const merged = mergeMessages(current, [message]);
        trackLatestMessage(merged);
        return merged;
      });
      setDraft("");
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    } catch (err) {
      setError(getApiErrorMessage(err, copy.attachError));
    } finally {
      setSending(false);
    }
  }

  async function handleAttachDocument() {
    if (sending) return;

    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/*"],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setSending(true);
    setError(null);
    try {
      const message = await sendConnectionAttachment(
        connectionId,
        {
          uri: asset.uri,
          name: asset.name ?? `file-${Date.now()}.pdf`,
          type: asset.mimeType ?? "application/pdf",
        },
        draft.trim() || undefined,
      );
      setMessages((current) => {
        const merged = mergeMessages(current, [message]);
        trackLatestMessage(merged);
        return merged;
      });
      setDraft("");
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    } catch (err) {
      setError(getApiErrorMessage(err, copy.documentAttachError));
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <LoadingState label={copy.threadLoading} />;
  }

  if (error && messages.length === 0) {
    return <ErrorState message={error} onRetry={() => void load()} />;
  }

  return (
    <View style={styles.container}>
      {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

      <FlatList
        ref={listRef}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={messages}
        keyExtractor={(item) => item.id}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListHeaderComponent={
          <>
            {viewerIsPaused ? (
              <View style={styles.bannerWrap}>
                <ProfilePausedBanner locale={locale} />
              </View>
            ) : null}
            {!viewerIsPaused && partnerIsPaused ? (
              <View style={styles.bannerWrap}>
                <PartnerPausedBanner locale={locale} />
              </View>
            ) : null}
            {!viewerIsPaused ? (
              <VideoCallPanel
                connectionId={connectionId}
                privacyLevel={privacyLevel}
                memberName={memberName}
                locale={locale}
                onOpenCall={openVideoCall}
              />
            ) : null}
            <Pressable
              style={styles.endConnectionButton}
              onPress={handleEndConnection}
            >
              <Text style={styles.endConnectionText}>{endCopy.button}</Text>
            </Pressable>
            {hasMore ? (
              <Pressable
                style={styles.loadOlder}
                onPress={() => void loadOlder()}
                disabled={loadingMore}
              >
                <Text style={styles.loadOlderText}>
                  {loadingMore ? copy.loadingOlder : copy.loadOlder}
                </Text>
              </Pressable>
            ) : null}
          </>
        }
        renderItem={({ item }) => (
          <MessageBubble
            message={item}
            connectionId={connectionId}
            locale={locale}
            copy={copy}
            onUpdated={handleMessageUpdated}
            onError={setError}
          />
        )}
        ListEmptyComponent={<Text style={styles.emptyThread}>{copy.threadEmpty}</Text>}
      />

      {partnerTyping ? <Text style={styles.typing}>{copy.typing}</Text> : null}

      {viewerIsPaused ? (
        <View style={[styles.pausedComposerWrap, { paddingBottom: composerBottomInset }]}>
          <Text style={styles.pausedComposerText}>{accountCopy.composerDisabled}</Text>
        </View>
      ) : (
        <View style={[styles.composerWrap, { paddingBottom: composerBottomInset }]}>
          <View style={styles.composer}>
            <Pressable
              style={[styles.attachButton, sending && styles.sendDisabled]}
              onPress={showAttachOptions}
              disabled={sending}
            >
              <Text style={styles.attachText}>📷</Text>
            </Pressable>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={(text) => {
                setDraft(text);
                notifyTyping();
              }}
              onFocus={() => {
                requestAnimationFrame(() => {
                  listRef.current?.scrollToEnd({ animated: true });
                });
              }}
              placeholder={copy.inputPlaceholder}
              placeholderTextColor={colors.zinc500}
              multiline
              maxLength={2000}
              editable={!sending}
            />
            <Pressable
              style={[styles.sendButton, (!draft.trim() || sending) && styles.sendDisabled]}
              onPress={() => void handleSend()}
              disabled={!draft.trim() || sending}
            >
              <Text style={styles.sendText}>{sending ? copy.sending : copy.send}</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  gateContainer: {
    flex: 1,
    backgroundColor: colors.rose50,
    padding: 16,
    justifyContent: "center",
  },
  container: {
    flex: 1,
    backgroundColor: colors.rose50,
  },
  errorBanner: {
    padding: 10,
    backgroundColor: "#fef2f2",
    color: colors.red600,
    fontSize: 13,
    textAlign: "center",
  },
  list: { flex: 1 },
  headerEndText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.zinc800,
    paddingHorizontal: 4,
  },
  endConnectionButton: {
    alignSelf: "flex-start",
    marginBottom: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.zinc100,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  endConnectionText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.zinc800,
  },
  listContent: {
    padding: 16,
    paddingBottom: 8,
    flexGrow: 1,
  },
  loadOlder: {
    alignSelf: "center",
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.rose100,
  },
  loadOlderText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.rose800,
  },
  emptyThread: {
    textAlign: "center",
    marginTop: 40,
    fontSize: 14,
    color: colors.zinc600,
  },
  typing: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    fontSize: 12,
    color: colors.zinc500,
    fontStyle: "italic",
  },
  bannerWrap: {
    marginBottom: 12,
  },
  pausedComposerWrap: {
    backgroundColor: "#fffbeb",
    borderTopWidth: 1,
    borderTopColor: "#fcd34d",
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  pausedComposerText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#92400e",
    textAlign: "center",
  },
  composerWrap: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.rose100,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: colors.white,
  },
  attachButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.rose50,
    borderWidth: 1,
    borderColor: colors.rose100,
    alignItems: "center",
    justifyContent: "center",
  },
  attachText: {
    fontSize: 18,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.rose100,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.zinc900,
    backgroundColor: colors.rose50,
  },
  sendButton: {
    borderRadius: 999,
    backgroundColor: colors.rose800,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sendDisabled: {
    opacity: 0.5,
  },
  sendText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
});
