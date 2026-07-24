import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";

export function MediaCaptureActions({
  takePhotoLabel,
  chooseGalleryLabel,
  chooseFileLabel,
  onTakePhoto,
  onChooseGallery,
  onChooseFile,
  disabled,
  emphasizeCamera = false,
}: {
  takePhotoLabel: string;
  chooseGalleryLabel: string;
  chooseFileLabel?: string;
  onTakePhoto: () => void;
  onChooseGallery: () => void;
  onChooseFile?: () => void;
  disabled?: boolean;
  emphasizeCamera?: boolean;
}) {
  return (
    <View style={styles.wrap}>
      <Pressable
        style={[
          styles.primaryButton,
          emphasizeCamera && styles.primaryEmphasis,
          disabled && styles.disabled,
        ]}
        onPress={onTakePhoto}
        disabled={disabled}
      >
        <Text style={styles.primaryText}>{takePhotoLabel}</Text>
      </Pressable>
      <Pressable
        style={[styles.secondaryButton, disabled && styles.disabled]}
        onPress={onChooseGallery}
        disabled={disabled}
      >
        <Text style={styles.secondaryText}>{chooseGalleryLabel}</Text>
      </Pressable>
      {chooseFileLabel && onChooseFile ? (
        <Pressable
          style={[styles.secondaryButton, disabled && styles.disabled]}
          onPress={onChooseFile}
          disabled={disabled}
        >
          <Text style={styles.secondaryText}>{chooseFileLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8, gap: 8 },
  primaryButton: {
    borderRadius: 999,
    backgroundColor: colors.rose800,
    paddingVertical: 11,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  primaryEmphasis: {
    paddingVertical: 13,
  },
  primaryText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 14,
  },
  secondaryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.rose800,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    backgroundColor: colors.white,
  },
  secondaryText: {
    color: colors.rose800,
    fontWeight: "700",
    fontSize: 14,
  },
  disabled: { opacity: 0.6 },
});
