import { StyleSheet, Text, View } from "react-native";
import type { TermsSection, TermsSubsection } from "@easymatch/shared";
import { colors } from "../theme/colors";

type BlockProps = {
  section: TermsSection | TermsSubsection;
  nested?: boolean;
};

export function TermsSectionBlock({ section, nested = false }: BlockProps) {
  const hasSubsections = "subsections" in section && (section.subsections?.length ?? 0) > 0;

  return (
    <View style={nested ? styles.nested : undefined}>
      {section.title ? (
        <Text style={nested ? styles.subsectionTitle : styles.sectionTitle}>
          {section.title}
        </Text>
      ) : null}

      {"intro" in section && section.intro ? (
        <Text style={styles.paragraph}>{section.intro}</Text>
      ) : null}

      {section.paragraphs?.map((paragraph) => (
        <Text key={paragraph} style={styles.paragraph}>
          {paragraph}
        </Text>
      ))}

      {section.bullets?.map((item) => (
        <View key={item} style={styles.bulletRow}>
          <Text style={styles.bulletMarker}>•</Text>
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}

      {hasSubsections
        ? section.subsections!.map((subsection) => (
            <TermsSectionBlock
              key={subsection.title}
              section={subsection}
              nested
            />
          ))
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  nested: {
    marginTop: 8,
    marginLeft: 8,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: colors.rose100,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.zinc900,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.zinc900,
    marginTop: 4,
  },
  paragraph: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: colors.zinc700,
  },
  bulletRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
    paddingRight: 4,
  },
  bulletMarker: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.zinc700,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: colors.zinc700,
  },
});
