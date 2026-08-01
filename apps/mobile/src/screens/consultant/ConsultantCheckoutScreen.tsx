import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useLayoutEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { ConsultantServiceType } from "@easymatch/shared";
import { ErrorState } from "../../components/ScreenState";
import { tConsultant } from "../../i18n/messages";
import { getApiErrorMessage } from "../../lib/api-error";
import {
  connectionsWebPageUrl,
  openConnectionsWebPage,
} from "../../lib/consultant-web-checkout";
import type { ConsultantCheckoutScreenProps } from "../../navigation/types";
import {
  confirmConsultantPayment,
  listConnectionConsultantEngagements,
} from "../../services/consultant";
import { useLocaleStore } from "../../store/localeStore";
import { colors } from "../../theme/colors";

function serviceLabel(
  copy: ReturnType<typeof tConsultant>,
  serviceType: ConsultantServiceType,
) {
  const key = serviceType as keyof typeof copy.services;
  return copy.services[key] ?? serviceType;
}

export default function ConsultantCheckoutScreen({
  navigation,
  route,
}: ConsultantCheckoutScreenProps) {
  const locale = useLocaleStore((s) => s.locale);
  const copy = tConsultant(locale);
  const { connectionId, serviceType, memberNotes } = route.params;
  const [openingWeb, setOpeningWeb] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: copy.webPayTitle });
  }, [copy.webPayTitle, navigation]);

  const syncEngagements = useCallback(
    async (options?: { silent?: boolean }) => {
      setSyncing(true);
      setSyncError(null);
      try {
        if (!options?.silent) {
          try {
            await confirmConsultantPayment();
          } catch {
            // optional — webhook may have already created the case
          }
        }
        const engagements = await listConnectionConsultantEngagements(connectionId);
        const match = engagements.find(
          (e) =>
            e.serviceType === serviceType &&
            !["completed", "cancelled"].includes(e.status),
        );
        if (match) {
          if (!options?.silent) {
            Alert.alert(copy.payment.successTitle, copy.payment.successBody, [
              {
                text: copy.payment.backToConnections,
                onPress: () => navigation.goBack(),
              },
            ]);
          }
          return true;
        }
        if (!options?.silent) {
          Alert.alert(copy.webPayRefreshTitle, copy.webPayRefreshStillPending);
        }
        return false;
      } catch (err) {
        const message = getApiErrorMessage(err, copy.webPayRefreshError);
        setSyncError(message);
        if (!options?.silent) {
          Alert.alert(copy.webPayRefreshTitle, message);
        }
        return false;
      } finally {
        setSyncing(false);
      }
    },
    [connectionId, copy, navigation, serviceType],
  );

  useFocusEffect(
    useCallback(() => {
      void syncEngagements({ silent: true }).then((found) => {
        if (found) {
          Alert.alert(copy.payment.successTitle, copy.payment.successBody, [
            {
              text: copy.payment.backToConnections,
              onPress: () => navigation.goBack(),
            },
          ]);
        }
      });
    }, [copy.payment.backToConnections, copy.payment.successBody, copy.payment.successTitle, navigation, syncEngagements]),
  );

  async function handleOpenWeb() {
    setOpeningWeb(true);
    try {
      const opened = await openConnectionsWebPage(locale, connectionId);
      if (!opened) {
        Alert.alert(copy.webPayTitle, copy.webPayOpenError);
      }
    } finally {
      setOpeningWeb(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.serviceName}>{serviceLabel(copy, serviceType)}</Text>
        <Text style={styles.lead}>{copy.webPayLead}</Text>
        <View style={styles.stepsCard}>
          {[copy.webPayStep1, copy.webPayStep2, copy.webPayStep3, copy.webPayStep4].map(
            (step, index) => (
              <Text key={step} style={styles.step}>
                {index + 1}. {step}
              </Text>
            ),
          )}
        </View>
        {memberNotes?.trim() ? (
          <View style={styles.notesCard}>
            <Text style={styles.notesTitle}>{copy.webPayNotesReminderTitle}</Text>
            <Text style={styles.notesBody}>{memberNotes.trim()}</Text>
            <Text style={styles.notesHint}>{copy.webPayNotesReminderHint}</Text>
          </View>
        ) : null}
        <Text style={styles.urlHint}>{connectionsWebPageUrl(locale, connectionId)}</Text>
        <Text style={styles.policyNote}>{copy.webPayStorePolicyNote}</Text>

        {syncError ? <ErrorState message={syncError} onRetry={() => void syncEngagements()} /> : null}

        <Pressable
          style={[styles.primaryButton, openingWeb && styles.buttonDisabled]}
          onPress={() => void handleOpenWeb()}
          disabled={openingWeb}
        >
          <Text style={styles.primaryButtonText}>
            {openingWeb ? copy.webPayOpening : copy.openConnectionsWebsite}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.secondaryButton, syncing && styles.buttonDisabled]}
          onPress={() => void syncEngagements()}
          disabled={syncing}
        >
          <Text style={styles.secondaryButtonText}>
            {syncing ? copy.webPayRefreshLoading : copy.webPayRefreshStatus}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
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
  serviceName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#4c1d95",
  },
  lead: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.zinc800,
  },
  stepsCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ddd6fe",
    backgroundColor: colors.white,
    padding: 16,
    gap: 10,
  },
  step: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.zinc700,
  },
  notesCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd6fe",
    backgroundColor: "#f5f3ff",
    padding: 12,
    gap: 6,
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4c1d95",
  },
  notesBody: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.zinc800,
  },
  notesHint: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.zinc600,
  },
  urlHint: {
    fontSize: 11,
    color: colors.zinc500,
    fontFamily: "monospace",
  },
  policyNote: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.zinc500,
  },
  primaryButton: {
    marginTop: 4,
    borderRadius: 999,
    backgroundColor: "#4c1d95",
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#4c1d95",
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: colors.white,
  },
  secondaryButtonText: {
    color: "#4c1d95",
    fontSize: 15,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
