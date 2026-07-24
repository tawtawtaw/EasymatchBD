import { useCallback, useEffect, useState } from "react";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MIN_VIDEO_CALL_PRIVACY_LEVEL } from "@easymatch/shared";
import { PaidMembershipGate } from "./PaidMembershipGate";
import { useIsPaidMember } from "../hooks/use-is-paid-member";
import { tVideoCalls } from "../i18n/video-calls";
import { getApiErrorMessage } from "../lib/api-error";
import { formatVideoCallWhen } from "../lib/video-call-url";
import type { AppLocale } from "../lib/locale";
import {
  canJoinScheduledCall,
  cancelVideoCall,
  createVideoCall,
  listConnectionVideoCalls,
  rescheduleVideoCall,
  startScheduledVideoCall,
} from "../services/video-calls";
import type { VideoCallItem } from "../types/video-calls";
import { colors } from "../theme/colors";

type Props = {
  connectionId: string;
  privacyLevel: number;
  memberName: string;
  locale: AppLocale;
  onOpenCall: (callId: string) => void;
};

function minScheduleDate(): Date {
  return new Date(Date.now() + 5 * 60 * 1000);
}

export function VideoCallPanel({
  connectionId,
  privacyLevel,
  memberName,
  locale,
  onOpenCall,
}: Props) {
  const copy = tVideoCalls(locale);
  const isPaid = useIsPaidMember();
  const videoEnabled = privacyLevel >= MIN_VIDEO_CALL_PRIVACY_LEVEL;
  const [calls, setCalls] = useState<VideoCallItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d;
  });
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [rescheduleCallId, setRescheduleCallId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<Date>(() => minScheduleDate());
  const [showReschedulePicker, setShowReschedulePicker] = useState(false);

  const refresh = useCallback(async () => {
    if (!videoEnabled || !isPaid) return;
    try {
      const list = await listConnectionVideoCalls(connectionId);
      setCalls(list);
    } catch {
      /* ignore background refresh errors */
    }
  }, [connectionId, isPaid, videoEnabled]);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), 4_000);
    return () => clearInterval(interval);
  }, [refresh]);

  async function handleCallNow() {
    setLoading(true);
    setError(null);
    try {
      const call = await createVideoCall(connectionId);
      onOpenCall(call.id);
    } catch (err) {
      setError(getApiErrorMessage(err, copy.actionsError));
    } finally {
      setLoading(false);
    }
  }

  async function handleSchedule() {
    setLoading(true);
    setError(null);
    try {
      await createVideoCall(connectionId, scheduleDate.toISOString());
      setShowSchedulePicker(false);
      await refresh();
    } catch (err) {
      setError(getApiErrorMessage(err, copy.actionsError));
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinScheduled(call: VideoCallItem) {
    setLoading(true);
    setError(null);
    try {
      let activeCall = call;
      if (
        call.scheduledAt &&
        (call.status === "scheduled" || call.status === "ringing")
      ) {
        activeCall = await startScheduledVideoCall(call.id);
      }
      onOpenCall(activeCall.id);
    } catch (err) {
      setError(getApiErrorMessage(err, copy.actionsError));
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(callId: string) {
    setLoading(true);
    setError(null);
    try {
      await cancelVideoCall(callId);
      if (rescheduleCallId === callId) {
        setRescheduleCallId(null);
      }
      await refresh();
    } catch (err) {
      setError(getApiErrorMessage(err, copy.actionsError));
    } finally {
      setLoading(false);
    }
  }

  async function handleReschedule(callId: string) {
    setLoading(true);
    setError(null);
    try {
      await rescheduleVideoCall(callId, rescheduleDate.toISOString());
      setRescheduleCallId(null);
      setShowReschedulePicker(false);
      await refresh();
    } catch (err) {
      setError(getApiErrorMessage(err, copy.actionsError));
    } finally {
      setLoading(false);
    }
  }

  function onSchedulePickerChange(_event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === "android") {
      setShowSchedulePicker(false);
    }
    if (date) {
      setScheduleDate(date);
    }
  }

  function onReschedulePickerChange(_event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === "android") {
      setShowReschedulePicker(false);
    }
    if (date) {
      setRescheduleDate(date);
    }
  }

  if (!videoEnabled) {
    return (
      <View style={styles.levelCard}>
        <Text style={styles.levelTitle}>{copy.title}</Text>
        <Text style={styles.levelBody}>
          {copy.levelRequired.replace("{level}", String(MIN_VIDEO_CALL_PRIVACY_LEVEL))}
        </Text>
      </View>
    );
  }

  if (!isPaid) {
    return (
      <View style={styles.gateWrap}>
        <PaidMembershipGate feature="videoCalls" locale={locale} compact />
      </View>
    );
  }

  const upcoming = calls.filter(
    (call) =>
      call.status === "scheduled" ||
      call.status === "ringing" ||
      call.status === "active",
  );

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.subtitle}>
        {copy.subtitle.replace("{name}", memberName)}
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.primaryButton, loading && styles.disabled]}
        onPress={() => void handleCallNow()}
        disabled={loading}
      >
        <Text style={styles.primaryButtonText}>{copy.callNow}</Text>
      </Pressable>

      <View style={styles.scheduleSection}>
        <Text style={styles.scheduleLabel}>{copy.scheduleLabel}</Text>
        <Pressable
          style={styles.scheduleDateButton}
          onPress={() => setShowSchedulePicker(true)}
        >
          <Text style={styles.scheduleDateText}>
            {formatVideoCallWhen(scheduleDate.toISOString(), locale)}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.secondaryButton, loading && styles.disabled]}
          onPress={() => void handleSchedule()}
          disabled={loading}
        >
          <Text style={styles.secondaryButtonText}>{copy.scheduleCall}</Text>
        </Pressable>
      </View>

      {showSchedulePicker ? (
        Platform.OS === "ios" ? (
          <Modal transparent animationType="slide">
            <View style={styles.pickerModal}>
              <View style={styles.pickerSheet}>
                <DateTimePicker
                  value={scheduleDate}
                  mode="datetime"
                  minimumDate={minScheduleDate()}
                  onChange={onSchedulePickerChange}
                />
                <Pressable
                  style={styles.pickerDone}
                  onPress={() => {
                    setShowSchedulePicker(false);
                  }}
                >
                  <Text style={styles.pickerDoneText}>{copy.closePicker}</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={scheduleDate}
            mode="datetime"
            minimumDate={minScheduleDate()}
            onChange={onSchedulePickerChange}
          />
        )
      ) : null}

      {upcoming.length > 0 ? (
        <View style={styles.upcoming}>
          {upcoming.map((call) => (
            <View key={call.id} style={styles.callRow}>
              <View style={styles.callInfo}>
                <Text style={styles.callStatus}>
                  {copy.status[call.status] ?? call.status}
                </Text>
                {call.scheduledAt ? (
                  <Text style={styles.callWhen}>
                    {formatVideoCallWhen(call.scheduledAt, locale)}
                  </Text>
                ) : null}
                {call.status === "scheduled" && call.isInitiator ? (
                  <Text style={styles.callMeta}>{copy.youScheduled}</Text>
                ) : null}
                {call.status === "scheduled" && !call.isInitiator ? (
                  <Text style={styles.callMeta}>{copy.partnerScheduled}</Text>
                ) : null}
              </View>
              <View style={styles.callActions}>
                {call.status === "scheduled" &&
                call.scheduledAt &&
                canJoinScheduledCall(call.scheduledAt) ? (
                  <Pressable
                    style={[styles.smallPrimary, loading && styles.disabled]}
                    onPress={() => void handleJoinScheduled(call)}
                    disabled={loading}
                  >
                    <Text style={styles.smallPrimaryText}>{copy.joinScheduled}</Text>
                  </Pressable>
                ) : null}
                {call.status === "ringing" || call.status === "active" ? (
                  <Pressable
                    style={[styles.smallPrimary, loading && styles.disabled]}
                    onPress={() => onOpenCall(call.id)}
                    disabled={loading}
                  >
                    <Text style={styles.smallPrimaryText}>
                      {call.status === "ringing" && !call.isInitiator
                        ? copy.answer
                        : call.status === "ringing"
                          ? copy.openCall
                          : copy.rejoin}
                    </Text>
                  </Pressable>
                ) : null}
                {call.status === "scheduled" ? (
                  <>
                    <Pressable
                      style={[styles.smallSecondary, loading && styles.disabled]}
                      onPress={() => {
                        setRescheduleCallId(call.id);
                        setRescheduleDate(
                          call.scheduledAt
                            ? new Date(call.scheduledAt)
                            : minScheduleDate(),
                        );
                      }}
                      disabled={loading}
                    >
                      <Text style={styles.smallSecondaryText}>{copy.reschedule}</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.smallSecondary, loading && styles.disabled]}
                      onPress={() => void handleCancel(call.id)}
                      disabled={loading}
                    >
                      <Text style={styles.smallSecondaryText}>{copy.cancel}</Text>
                    </Pressable>
                  </>
                ) : null}
                {call.status === "ringing" && call.isInitiator ? (
                  <Pressable
                    style={[styles.smallSecondary, loading && styles.disabled]}
                    onPress={() => void handleCancel(call.id)}
                    disabled={loading}
                  >
                    <Text style={styles.smallSecondaryText}>{copy.cancel}</Text>
                  </Pressable>
                ) : null}
              </View>
              {rescheduleCallId === call.id ? (
                <View style={styles.rescheduleBox}>
                  <Text style={styles.scheduleLabel}>{copy.rescheduleLabel}</Text>
                  <Pressable
                    style={styles.scheduleDateButton}
                    onPress={() => setShowReschedulePicker(true)}
                  >
                    <Text style={styles.scheduleDateText}>
                      {formatVideoCallWhen(rescheduleDate.toISOString(), locale)}
                    </Text>
                  </Pressable>
                  <View style={styles.callActions}>
                    <Pressable
                      style={[styles.smallPrimary, loading && styles.disabled]}
                      onPress={() => void handleReschedule(call.id)}
                      disabled={loading}
                    >
                      <Text style={styles.smallPrimaryText}>{copy.saveReschedule}</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.smallSecondary, loading && styles.disabled]}
                      onPress={() => setRescheduleCallId(null)}
                      disabled={loading}
                    >
                      <Text style={styles.smallSecondaryText}>{copy.closeReschedule}</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {showReschedulePicker ? (
        Platform.OS === "ios" ? (
          <Modal transparent animationType="slide">
            <View style={styles.pickerModal}>
              <View style={styles.pickerSheet}>
                <DateTimePicker
                  value={rescheduleDate}
                  mode="datetime"
                  minimumDate={minScheduleDate()}
                  onChange={onReschedulePickerChange}
                />
                <Pressable
                  style={styles.pickerDone}
                  onPress={() => setShowReschedulePicker(false)}
                >
                  <Text style={styles.pickerDoneText}>{copy.closePicker}</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={rescheduleDate}
            mode="datetime"
            minimumDate={minScheduleDate()}
            onChange={onReschedulePickerChange}
          />
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  gateWrap: { marginBottom: 12 },
  levelCard: {
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#fcd34d",
    backgroundColor: "#fffbeb",
    padding: 14,
  },
  levelTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#78350f",
  },
  levelBody: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: "#92400e",
  },
  card: {
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.rose100,
    backgroundColor: colors.white,
    padding: 14,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.zinc900,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: colors.zinc500,
  },
  error: {
    marginTop: 10,
    borderRadius: 10,
    backgroundColor: "#fef2f2",
    padding: 10,
    fontSize: 13,
    color: colors.red600,
  },
  primaryButton: {
    marginTop: 12,
    alignSelf: "flex-start",
    borderRadius: 10,
    backgroundColor: colors.rose800,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.white,
  },
  scheduleSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.rose50,
    gap: 8,
  },
  scheduleLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.zinc600,
  },
  scheduleDateButton: {
    alignSelf: "flex-start",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.rose100,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.rose50,
  },
  scheduleDateText: {
    fontSize: 14,
    color: colors.zinc900,
  },
  secondaryButton: {
    alignSelf: "flex-start",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.rose100,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.white,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.zinc800,
  },
  disabled: { opacity: 0.6 },
  upcoming: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.rose50,
    gap: 10,
  },
  callRow: {
    borderRadius: 10,
    backgroundColor: colors.rose50,
    padding: 10,
    gap: 8,
  },
  callInfo: { gap: 2 },
  callStatus: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.zinc800,
  },
  callWhen: {
    fontSize: 12,
    color: colors.zinc500,
  },
  callMeta: {
    fontSize: 11,
    color: colors.zinc500,
  },
  callActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  smallPrimary: {
    borderRadius: 8,
    backgroundColor: colors.rose800,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  smallPrimaryText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.white,
  },
  smallSecondary: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.rose100,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.white,
  },
  smallSecondaryText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.zinc700,
  },
  rescheduleBox: {
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.rose100,
    gap: 8,
  },
  pickerModal: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  pickerSheet: {
    backgroundColor: colors.white,
    paddingBottom: 24,
  },
  pickerDone: {
    alignItems: "center",
    paddingVertical: 12,
  },
  pickerDoneText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.rose800,
  },
});
