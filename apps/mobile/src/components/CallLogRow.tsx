import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  formatVideoCallDuration,
  formatVideoCallLogWhen,
  isHighlightedMissedCall,
  videoCallDurationSeconds,
  videoCallLogTitleKey,
  videoCallOccurredAt,
} from "@easymatch/shared";
import type { VideoCallsCopy } from "../i18n/video-calls";
import type { AppLocale } from "../lib/locale";
import type { VideoCallItem } from "../types/video-calls";
import { colors } from "../theme/colors";

type Props = {
  call: VideoCallItem;
  locale: AppLocale;
  copy: VideoCallsCopy;
  partnerName?: string | null;
  showPartner?: boolean;
  canCallBack?: boolean;
  calling?: boolean;
  onCallAgain?: () => void;
};

export function CallLogRow({
  call,
  locale,
  copy,
  partnerName,
  showPartner = false,
  canCallBack = true,
  calling = false,
  onCallAgain,
}: Props) {
  const missed = isHighlightedMissedCall(call.status);
  const titleKey = videoCallLogTitleKey(call.status);
  const occurredAt = videoCallOccurredAt(call);
  const duration = videoCallDurationSeconds(call.startedAt, call.endedAt);
  const direction = call.isInitiator ? copy.log.outgoing : copy.log.incoming;
  const detail = duration
    ? `${direction} · ${formatVideoCallDuration(duration)}`
    : direction;
  const nameColor = missed ? "#b91c1c" : colors.zinc900;
  const titleColor =
    showPartner && partnerName
      ? colors.zinc500
      : missed
        ? "#b91c1c"
        : colors.zinc800;

  return (
    <View style={styles.row}>
      <View style={[styles.icon, missed && styles.iconMissed]}>
        <MaterialCommunityIcons
          name="video-outline"
          size={20}
          color={missed ? "#dc2626" : colors.zinc600}
        />
      </View>
      <View style={styles.body}>
        {showPartner && partnerName ? (
          <Text style={[styles.partner, { color: nameColor }]} numberOfLines={1}>
            {partnerName}
          </Text>
        ) : null}
        <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
          {copy.log[titleKey]}
        </Text>
        <Text style={styles.detail} numberOfLines={1}>
          {detail}
        </Text>
      </View>
      <Text style={styles.when}>
        {formatVideoCallLogWhen(occurredAt, locale, copy.log.yesterday)}
      </Text>
      {canCallBack && onCallAgain ? (
        <Pressable
          onPress={onCallAgain}
          disabled={calling}
          hitSlop={8}
          accessibilityLabel={copy.log.callAgain}
          style={[styles.callBack, calling && styles.disabled]}
        >
          <MaterialCommunityIcons name="video" size={20} color={colors.rose800} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.zinc100,
  },
  iconMissed: {
    backgroundColor: "#fef2f2",
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  partner: {
    fontSize: 15,
    fontWeight: "700",
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
  },
  detail: {
    fontSize: 12,
    color: colors.zinc500,
  },
  when: {
    fontSize: 12,
    color: colors.zinc500,
  },
  callBack: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.5,
  },
});
