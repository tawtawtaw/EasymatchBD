import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AuthenticatedImage } from "./AuthenticatedImage";
import { profilePhotoUrl } from "../services/media";
import { colors } from "../theme/colors";

type Props = {
  photoId?: string | null;
  name?: string | null;
  gender?: string | null;
  size?: number;
};

export function MemberProfileAvatar({
  photoId,
  name,
  gender,
  size = 64,
}: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const radius = Math.round(size * 0.2);
  const style = { width: size, height: size, borderRadius: radius };

  useEffect(() => {
    setImageFailed(false);
  }, [photoId]);

  if (photoId && !imageFailed) {
    return (
      <AuthenticatedImage
        path={profilePhotoUrl(photoId)}
        style={style}
        onError={() => setImageFailed(true)}
      />
    );
  }

  const trimmed = name?.trim();
  const initial = trimmed
    ? trimmed.charAt(0).toUpperCase()
    : gender === "female"
      ? "F"
      : gender === "male"
        ? "M"
        : "?";

  return (
    <View style={[styles.placeholder, style]}>
      <Text style={[styles.initial, { fontSize: Math.round(size * 0.38) }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: colors.rose100,
    alignItems: "center",
    justifyContent: "center",
  },
  initial: {
    fontWeight: "800",
    color: colors.rose800,
  },
});
