import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { isValidProfileCode, normalizeProfileCode } from "@easymatch/shared";
import { PaidMembershipGate } from "../../components/PaidMembershipGate";
import { EmptyState, LoadingState } from "../../components/ScreenState";
import { fillComplaintTemplate, tComplaints } from "../../i18n/complaints";
import { useIsPaidMember } from "../../hooks/use-is-paid-member";
import { getApiErrorMessage } from "../../lib/api-error";
import type { ComplaintsScreenProps } from "../../navigation/types";
import {
  createMemberComplaint,
  listMemberComplaints,
  lookupComplaintTarget,
} from "../../services/complaints";
import { useLocaleStore } from "../../store/localeStore";
import {
  COMPLAINT_CATEGORIES,
  type ComplaintTargetLookup,
  type MemberComplaintCategory,
  type MemberComplaintItem,
} from "../../types/complaints";
import { colors } from "../../theme/colors";

export default function ComplaintsScreen({ navigation, route }: ComplaintsScreenProps) {
  const locale = useLocaleStore((s) => s.locale);
  const copy = tComplaints(locale);
  const isPaid = useIsPaidMember();
  const prefillCode = route.params?.profileCode ?? "";
  const shouldOpenForm = route.params?.openForm ?? Boolean(prefillCode);

  const [loading, setLoading] = useState(true);
  const [complaints, setComplaints] = useState<MemberComplaintItem[]>([]);
  const [showForm, setShowForm] = useState(shouldOpenForm);
  const [profileCode, setProfileCode] = useState(prefillCode);
  const [category, setCategory] = useState<MemberComplaintCategory>("misrepresentation");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetLookup, setTargetLookup] = useState<ComplaintTargetLookup | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  const canSubmitTarget =
    targetLookup?.found === true && targetLookup.isVerified === true;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listMemberComplaints();
      setComplaints(rows);
    } catch (err) {
      setError(getApiErrorMessage(err, copy.loadError));
    } finally {
      setLoading(false);
    }
  }, [copy.loadError]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!isPaid || !showForm) return;

    const normalized = normalizeProfileCode(profileCode);
    if (!isValidProfileCode(normalized)) {
      setTargetLookup(null);
      setLookupLoading(false);
      return;
    }

    setLookupLoading(true);
    const timer = setTimeout(() => {
      lookupComplaintTarget(normalized)
        .then(setTargetLookup)
        .catch(() => setTargetLookup({ found: false, reason: "not_found" }))
        .finally(() => setLookupLoading(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [profileCode, isPaid, showForm]);

  function lookupMessage() {
    if (lookupLoading) return copy.profileLookupLoading;
    if (!profileCode.trim()) return copy.profileCodeHint;
    if (!targetLookup) return copy.profileLookupInvalid;

    if (!targetLookup.found) {
      switch (targetLookup.reason) {
        case "self":
          return copy.profileLookupSelf;
        case "not_found":
          return copy.profileLookupNotFound;
        default:
          return copy.profileLookupInvalid;
      }
    }

    if (!targetLookup.isVerified) {
      return fillComplaintTemplate(copy.profileLookupNotVerified, {
        code: targetLookup.profileCode,
      });
    }

    return fillComplaintTemplate(copy.profileLookupVerified, {
      code: targetLookup.profileCode,
    });
  }

  async function handleSubmit() {
    if (!canSubmitTarget) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await createMemberComplaint({
        profileCode: normalizeProfileCode(profileCode),
        category,
        description: description.trim(),
      });
      setProfileCode("");
      setDescription("");
      setShowForm(false);
      setTargetLookup(null);
      await load();
      navigation.navigate("ComplaintDetail", { complaintId: created.id });
    } catch (err) {
      setError(getApiErrorMessage(err, copy.submitError));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingState label={copy.title} />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.subtitle}>{copy.subtitle}</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!isPaid ? (
        <View style={styles.paidGate}>
          <Text style={styles.paidGateText}>{copy.paidRequired}</Text>
          <PaidMembershipGate feature="connect" locale={locale} compact />
        </View>
      ) : (
        <>
          {!showForm ? (
            <Pressable style={styles.primaryButton} onPress={() => setShowForm(true)}>
              <Text style={styles.primaryButtonText}>{copy.newComplaint}</Text>
            </Pressable>
          ) : (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>{copy.formTitle}</Text>

              <Text style={styles.label}>{copy.profileCodeLabel}</Text>
              <TextInput
                value={profileCode}
                onChangeText={(value) => {
                  setProfileCode(value.replace(/\D/g, "").slice(0, 8));
                  setError(null);
                }}
                keyboardType="number-pad"
                placeholder={copy.profileCodePlaceholder}
                style={styles.input}
              />
              <Text
                style={[
                  styles.lookupHint,
                  targetLookup?.found === false && styles.lookupHintError,
                  canSubmitTarget && styles.lookupHintOk,
                ]}
              >
                {lookupMessage()}
              </Text>

              <Text style={styles.label}>{copy.categoryLabel}</Text>
              <View style={styles.categoryRow}>
                {COMPLAINT_CATEGORIES.map((item) => {
                  const active = category === item;
                  return (
                    <Pressable
                      key={item}
                      style={[styles.categoryChip, active && styles.categoryChipActive]}
                      onPress={() => setCategory(item)}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          active && styles.categoryChipTextActive,
                        ]}
                      >
                        {copy.categories[item]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.label}>{copy.descriptionLabel}</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                multiline
                textAlignVertical="top"
                placeholder={copy.descriptionPlaceholder}
                style={[styles.input, styles.textArea]}
              />

              <View style={styles.formActions}>
                <Pressable
                  style={[
                    styles.primaryButton,
                    (!canSubmitTarget || !description.trim() || submitting) &&
                      styles.buttonDisabled,
                  ]}
                  disabled={!canSubmitTarget || !description.trim() || submitting}
                  onPress={() => void handleSubmit()}
                >
                  <Text style={styles.primaryButtonText}>{copy.submitComplaint}</Text>
                </Pressable>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => {
                    setShowForm(false);
                    setError(null);
                  }}
                >
                  <Text style={styles.secondaryButtonText}>{copy.cancelForm}</Text>
                </Pressable>
              </View>
            </View>
          )}

          <Text style={styles.sectionTitle}>{copy.myComplaints}</Text>
          {complaints.length === 0 ? (
            <EmptyState message={copy.emptyList} />
          ) : (
            <FlatList
              data={complaints}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.listItem}
                  onPress={() =>
                    navigation.navigate("ComplaintDetail", { complaintId: item.id })
                  }
                >
                  <View style={styles.listItemHeader}>
                    <Text style={styles.listItemTitle}>
                      {fillComplaintTemplate(copy.againstProfile, {
                        code: item.targetProfile?.profileCode ?? "—",
                      })}
                    </Text>
                    <Text style={styles.statusBadge}>{copy.status[item.status]}</Text>
                  </View>
                  <Text style={styles.listItemMeta}>{copy.categories[item.category]}</Text>
                </Pressable>
              )}
            />
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.rose50,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.zinc900,
  },
  subtitle: {
    fontSize: 14,
    color: colors.zinc600,
    lineHeight: 20,
  },
  error: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#fef2f2",
    color: colors.red600,
    fontSize: 13,
  },
  paidGate: {
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#fcd34d",
    backgroundColor: "#fffbeb",
    padding: 16,
    gap: 12,
  },
  paidGateText: {
    fontSize: 14,
    color: "#92400e",
    lineHeight: 20,
  },
  formCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.zinc100,
    backgroundColor: colors.white,
    padding: 16,
    gap: 8,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.zinc900,
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.zinc700,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.zinc100,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.zinc900,
    backgroundColor: colors.white,
  },
  textArea: {
    minHeight: 120,
  },
  lookupHint: {
    fontSize: 12,
    color: colors.zinc500,
    lineHeight: 18,
  },
  lookupHintError: {
    color: colors.red600,
  },
  lookupHintOk: {
    color: colors.emerald600,
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.zinc100,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  categoryChipActive: {
    backgroundColor: colors.rose800,
    borderColor: colors.rose800,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.zinc800,
  },
  categoryChipTextActive: {
    color: colors.white,
  },
  formActions: {
    marginTop: 8,
    gap: 10,
  },
  primaryButton: {
    borderRadius: 999,
    backgroundColor: colors.rose800,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.zinc100,
    backgroundColor: colors.white,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: colors.zinc800,
    fontSize: 14,
    fontWeight: "600",
  },
  sectionTitle: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: "700",
    color: colors.zinc900,
  },
  list: {
    gap: 10,
  },
  listItem: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.rose100,
    backgroundColor: colors.white,
    padding: 14,
    gap: 6,
  },
  listItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    alignItems: "flex-start",
  },
  listItemTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: colors.zinc900,
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.rose800,
    backgroundColor: colors.rose50,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  listItemMeta: {
    fontSize: 13,
    color: colors.zinc600,
  },
});
