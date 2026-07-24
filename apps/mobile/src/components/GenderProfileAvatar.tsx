import { StyleSheet, View } from "react-native";

type Props = {
  gender?: string | null;
  size?: number;
};

type Palette = {
  bg: string;
  glow: string;
  figure: string;
};

function paletteFor(gender?: string | null): Palette {
  if (gender === "male") {
    return { bg: "#e0f2fe", glow: "#7dd3fc", figure: "#0369a1" };
  }
  if (gender === "female") {
    return { bg: "#ffe4e6", glow: "#fda4af", figure: "#be123c" };
  }
  return { bg: "#f4f4f5", glow: "#d4d4d8", figure: "#71717a" };
}

export function GenderProfileAvatar({ gender, size = 52 }: Props) {
  const palette = paletteFor(gender);
  const isFemale = gender === "female";
  const radius = Math.round(size * 0.24);
  const head = Math.round(size * 0.27);

  return (
    <View
      style={[
        styles.shell,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: palette.bg,
        },
      ]}
    >
      <View
        style={[
          styles.glow,
          {
            width: size * 0.78,
            height: size * 0.78,
            borderRadius: size * 0.39,
            backgroundColor: palette.glow,
            top: -size * 0.18,
            right: -size * 0.14,
          },
        ]}
      />
      <View style={[styles.figureWrap, { paddingTop: size * 0.1 }]}>
        {isFemale ? (
          <>
            <View
              style={{
                width: head * 1.45,
                height: head * 0.42,
                borderRadius: head,
                backgroundColor: palette.figure,
                opacity: 0.22,
                marginBottom: -head * 0.12,
              }}
            />
            <View
              style={{
                width: head,
                height: head,
                borderRadius: head / 2,
                backgroundColor: palette.figure,
                opacity: 0.92,
              }}
            />
            <View
              style={{
                width: size * 0.54,
                height: size * 0.3,
                borderTopLeftRadius: size * 0.17,
                borderTopRightRadius: size * 0.17,
                backgroundColor: palette.figure,
                opacity: 0.84,
                marginTop: size * 0.035,
              }}
            />
            <View
              style={{
                width: size * 0.6,
                height: size * 0.11,
                borderBottomLeftRadius: size * 0.08,
                borderBottomRightRadius: size * 0.08,
                backgroundColor: palette.figure,
                opacity: 0.58,
                marginTop: -1,
              }}
            />
          </>
        ) : (
          <>
            <View
              style={{
                width: head,
                height: head,
                borderRadius: head / 2,
                backgroundColor: palette.figure,
                opacity: 0.92,
              }}
            />
            <View
              style={{
                width: size * 0.5,
                height: size * 0.34,
                borderTopLeftRadius: size * 0.14,
                borderTopRightRadius: size * 0.14,
                backgroundColor: palette.figure,
                opacity: 0.84,
                marginTop: size * 0.035,
              }}
            />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.85)",
    shadowColor: "#881337",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  glow: {
    position: "absolute",
    opacity: 0.35,
  },
  figureWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
  },
});
