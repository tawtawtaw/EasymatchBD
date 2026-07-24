import { FontAwesome5 } from "@expo/vector-icons";
import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tWhatsappSupport } from "../i18n/whatsapp-support";
import { openWhatsAppSupportChat } from "../lib/open-whatsapp-support";
import {
  useActiveRouteName,
  WHATSAPP_FAB_HIDDEN_ROUTES,
} from "../navigation/active-route";
import {
  isWhatsAppSupportEnabled,
  WHATSAPP_SUPPORT_TOPICS,
  type WhatsAppSupportTopic,
} from "../lib/whatsapp-support";
import { useLocaleStore } from "../store/localeStore";
import { colors } from "../theme/colors";

export function WhatsAppSupportFab() {
  const locale = useLocaleStore((s) => s.locale);
  const copy = tWhatsappSupport(locale);
  const insets = useSafeAreaInsets();
  const activeRoute = useActiveRouteName();
  const [open, setOpen] = useState(false);

  if (!isWhatsAppSupportEnabled()) return null;
  if (activeRoute && WHATSAPP_FAB_HIDDEN_ROUTES.has(activeRoute)) return null;

  async function handleTopic(topic: WhatsAppSupportTopic) {
    setOpen(false);
    await openWhatsAppSupportChat(locale, topic);
  }

  return (
    <>
      <Pressable
        style={[styles.fab, { bottom: Math.max(insets.bottom, 12) + 64 }]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={copy.open}
      >
        <FontAwesome5 name="whatsapp" size={26} color={colors.white} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderText}>
                <Text style={styles.sheetTitle}>{copy.panelTitle}</Text>
                <Text style={styles.sheetSubtitle}>{copy.panelSubtitle}</Text>
              </View>
              <Pressable
                onPress={() => setOpen(false)}
                accessibilityRole="button"
                accessibilityLabel={copy.close}
              >
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.topicList} contentContainerStyle={styles.topicContent}>
              <Text style={styles.topicsLabel}>{copy.quickTopics}</Text>
              {WHATSAPP_SUPPORT_TOPICS.map((topic) => (
                <Pressable
                  key={topic}
                  style={styles.topicRow}
                  onPress={() => void handleTopic(topic)}
                >
                  <Text style={styles.topicLabel}>{copy.topics[topic].label}</Text>
                  <Text style={styles.topicArrow}>→</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Pressable
              style={styles.chatButton}
              onPress={() => void handleTopic("general")}
            >
              <FontAwesome5 name="whatsapp" size={18} color={colors.white} />
              <Text style={styles.chatButtonText}>{copy.chatNow}</Text>
            </Pressable>
            <Text style={styles.footerNote}>{copy.opensWhatsApp}</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 16,
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 28,
    backgroundColor: "#059669",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    zIndex: 100,
  },
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    maxHeight: "78%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: colors.white,
    overflow: "hidden",
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#059669",
  },
  sheetHeaderText: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.white,
  },
  sheetSubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: "#ecfdf5",
  },
  closeText: {
    color: "#ecfdf5",
    fontSize: 18,
    paddingHorizontal: 4,
  },
  topicList: {
    maxHeight: 320,
  },
  topicContent: {
    padding: 16,
    gap: 8,
  },
  topicsLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.zinc500,
    marginBottom: 4,
  },
  topicRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.zinc100,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.white,
  },
  topicLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.zinc800,
  },
  topicArrow: {
    color: "#059669",
    fontWeight: "700",
  },
  chatButton: {
    marginHorizontal: 16,
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    backgroundColor: "#059669",
    paddingVertical: 14,
  },
  chatButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
  footerNote: {
    marginTop: 8,
    marginBottom: 4,
    textAlign: "center",
    fontSize: 11,
    color: colors.zinc500,
    paddingHorizontal: 16,
  },
});
