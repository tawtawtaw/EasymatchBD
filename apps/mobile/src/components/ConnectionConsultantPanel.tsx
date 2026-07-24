import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  formatTariffPriceBdt,
  type ConsultantServiceType,
  type ConsultantTariff,
} from "@easymatch/shared";
import { getApiErrorMessage } from "../lib/api-error";
import type { AppLocale } from "../lib/locale";
import { tConsultant } from "../i18n/messages";
import { navigateToConsultantCase, navigateToConsultantCheckout } from "../navigation/navigateConsultant";
import {
  getConsultantTariffs,
  listConnectionConsultantEngagements,
  type ConsultantEngagementItem,
} from "../services/consultant";
import { colors } from "../theme/colors";

type Props = {
  connectionId: string;
  locale: AppLocale;
};

function statusStyle(status: string) {
  switch (status) {
    case "queued":
      return styles.statusQueued;
    case "assigned":
    case "in_progress":
      return styles.statusActive;
    case "completed":
      return styles.statusCompleted;
    case "cancelled":
      return styles.statusCancelled;
    default:
      return styles.statusDefault;
  }
}

function serviceLabel(
  copy: ReturnType<typeof tConsultant>,
  serviceType: ConsultantServiceType | string,
) {
  const key = serviceType as keyof typeof copy.services;
  return copy.services[key] ?? serviceType;
}

export function ConnectionConsultantPanel({ connectionId, locale }: Props) {
  const copy = tConsultant(locale);
  const [tariffs, setTariffs] = useState<ConsultantTariff[]>([]);
  const [engagements, setEngagements] = useState<ConsultantEngagementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<ConsultantServiceType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tariffList, engagementList] = await Promise.all([
        getConsultantTariffs(),
        listConnectionConsultantEngagements(connectionId),
      ]);
      setTariffs(tariffList);
      setEngagements(engagementList);
    } catch (err) {
      setError(getApiErrorMessage(err, copy.loadError));
    } finally {
      setLoading(false);
    }
  }, [connectionId, copy.loadError]);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      if (!expanded) return;
      void load();
    }, [expanded, load]),
  );

  function tariffLabel(tariff: ConsultantTariff) {
    return locale === "bn" && tariff.labelBn?.trim() ? tariff.labelBn : tariff.labelEn;
  }

  function tariffDescription(tariff: ConsultantTariff) {
    return locale === "bn" && tariff.descriptionBn?.trim()
      ? tariff.descriptionBn
      : tariff.descriptionEn;
  }

  function handleRequest(serviceType: ConsultantServiceType) {
    setActing(serviceType);
    setError(null);
    const ok = navigateToConsultantCheckout({
      connectionId,
      serviceType,
      memberNotes: notes.trim() || undefined,
    });
    if (!ok) {
      setError(copy.checkoutError);
    }
    setActing(null);
  }

  const activeServiceTypes = new Set(
    engagements
      .filter((e) => !["completed", "cancelled"].includes(e.status))
      .map((e) => e.serviceType),
  );

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString(locale === "bn" ? "bn-BD" : "en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  return (
    <View style={styles.container}>
      <Pressable style={styles.header} onPress={() => setExpanded((v) => !v)}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{copy.panelTitle}</Text>
          <Text style={styles.hint}>{copy.panelHint}</Text>
        </View>
        <Text style={styles.toggle}>{expanded ? copy.collapse : copy.expand}</Text>
      </Pressable>

      {expanded ? (
        <View style={styles.body}>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {loading ? (
            <Text style={styles.loading}>{copy.loading}</Text>
          ) : (
            <>
              <View>
                <Text style={styles.notesLabel}>{copy.notesLabel}</Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder={copy.notesPlaceholder}
                  placeholderTextColor={colors.zinc500}
                  multiline
                  numberOfLines={2}
                  style={styles.notesInput}
                />
              </View>

              {tariffs.map((tariff) => {
                const busy = activeServiceTypes.has(tariff.serviceType);
                const paying = acting === tariff.serviceType;
                return (
                  <View key={tariff.serviceType} style={styles.tariffCard}>
                    <View style={styles.tariffHeader}>
                      <View style={styles.tariffInfo}>
                        <Text style={styles.tariffTitle}>{tariffLabel(tariff)}</Text>
                        {tariffDescription(tariff) ? (
                          <Text style={styles.tariffDescription}>
                            {tariffDescription(tariff)}
                          </Text>
                        ) : null}
                      </View>
                      <Text style={styles.tariffPrice}>
                        ৳{formatTariffPriceBdt(tariff.priceBdt)}
                      </Text>
                    </View>
                    <Pressable
                      style={[styles.requestButton, (busy || paying) && styles.requestButtonDisabled]}
                      disabled={busy || paying}
                      onPress={() => handleRequest(tariff.serviceType)}
                    >
                      <Text style={styles.requestButtonText}>
                        {busy
                          ? copy.alreadyRequested
                          : paying
                            ? copy.redirecting
                            : copy.requestService}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}

              {engagements.length > 0 ? (
                <View>
                  <Text style={styles.requestsTitle}>{copy.yourRequests}</Text>
                  {engagements.map((item) => (
                    <View key={item.id} style={styles.engagementRow}>
                      <View style={styles.engagementHeader}>
                        <Text style={styles.engagementService}>
                          {serviceLabel(copy, item.serviceType)}
                        </Text>
                        <Text style={[styles.statusBadge, statusStyle(item.status)]}>
                          {copy.status[item.status as keyof typeof copy.status] ?? item.status}
                        </Text>
                      </View>
                      <Text style={styles.engagementDate}>
                        {copy.requestedAt.replace("{date}", formatDate(item.createdAt))}
                      </Text>
                      {item.status !== "cancelled" && item.status !== "completed" ? (
                        <Pressable onPress={() => navigateToConsultantCase(item.id)}>
                          <Text style={styles.openCase}>{copy.openCase} →</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ))}
                </View>
              ) : null}
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd6fe",
    backgroundColor: "#f5f3ff99",
    padding: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  headerText: { flex: 1 },
  title: { fontSize: 14, fontWeight: "700", color: "#4c1d95" },
  hint: { marginTop: 2, fontSize: 11, lineHeight: 16, color: "#5b21b6" },
  toggle: { fontSize: 11, fontWeight: "600", color: "#5b21b6" },
  body: { marginTop: 12, gap: 10 },
  error: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#fef2f2",
    color: colors.red600,
    fontSize: 12,
  },
  loading: { fontSize: 12, color: "#5b21b6" },
  notesLabel: { fontSize: 11, fontWeight: "600", color: "#4c1d95" },
  notesInput: {
    marginTop: 4,
    minHeight: 56,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd6fe",
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.zinc900,
    textAlignVertical: "top",
  },
  tariffCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd6fe",
    backgroundColor: colors.white,
    padding: 10,
  },
  tariffHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  tariffInfo: { flex: 1 },
  tariffTitle: { fontSize: 13, fontWeight: "700", color: colors.zinc900 },
  tariffDescription: { marginTop: 4, fontSize: 11, lineHeight: 16, color: colors.zinc600 },
  tariffPrice: { fontSize: 13, fontWeight: "700", color: "#5b21b6" },
  requestButton: {
    marginTop: 10,
    alignSelf: "flex-start",
    borderRadius: 8,
    backgroundColor: "#4c1d95",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  requestButtonDisabled: { opacity: 0.5 },
  requestButtonText: { fontSize: 11, fontWeight: "700", color: colors.white },
  requestsTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: "#5b21b6",
  },
  engagementRow: {
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ede9fe",
    backgroundColor: colors.white,
    padding: 10,
  },
  engagementHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  engagementService: { fontSize: 12, fontWeight: "600", color: colors.zinc900 },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 10,
    fontWeight: "700",
    overflow: "hidden",
  },
  statusQueued: { backgroundColor: "#fef3c7", color: "#92400e" },
  statusActive: { backgroundColor: "#dbeafe", color: "#1e40af" },
  statusCompleted: { backgroundColor: "#d1fae5", color: "#065f46" },
  statusCancelled: { backgroundColor: colors.zinc100, color: colors.zinc700 },
  statusDefault: { backgroundColor: colors.zinc100, color: colors.zinc700 },
  engagementDate: { marginTop: 4, fontSize: 10, color: colors.zinc500 },
  openCase: { marginTop: 6, fontSize: 11, fontWeight: "700", color: "#4c1d95" },
});
