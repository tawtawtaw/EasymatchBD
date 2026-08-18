import { useCallback, useEffect, useMemo, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerAndroid,
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
import {
  formatVideoCallDate,
  formatVideoCallTime,
  formatVideoCallWhen,
} from "../lib/video-call-url";
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
import { cardShadow } from "../theme/shadows";
import {
  cancelScheduledCallAlarm,
  scheduleScheduledCallAlarm,
} from "../lib/scheduled-call-alarms";

type Props = {
  connectionId: string;
  privacyLevel: number;
  memberName: string;
  locale: AppLocale;
  onOpenCall: (callId: string) => void;
};

type PickerKind =
  | "schedule-date"
  | "schedule-time"
  | "reschedule-date"
  | "reschedule-time";

function minScheduleDate(): Date {
  return new Date(Date.now() + 5 * 60 * 1000);
}

function startOfToday(): Date {
  const next = new Date();
  next.setHours(0, 0, 0, 0);
  return next;
}

function mergeDateAndTime(datePart: Date, timePart: Date): Date {
  const next = new Date(datePart);
  next.setHours(timePart.getHours(), timePart.getMinutes(), 0, 0);
  return next;
}

function openAndroidPicker(options: {
  value: Date;
  mode: "date" | "time";
  minimumDate?: Date;
  onSelect: (date: Date) => void;
}) {
  DateTimePickerAndroid.open({
    value: options.value,
    mode: options.mode,
    minimumDate: options.minimumDate,
    onChange: (event, date) => {
      if (event.type !== "set" || !date) return;
      options.onSelect(date);
    },
  });
}

function DateTimeField({
  step,
  icon,
  label,
  value,
  placeholder,
  onPress,
}: {
  step: string;
  icon: "calendar-month" | "clock-outline";
  label: string;
  value: string | null;
  placeholder: string;
  onPress: () => void;
}) {
  const filled = Boolean(value);
  return (
    <Pressable
      onPress={onPress}
      style={[styles.fieldTile, filled && styles.fieldTileFilled]}
      android_ripple={{ color: "#e0f2fe" }}
    >
      <View style={styles.fieldTileHeader}>
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>{step}</Text>
        </View>
        <MaterialCommunityIcons name={icon} size={16} color="#0369a1" />
        <Text style={styles.fieldLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text
        style={[styles.fieldValue, !filled && styles.fieldPlaceholder]}
        numberOfLines={2}
      >
        {value ?? placeholder}
      </Text>
    </Pressable>
  );
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
  const [scheduleDatePart, setScheduleDatePart] = useState<Date | null>(null);
  const [scheduleTimePart, setScheduleTimePart] = useState<Date | null>(null);
  const [rescheduleCallId, setRescheduleCallId] = useState<string | null>(null);
  const [rescheduleDatePart, setRescheduleDatePart] = useState<Date | null>(null);
  const [rescheduleTimePart, setRescheduleTimePart] = useState<Date | null>(null);
  const [pickerKind, setPickerKind] = useState<PickerKind | null>(null);

  const scheduleAt = useMemo(() => {
    if (!scheduleDatePart || !scheduleTimePart) return null;
    return mergeDateAndTime(scheduleDatePart, scheduleTimePart);
  }, [scheduleDatePart, scheduleTimePart]);

  const rescheduleAt = useMemo(() => {
    if (!rescheduleDatePart || !rescheduleTimePart) return null;
    return mergeDateAndTime(rescheduleDatePart, rescheduleTimePart);
  }, [rescheduleDatePart, rescheduleTimePart]);

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
    if (!scheduleAt) return;
    setLoading(true);
    setError(null);
    try {
      const call = await createVideoCall(
        connectionId,
        scheduleAt.toISOString(),
      );
      setScheduleDatePart(null);
      setScheduleTimePart(null);
      void scheduleScheduledCallAlarm({
        callId: call.id,
        connectionId,
        scheduledAt: call.scheduledAt ?? scheduleAt.toISOString(),
        partnerName: memberName,
      });
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
      await cancelScheduledCallAlarm(activeCall.id);
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
      await cancelScheduledCallAlarm(callId);
      if (rescheduleCallId === callId) {
        setRescheduleCallId(null);
        setRescheduleDatePart(null);
        setRescheduleTimePart(null);
      }
      await refresh();
    } catch (err) {
      setError(getApiErrorMessage(err, copy.actionsError));
    } finally {
      setLoading(false);
    }
  }

  async function handleReschedule(callId: string) {
    if (!rescheduleAt) return;
    setLoading(true);
    setError(null);
    try {
      await rescheduleVideoCall(callId, rescheduleAt.toISOString());
      void scheduleScheduledCallAlarm({
        callId,
        connectionId,
        scheduledAt: rescheduleAt.toISOString(),
        partnerName: memberName,
      });
      setRescheduleCallId(null);
      setRescheduleDatePart(null);
      setRescheduleTimePart(null);
      await refresh();
    } catch (err) {
      setError(getApiErrorMessage(err, copy.actionsError));
    } finally {
      setLoading(false);
    }
  }

  function applyPickerValue(kind: PickerKind, date: Date) {
    if (kind === "schedule-date") setScheduleDatePart(date);
    if (kind === "schedule-time") setScheduleTimePart(date);
    if (kind === "reschedule-date") setRescheduleDatePart(date);
    if (kind === "reschedule-time") setRescheduleTimePart(date);
  }

  function pickerValue(kind: PickerKind): Date {
    if (kind === "schedule-date") return scheduleDatePart ?? minScheduleDate();
    if (kind === "schedule-time") return scheduleTimePart ?? minScheduleDate();
    if (kind === "reschedule-date") return rescheduleDatePart ?? minScheduleDate();
    return rescheduleTimePart ?? minScheduleDate();
  }

  function openPicker(kind: PickerKind) {
    if (Platform.OS === "android") {
      try {
        openAndroidPicker({
          value: pickerValue(kind),
          mode: kind.endsWith("date") ? "date" : "time",
          minimumDate: kind.endsWith("date") ? startOfToday() : undefined,
          onSelect: (date) => applyPickerValue(kind, date),
        });
      } catch (err) {
        setError(getApiErrorMessage(err, copy.actionsError));
      }
      return;
    }
    setPickerKind(kind);
  }

  function onIosPickerChange(_event: DateTimePickerEvent, date?: Date) {
    if (!pickerKind || !date) return;
    applyPickerValue(pickerKind, date);
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

  const incomingRinging = upcoming.find(
    (call) => call.status === "ringing" && !call.isInitiator,
  );

  return (
    <View style={styles.cardShadowWrap}>
    <View style={styles.card}>
      <View style={styles.headerBand}>
        <View style={styles.headerIcon}>
          <MaterialCommunityIcons
            name="video-outline"
            size={22}
            color={colors.rose800}
          />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.subtitle}>
            {copy.subtitle.replace("{name}", memberName)}
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        {incomingRinging ? (
          <View style={styles.incomingCard}>
            <Text style={styles.incomingTitle}>{copy.incomingCall}</Text>
            <Text style={styles.incomingHint}>{copy.incomingCallHint}</Text>
            <Pressable
              style={[styles.incomingButton, loading && styles.disabled]}
              onPress={() => onOpenCall(incomingRinging.id)}
              disabled={loading}
            >
              <MaterialCommunityIcons name="phone" size={18} color={colors.white} />
              <Text style={styles.incomingButtonText}>{copy.answer}</Text>
            </Pressable>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.callNowButton, loading && styles.disabled]}
          onPress={() => void handleCallNow()}
          disabled={loading}
          android_ripple={{ color: "#be123c" }}
        >
          <View style={styles.callNowIcon}>
            <MaterialCommunityIcons name="video" size={20} color={colors.white} />
          </View>
          <View style={styles.callNowCopy}>
            <Text style={styles.callNowTitle}>{copy.callNow}</Text>
            <Text style={styles.callNowHint}>{copy.callNowHint}</Text>
          </View>
        </Pressable>

        <View style={styles.scheduleCard}>
          <Text style={styles.scheduleTitle}>{copy.scheduleTitle}</Text>
          <Text style={styles.scheduleHint}>{copy.scheduleHint}</Text>

          <View style={styles.fieldGrid}>
            <DateTimeField
              step="1"
              icon="calendar-month"
              label={copy.scheduleDate}
              value={
                scheduleDatePart
                  ? formatVideoCallDate(scheduleDatePart.toISOString(), locale)
                  : null
              }
              placeholder={copy.pickDate}
              onPress={() => openPicker("schedule-date")}
            />
            <DateTimeField
              step="2"
              icon="clock-outline"
              label={copy.scheduleTime}
              value={
                scheduleTimePart
                  ? formatVideoCallTime(scheduleTimePart.toISOString(), locale)
                  : null
              }
              placeholder={copy.pickTime}
              onPress={() => openPicker("schedule-time")}
            />
          </View>

          <View style={[styles.previewChip, scheduleAt && styles.previewChipReady]}>
            <MaterialCommunityIcons
              name={scheduleAt ? "check-circle" : "information-outline"}
              size={16}
              color={scheduleAt ? "#047857" : "#0369a1"}
            />
            <Text style={scheduleAt ? styles.preview : styles.previewMuted}>
              {scheduleAt
                ? copy.schedulePreview.replace(
                    "{when}",
                    formatVideoCallWhen(scheduleAt.toISOString(), locale),
                  )
                : copy.scheduleNeedDateTime}
            </Text>
          </View>

          <Pressable
            style={[
              styles.scheduleSubmit,
              (!scheduleAt || loading) && styles.disabled,
            ]}
            onPress={() => void handleSchedule()}
            disabled={!scheduleAt || loading}
            android_ripple={{ color: "#be123c" }}
          >
            <View style={styles.stepBadgeOnButton}>
              <Text style={styles.stepBadgeOnButtonText}>3</Text>
            </View>
            <Text style={styles.scheduleSubmitText}>{copy.scheduleCall}</Text>
          </Pressable>
        </View>

      {pickerKind && Platform.OS === "ios" ? (
        <Modal transparent animationType="slide">
          <View style={styles.pickerModal}>
            <View style={styles.pickerSheet}>
              <View style={styles.pickerGrabber} />
              <Text style={styles.pickerTitle}>
                {pickerKind.endsWith("date") ? copy.pickDate : copy.pickTime}
              </Text>
              <DateTimePicker
                value={pickerValue(pickerKind)}
                mode={pickerKind.endsWith("date") ? "date" : "time"}
                display="spinner"
                minimumDate={
                  pickerKind.endsWith("date") ? startOfToday() : undefined
                }
                onChange={onIosPickerChange}
              />
              <Pressable
                style={styles.pickerDone}
                onPress={() => setPickerKind(null)}
              >
                <Text style={styles.pickerDoneText}>{copy.closePicker}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      ) : null}

      {upcoming.length > 0 ? (
        <View style={styles.upcoming}>
          <Text style={styles.upcomingTitle}>{copy.upcomingTitle}</Text>
          {upcoming.map((call) => (
            <View key={call.id} style={styles.callRow}>
              <View style={styles.callInfo}>
                <View
                  style={[
                    styles.statusPill,
                    call.status === "ringing" || call.status === "active"
                      ? styles.statusLive
                      : styles.statusScheduled,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      call.status === "ringing" || call.status === "active"
                        ? styles.statusLiveText
                        : styles.statusScheduledText,
                    ]}
                  >
                    {copy.status[call.status] ?? call.status}
                  </Text>
                </View>
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
                        const next = call.scheduledAt
                          ? new Date(call.scheduledAt)
                          : minScheduleDate();
                        setRescheduleCallId(call.id);
                        setRescheduleDatePart(next);
                        setRescheduleTimePart(next);
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
                  <Text style={styles.scheduleTitle}>{copy.rescheduleLabel}</Text>
                  <Text style={styles.scheduleHint}>{copy.rescheduleHint}</Text>
                  <View style={styles.fieldGrid}>
                    <DateTimeField
                      step="1"
                      icon="calendar-month"
                      label={copy.scheduleDate}
                      value={
                        rescheduleDatePart
                          ? formatVideoCallDate(
                              rescheduleDatePart.toISOString(),
                              locale,
                            )
                          : null
                      }
                      placeholder={copy.pickDate}
                      onPress={() => openPicker("reschedule-date")}
                    />
                    <DateTimeField
                      step="2"
                      icon="clock-outline"
                      label={copy.scheduleTime}
                      value={
                        rescheduleTimePart
                          ? formatVideoCallTime(
                              rescheduleTimePart.toISOString(),
                              locale,
                            )
                          : null
                      }
                      placeholder={copy.pickTime}
                      onPress={() => openPicker("reschedule-time")}
                    />
                  </View>
                  <View style={styles.callActions}>
                    <Pressable
                      style={[
                        styles.smallPrimary,
                        (!rescheduleAt || loading) && styles.disabled,
                      ]}
                      onPress={() => void handleReschedule(call.id)}
                      disabled={!rescheduleAt || loading}
                    >
                      <Text style={styles.smallPrimaryText}>{copy.saveReschedule}</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.smallSecondary, loading && styles.disabled]}
                      onPress={() => {
                        setRescheduleCallId(null);
                        setRescheduleDatePart(null);
                        setRescheduleTimePart(null);
                      }}
                      disabled={loading}
                    >
                      <Text style={styles.smallSecondaryText}>
                        {copy.closeReschedule}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
      </View>
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gateWrap: { marginBottom: 12 },
  levelCard: {
    marginBottom: 12,
    borderRadius: 16,
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
  cardShadowWrap: {
    marginBottom: 12,
    borderRadius: 20,
    ...cardShadow,
  },
  card: {
    overflow: "hidden",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.rose100,
    backgroundColor: colors.white,
  },
  headerBand: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.rose50,
    borderBottomWidth: 1,
    borderBottomColor: colors.rose100,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.rose100,
  },
  headerCopy: { flex: 1 },
  body: {
    padding: 14,
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.zinc900,
  },
  subtitle: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: colors.zinc500,
  },
  incomingCard: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#34d399",
    backgroundColor: "#ecfdf5",
    padding: 14,
    gap: 6,
  },
  incomingTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#064e3b",
  },
  incomingHint: {
    fontSize: 13,
    lineHeight: 18,
    color: "#047857",
  },
  incomingButton: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    backgroundColor: "#059669",
    paddingVertical: 12,
  },
  incomingButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.white,
  },
  error: {
    borderRadius: 12,
    backgroundColor: "#fef2f2",
    padding: 10,
    fontSize: 13,
    color: colors.red600,
  },
  callNowButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    overflow: "hidden",
    borderRadius: 16,
    backgroundColor: colors.rose800,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  callNowIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  callNowCopy: { flex: 1 },
  callNowTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.white,
  },
  callNowHint: {
    marginTop: 2,
    fontSize: 12,
    color: "#fecdd3",
  },
  scheduleCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#7dd3fc",
    backgroundColor: "#f0f9ff",
    padding: 14,
    gap: 12,
  },
  scheduleTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0c4a6e",
  },
  scheduleHint: {
    fontSize: 13,
    lineHeight: 18,
    color: "#0369a1",
  },
  fieldGrid: {
    flexDirection: "row",
    gap: 8,
  },
  fieldTile: {
    flex: 1,
    minHeight: 88,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#7dd3fc",
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
  },
  fieldTileFilled: {
    borderColor: "#0284c7",
    backgroundColor: "#fff",
  },
  fieldTileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stepBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0369a1",
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.white,
  },
  fieldLabel: {
    flex: 1,
    fontSize: 11,
    fontWeight: "800",
    color: "#0369a1",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  fieldValue: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
    color: colors.zinc900,
  },
  fieldPlaceholder: {
    fontWeight: "500",
    color: colors.zinc400,
  },
  previewChip: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.72)",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  previewChipReady: {
    backgroundColor: "#ecfdf5",
  },
  preview: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    color: "#064e3b",
  },
  previewMuted: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: "#0369a1",
  },
  scheduleSubmit: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    overflow: "hidden",
    borderRadius: 14,
    backgroundColor: colors.rose800,
    paddingVertical: 13,
  },
  scheduleSubmitText: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.white,
  },
  stepBadgeOnButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  stepBadgeOnButtonText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.white,
  },
  disabled: { opacity: 0.55 },
  upcoming: {
    gap: 10,
  },
  upcomingTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.zinc600,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  callRow: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.rose100,
    backgroundColor: colors.rose50,
    padding: 12,
    gap: 8,
  },
  callInfo: { gap: 4 },
  statusPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusScheduled: { backgroundColor: "#e0f2fe" },
  statusLive: { backgroundColor: "#d1fae5" },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  statusScheduledText: { color: "#0369a1" },
  statusLiveText: { color: "#047857" },
  callWhen: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.zinc800,
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
    gap: 10,
  },
  pickerModal: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  pickerSheet: {
    backgroundColor: colors.white,
    paddingTop: 8,
    paddingBottom: 28,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  pickerGrabber: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.zinc300,
    marginBottom: 12,
  },
  pickerTitle: {
    textAlign: "center",
    fontSize: 15,
    fontWeight: "700",
    color: colors.zinc900,
    marginBottom: 4,
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
