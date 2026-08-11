import { useCallback, useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { DiscoveryFieldSection } from "../../components/DiscoveryFieldSection";
import { PaidMembershipGate } from "../../components/PaidMembershipGate";
import { EmptyState, ErrorState, LoadingState } from "../../components/ScreenState";
import { useIsPaidMember } from "../../hooks/use-is-paid-member";
import { tBiodataExport, tPrivacyLevel } from "../../i18n/messages";
import { getApiErrorMessage } from "../../lib/api-error";
import { exportAndShareBiodataPdf } from "../../lib/biodata-pdf";
import type { BiodataExportScreenProps } from "../../navigation/types";
import { fetchBiodataExport, getBiodataBootstrap } from "../../services/profile-biodata";
import { useLocaleStore } from "../../store/localeStore";
import type { BiodataExportPayload } from "../../types/biodata-export";
import type { DropdownMap } from "../../types/dropdowns";
import { colors } from "../../theme/colors";

const PRIVACY_LEVELS = [0, 1, 2, 3] as const;

export default function BiodataExportScreen(_props: BiodataExportScreenProps) {
  const locale = useLocaleStore((s) => s.locale);
  const copy = tBiodataExport(locale);
  const privacyLabels = tPrivacyLevel(locale);
  const isPaid = useIsPaidMember();
  const [level, setLevel] = useState<number>(0);
  const [data, setData] = useState<BiodataExportPayload | null>(null);
  const [dropdowns, setDropdowns] = useState<DropdownMap>({});
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const readyRef = useRef(false);
  const lastLoadedLevelRef = useRef<number | null>(null);

  const loadBootstrap = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const bootstrap = await getBiodataBootstrap(0, locale);
      readyRef.current = true;
      lastLoadedLevelRef.current = 0;
      setData(bootstrap.export);
      if (bootstrap.dropdowns) {
        setDropdowns(bootstrap.dropdowns);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, copy.loadError));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [copy.loadError, locale]);

  useEffect(() => {
    void loadBootstrap();
  }, [loadBootstrap]);

  useEffect(() => {
    if (!readyRef.current) return;
    if (lastLoadedLevelRef.current === level) return;

    let cancelled = false;

    async function loadLevel() {
      setLoading(true);
      setError(null);
      try {
        const exportData = await fetchBiodataExport(level);
        if (cancelled) return;
        lastLoadedLevelRef.current = level;
        setData(exportData);
      } catch (err) {
        if (!cancelled) {
          setError(getApiErrorMessage(err, copy.loadError));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadLevel();

    return () => {
      cancelled = true;
    };
  }, [copy.loadError, level]);

  async function handleDownload() {
    if (!data) return;

    setDownloading(true);
    setError(null);
    try {
      await exportAndShareBiodataPdf({
        data,
        dropdowns,
        locale,
        copy,
        privacyLabels,
      });
    } catch (err) {
      setError(getApiErrorMessage(err, copy.downloadFailed));
    } finally {
      setDownloading(false);
    }
  }

  if (!isPaid) {
    return (
      <View style={styles.container}>
        <PaidMembershipGate feature="biodata" locale={locale} />
      </View>
    );
  }

  if (loading && !data) {
    return <LoadingState label={copy.loading} />;
  }

  if (error && !data) {
    return <ErrorState message={error} onRetry={() => void loadBootstrap()} />;
  }

  const levelLabel =
    privacyLabels[String(level) as keyof typeof privacyLabels] ?? String(level);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.subtitle}>{copy.subtitle}</Text>

      <View style={styles.levelRow}>
        {PRIVACY_LEVELS.map((value) => {
          const label =
            privacyLabels[String(value) as keyof typeof privacyLabels] ?? String(value);
          const active = level === value;
          return (
            <Pressable
              key={value}
              style={[styles.levelButton, active && styles.levelButtonActive]}
              onPress={() => setLevel(value)}
            >
              <Text style={[styles.levelButtonText, active && styles.levelButtonTextActive]}>
                {copy.levelButton.replace("{level}", String(value)).replace("{label}", label)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {data && data.hiddenFieldCount > 0 ? (
        <Text style={styles.hiddenNotice}>
          {copy.hiddenFields.replace("{count}", String(data.hiddenFieldCount))}
        </Text>
      ) : null}

      <Text style={styles.hint}>{copy.cumulativeHint}</Text>

      <View style={styles.downloadRow}>
        <Pressable
          style={[styles.downloadButton, downloading && styles.downloadButtonDisabled]}
          disabled={!data || downloading}
          onPress={() => void handleDownload()}
        >
          <Text style={styles.downloadButtonText}>
            {downloading ? copy.generatingPdf : copy.downloadPdf}
          </Text>
        </Pressable>
        <Text style={styles.downloadHint}>{copy.downloadHint}</Text>
      </View>

      {data ? (
        <View style={styles.previewCard}>
          <Text style={styles.previewLabel}>{copy.previewLabel}</Text>
          <Text style={styles.previewMeta}>
            {copy.profileId.replace("{code}", data.profileCode)}
          </Text>
          <Text style={styles.previewMeta}>
            {copy.privacyLevel
              .replace("{level}", String(data.privacyLevel))
              .replace("{label}", levelLabel)}
          </Text>

          <DiscoveryFieldSection
            title={copy.sections.personal}
            kind="personal"
            data={data.personal}
            dropdowns={dropdowns}
            locale={locale}
            personal={data.personal}
          />
          <DiscoveryFieldSection
            title={copy.sections.family}
            kind="family"
            data={data.family}
            dropdowns={dropdowns}
            locale={locale}
            personal={data.personal}
          />
          <DiscoveryFieldSection
            title={copy.sections.marital}
            kind="marital"
            data={data.marital}
            dropdowns={dropdowns}
            locale={locale}
            personal={data.personal}
          />
          <DiscoveryFieldSection
            title={copy.sections.siblings}
            kind="siblings"
            data={data.siblings}
            dropdowns={dropdowns}
            locale={locale}
            personal={data.personal}
          />
          <DiscoveryFieldSection
            title={copy.sections.paternalRelatives}
            kind="paternal_relatives"
            data={data.paternalRelatives}
            dropdowns={dropdowns}
            locale={locale}
            personal={data.personal}
          />
          <DiscoveryFieldSection
            title={copy.sections.maternalRelatives}
            kind="maternal_relatives"
            data={data.maternalRelatives}
            dropdowns={dropdowns}
            locale={locale}
            personal={data.personal}
          />
          <DiscoveryFieldSection
            title={copy.sections.partner}
            kind="partner"
            data={data.partner}
            dropdowns={dropdowns}
            locale={locale}
            personal={data.personal}
          />

          {data.media.phone || data.media.isVerified ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{copy.sections.contact}</Text>
              {data.media.phone ? (
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>{copy.contactPhone}</Text>
                  <Text style={styles.rowValue}>{data.media.phone}</Text>
                </View>
              ) : null}
              {data.media.isVerified ? (
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>{copy.contactVerification}</Text>
                  <Text style={styles.rowValue}>{copy.verifiedYes}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {!data.personal ||
          (Object.keys(data.personal).length === 0 &&
            !data.family &&
            !data.siblings?.length &&
            !data.partner) ? (
            <EmptyState message={copy.emptyAtLevel} icon="file-document-outline" />
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.rose50 },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  subtitle: { fontSize: 14, lineHeight: 20, color: colors.zinc600 },
  levelRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  levelButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.zinc100,
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  levelButtonActive: {
    backgroundColor: colors.rose800,
    borderColor: colors.rose800,
  },
  levelButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.zinc800,
  },
  levelButtonTextActive: { color: colors.white },
  error: { color: colors.red600, fontSize: 13 },
  hiddenNotice: {
    backgroundColor: "#fffbeb",
    color: "#92400e",
    fontSize: 13,
    padding: 12,
    borderRadius: 10,
  },
  hint: { fontSize: 12, color: colors.zinc500, lineHeight: 18 },
  downloadRow: { gap: 6 },
  downloadButton: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: colors.rose800,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  downloadButtonDisabled: { opacity: 0.6 },
  downloadButtonText: { color: colors.white, fontWeight: "700", fontSize: 14 },
  downloadHint: { fontSize: 11, color: colors.zinc500 },
  previewCard: { marginTop: 4 },
  previewLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.zinc500,
    marginBottom: 8,
  },
  previewMeta: { fontSize: 13, color: colors.zinc600, marginBottom: 4 },
  section: {
    marginTop: 16,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.rose100,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.zinc900,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.zinc100,
  },
  rowLabel: { flex: 1, fontSize: 13, color: colors.zinc500 },
  rowValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: colors.zinc900,
    textAlign: "right",
  },
});
