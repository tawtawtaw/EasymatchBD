import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme/colors";

type Props = {
  visible: boolean;
  uri: string | null;
  title: string;
  hint: string;
  confirmLabel: string;
  retakeLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onRetake: () => void;
  onCancel: () => void;
};

export function PhotoConfirmModal({
  visible,
  uri,
  title,
  hint,
  confirmLabel,
  retakeLabel,
  cancelLabel,
  onConfirm,
  onRetake,
  onCancel,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
      transparent={false}
    >
      <View style={[styles.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.hint}>{hint}</Text>
        <View style={styles.previewWrap}>
          {uri ? (
            <Image source={{ uri }} style={styles.preview} resizeMode="contain" />
          ) : null}
        </View>
        <Pressable style={styles.primaryButton} onPress={onConfirm}>
          <Text style={styles.primaryText}>{confirmLabel}</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={onRetake}>
          <Text style={styles.secondaryText}>{retakeLabel}</Text>
        </Pressable>
        <Pressable onPress={onCancel}>
          <Text style={styles.cancelText}>{cancelLabel}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.zinc900,
    paddingHorizontal: 20,
    gap: 12,
  },
  title: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  hint: {
    color: "#e4e4e7",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  previewWrap: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#18181b",
  },
  preview: {
    width: "100%",
    height: "100%",
  },
  primaryButton: {
    borderRadius: 999,
    backgroundColor: colors.rose800,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 16,
  },
  secondaryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.white,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 15,
  },
  cancelText: {
    color: "#a1a1aa",
    fontWeight: "600",
    fontSize: 15,
    textAlign: "center",
    paddingVertical: 8,
  },
});
