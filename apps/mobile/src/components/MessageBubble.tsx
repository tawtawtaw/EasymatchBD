import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { MessagesCopy } from "../i18n/messages";
import { canDeleteMessage, canEditMessage, canManageMessage } from "../lib/message-actions";
import { formatMessageTime } from "../lib/messages-display";
import {
  deleteConnectionMessage,
  downloadMessageAttachment,
  messageAttachmentUrl,
  updateConnectionMessage,
} from "../services/messages";
import { sessionStorage } from "../services/session-storage";
import type { MessageItem } from "../types/messages";
import { colors } from "../theme/colors";

type Copy = MessagesCopy;

type Props = {
  message: MessageItem;
  connectionId: string;
  locale: "en" | "bn";
  copy: Copy;
  onUpdated: (message: MessageItem) => void;
  onError: (message: string) => void;
};

export function MessageBubble({
  message,
  connectionId,
  locale,
  copy,
  onUpdated,
  onError,
}: Props) {
  const isMine = message.isMine;
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(message.body ?? "");
  const [busy, setBusy] = useState(false);

  const statusLabel =
    message.deliveryStatus === "read"
      ? copy.statusRead
      : message.deliveryStatus === "delivered"
        ? copy.statusDelivered
        : null;

  function showActions() {
    const options: { text: string; style?: "cancel" | "destructive"; onPress?: () => void }[] =
      [];

    if (canEditMessage(message)) {
      options.push({
        text: copy.edit,
        onPress: () => {
          setEditDraft(message.body ?? "");
          setEditing(true);
        },
      });
    }

    if (canDeleteMessage(message)) {
      options.push({
        text: copy.delete,
        style: "destructive",
        onPress: () => {
          Alert.alert(copy.confirmDeleteTitle, copy.confirmDeleteMessage, [
            { text: copy.cancel, style: "cancel" },
            {
              text: copy.delete,
              style: "destructive",
              onPress: () => void remove(),
            },
          ]);
        },
      });
    }

    if (options.length === 0) {
      return;
    }

    options.push({ text: copy.cancel, style: "cancel" });

    Alert.alert(copy.messageActions, undefined, options);
  }

  async function saveEdit() {
    const body = editDraft.trim();
    if (!body) return;
    setBusy(true);
    try {
      const updated = await updateConnectionMessage(connectionId, message.id, body);
      onUpdated(updated);
      setEditing(false);
    } catch {
      onError(copy.editError);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const updated = await deleteConnectionMessage(connectionId, message.id);
      onUpdated(updated);
    } catch {
      onError(copy.deleteError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.row, isMine ? styles.rowMine : styles.rowTheirs]}>
      {isMine && !message.isDeleted && !editing && canManageMessage(message) ? (
        <Pressable style={styles.menuButton} onPress={showActions} disabled={busy}>
          <Text style={styles.menuText}>⋮</Text>
        </Pressable>
      ) : null}

      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
        {message.isDeleted ? (
          <Text style={[styles.text, isMine && styles.textMine, styles.deleted]}>
            {copy.deletedMessage}
          </Text>
        ) : editing ? (
          <View style={styles.editBlock}>
            <TextInput
              style={[styles.editInput, isMine && styles.editInputMine]}
              value={editDraft}
              onChangeText={setEditDraft}
              multiline
              maxLength={2000}
              editable={!busy}
            />
            <View style={styles.editActions}>
              <Pressable
                style={[styles.editActionBtn, busy && styles.disabled]}
                onPress={() => void saveEdit()}
                disabled={busy || !editDraft.trim()}
              >
                <Text style={[styles.editActionText, isMine && styles.textMine]}>
                  {copy.saveEdit}
                </Text>
              </Pressable>
              <Pressable
                style={styles.editActionBtn}
                onPress={() => setEditing(false)}
                disabled={busy}
              >
                <Text style={[styles.editActionText, isMine && styles.textMine]}>
                  {copy.cancelEdit}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : message.messageType === "image" ? (
          <>
            <MessageAttachmentImage
              connectionId={connectionId}
              messageId={message.id}
              copy={copy}
              isMine={isMine}
              onError={onError}
            />
            {message.body?.trim() ? (
              <Text style={[styles.text, isMine && styles.textMine, styles.caption]}>
                {message.body}
              </Text>
            ) : null}
          </>
        ) : message.messageType === "file" ? (
          <MessageFileAttachment
            message={message}
            connectionId={connectionId}
            copy={copy}
            isMine={isMine}
            onError={onError}
          />
        ) : (
          <Text style={[styles.text, isMine && styles.textMine]}>{message.body ?? ""}</Text>
        )}

        {!editing ? (
          <View style={styles.metaRow}>
            <Text style={[styles.time, isMine && styles.timeMine]}>
              {formatMessageTime(message.createdAt, locale)}
              {message.isEdited ? ` · ${copy.edited}` : ""}
            </Text>
            {isMine && statusLabel ? (
              <Text style={[styles.status, isMine && styles.timeMine]}>{statusLabel}</Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function MessageAttachmentImage({
  connectionId,
  messageId,
  copy,
  isMine,
  onError,
}: {
  connectionId: string;
  messageId: string;
  copy: Copy;
  isMine: boolean;
  onError: (message: string) => void;
}) {
  const uri = messageAttachmentUrl(connectionId, messageId);
  const [headers, setHeaders] = useState<Record<string, string> | null>(null);
  const [failed, setFailed] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    void sessionStorage.getAccessToken().then((token) => {
      if (token) {
        setHeaders({ Authorization: `Bearer ${token}` });
      }
    });
  }, [uri]);

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadMessageAttachment(connectionId, messageId, `photo-${messageId}.jpg`);
    } catch {
      onError(copy.downloadError);
    } finally {
      setDownloading(false);
    }
  }

  if (failed) {
    return <Text style={styles.attachmentFallback}>{copy.attachmentUnavailable}</Text>;
  }

  if (!headers) {
    return <Text style={styles.attachmentFallback}>{copy.loadingAttachment}</Text>;
  }

  return (
    <>
      <Pressable onPress={() => setFullscreen(true)} onLongPress={() => void handleDownload()}>
        <Image
          source={{ uri, headers }}
          style={styles.attachmentImage}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      </Pressable>
      <Pressable
        style={styles.downloadLink}
        onPress={() => void handleDownload()}
        disabled={downloading}
      >
        <Text style={[styles.downloadLinkText, isMine && styles.timeMine]}>
          {downloading ? copy.downloadingAttachment : copy.downloadAttachment}
        </Text>
      </Pressable>

      <Modal visible={fullscreen} transparent animationType="fade" onRequestClose={() => setFullscreen(false)}>
        <Pressable style={styles.fullscreenBackdrop} onPress={() => setFullscreen(false)}>
          <Image source={{ uri, headers }} style={styles.fullscreenImage} resizeMode="contain" />
        </Pressable>
      </Modal>
    </>
  );
}

function MessageFileAttachment({
  message,
  connectionId,
  copy,
  isMine,
  onError,
}: {
  message: MessageItem;
  connectionId: string;
  copy: Copy;
  isMine: boolean;
  onError: (message: string) => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const fileName = message.attachment?.fileName ?? copy.fileMessage;

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadMessageAttachment(connectionId, message.id, fileName);
    } catch {
      onError(copy.downloadError);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <Pressable
        style={[styles.fileRow, isMine && styles.fileRowMine]}
        onPress={() => void handleDownload()}
        disabled={downloading}
      >
        {downloading ? (
          <ActivityIndicator size="small" color={isMine ? colors.white : colors.rose800} />
        ) : (
          <Text style={[styles.fileIcon, isMine && styles.textMine]}>📎</Text>
        )}
        <Text style={[styles.fileName, isMine && styles.textMine]} numberOfLines={2}>
          {message.body?.trim() || fileName}
        </Text>
      </Pressable>
      {!downloading ? (
        <Text style={[styles.downloadHint, isMine && styles.timeMine]}>
          {copy.tapToDownload}
        </Text>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
  },
  rowMine: {
    justifyContent: "flex-end",
  },
  rowTheirs: {
    justifyContent: "flex-start",
  },
  menuButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.rose100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  menuText: {
    fontSize: 16,
    color: colors.zinc600,
    lineHeight: 18,
  },
  bubble: {
    maxWidth: "82%",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bubbleMine: {
    backgroundColor: colors.rose800,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.rose100,
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.zinc900,
  },
  textMine: {
    color: colors.white,
  },
  deleted: {
    fontStyle: "italic",
    opacity: 0.85,
  },
  caption: {
    marginTop: 6,
  },
  editBlock: {
    gap: 8,
  },
  editInput: {
    minHeight: 60,
    borderWidth: 1,
    borderColor: colors.rose100,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
    color: colors.zinc900,
    backgroundColor: colors.white,
  },
  editInputMine: {
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "rgba(255,255,255,0.12)",
    color: colors.white,
  },
  editActions: {
    flexDirection: "row",
    gap: 12,
  },
  editActionBtn: {
    paddingVertical: 4,
  },
  editActionText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.rose800,
  },
  disabled: {
    opacity: 0.5,
  },
  attachmentImage: {
    width: 220,
    height: 160,
    borderRadius: 12,
    backgroundColor: colors.rose100,
  },
  attachmentFallback: {
    fontSize: 12,
    color: colors.zinc500,
    fontStyle: "italic",
  },
  downloadLink: {
    marginTop: 6,
  },
  downloadLinkText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.rose800,
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  fileRowMine: {},
  fileIcon: {
    fontSize: 18,
  },
  fileName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: colors.zinc900,
  },
  downloadHint: {
    marginTop: 4,
    fontSize: 11,
    color: colors.zinc500,
  },
  metaRow: {
    marginTop: 4,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
  },
  time: {
    fontSize: 10,
    color: colors.zinc500,
  },
  timeMine: {
    color: "rgba(255,255,255,0.75)",
  },
  status: {
    fontSize: 10,
    fontWeight: "600",
  },
  fullscreenBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenImage: {
    width: "100%",
    height: "80%",
  },
});
