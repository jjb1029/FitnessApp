import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import type { Explanation } from '@/domain';

import { useTheme } from '../theme';
import { Button } from './Button';
import { Sheet } from './Sheet';
import { StatusPill } from './StatusPill';
import { Text } from './Text';

export type KnowledgeItemSummary = {
  id: string;
  title: string;
  claimType: string;
  evidenceQuality: string;
  status: string;
};

export type WhySheetProps = {
  visible: boolean;
  onClose: () => void;
  /** Restates the recommendation, e.g. "Increase to 80 lb". */
  title: string;
  explanation: Explanation | null;
  /** Resolved Tier 3 items; the sheet renders what it is given. */
  knowledgeItems?: KnowledgeItemSummary[];
};

/**
 * The single renderer for every Explanation (docs/12). Tier 1 by default,
 * Tier 2 on "Show details", Tier 3 on "Learn more". Screens never assemble
 * explanation text themselves.
 */
export function WhySheet({ visible, onClose, title, explanation, knowledgeItems = [] }: WhySheetProps) {
  const theme = useTheme();
  const [tier, setTier] = useState<1 | 2 | 3>(1);
  const close = () => {
    setTier(1);
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={close} title={title} testID="why-sheet">
      {explanation ? (
        <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: theme.spacing.lg }}>
          <Text variant="body">{explanation.short}</Text>

          {explanation.factors.length > 0 ? (
            <View style={[styles.factors, { backgroundColor: theme.colors.bgSunken, borderRadius: theme.radius.md, padding: theme.spacing.md }]}>
              {explanation.factors.map((f) => (
                <View key={f.label} style={styles.factorRow} accessible accessibilityLabel={`${f.label}, ${f.value}${f.unit ? ` ${f.unit}` : ''}`}>
                  <Text variant="caption" color="textSecondary" style={styles.factorLabel}>
                    {f.label}
                  </Text>
                  <Text variant="mono">
                    {f.value}
                    {f.unit ? ` ${f.unit}` : ''}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {tier >= 2 ? <Tier2 explanation={explanation} /> : null}
          {tier >= 3 ? <Tier3 explanation={explanation} items={knowledgeItems} /> : null}

          <View style={[styles.actions, { gap: theme.spacing.sm }]}>
            <Button label="Got it" size="lg" fullWidth onPress={close} />
            {tier === 1 ? <Button label="Show details" variant="ghost" onPress={() => setTier(2)} /> : null}
            {tier === 2 ? <Button label="Learn more" variant="ghost" onPress={() => setTier(3)} /> : null}
          </View>
        </ScrollView>
      ) : (
        <View style={{ gap: theme.spacing.lg }}>
          <Text variant="body" color="textSecondary">
            No explanation is available for this value.
          </Text>
          <Button label="Got it" size="lg" fullWidth onPress={close} />
        </View>
      )}
    </Sheet>
  );
}

function Tier2({ explanation }: { explanation: Explanation }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.lg }}>
      {explanation.evidence.length > 0 ? (
        <Section title="What I looked at">
          {explanation.evidence.map((e, i) => (
            <View key={`${e.kind}-${i}`} style={styles.evidenceRow}>
              <Text variant="caption" color="textTertiary" style={styles.evidenceDate}>
                {'date' in e ? e.date : ''}
              </Text>
              <Text variant="callout">{e.label}</Text>
            </View>
          ))}
        </Section>
      ) : null}
      <Section title="The rule">
        <Text variant="headline">{explanation.rule.name}</Text>
        <Text variant="callout" color="textSecondary">
          {explanation.rule.description}
        </Text>
      </Section>
      {explanation.counterfactual ? (
        <Section title="What would change this">
          <Text variant="callout">{explanation.counterfactual}</Text>
        </Section>
      ) : null}
      {explanation.alternatives && explanation.alternatives.length > 0 ? (
        <Section title="Other options considered">
          {explanation.alternatives.map((a) => (
            <View key={a.label} style={{ gap: 2 }}>
              <Text variant="callout">{a.label}</Text>
              <Text variant="caption" color="textSecondary">
                {a.reason}
              </Text>
            </View>
          ))}
        </Section>
      ) : null}
      {explanation.overrideNote ? (
        <Section title="Your overrides">
          <Text variant="callout">{explanation.overrideNote}</Text>
        </Section>
      ) : null}
    </View>
  );
}

function Tier3({ explanation, items }: { explanation: Explanation; items: KnowledgeItemSummary[] }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.lg }}>
      <Section title="Learn more">
        {items.length === 0 ? (
          <Text variant="callout" color="textSecondary">
            No linked knowledge items yet.
          </Text>
        ) : (
          items.map((item) => (
            <View key={item.id} style={{ gap: 6 }}>
              <Text variant="callout">{item.title}</Text>
              <View style={styles.pills}>
                <StatusPill label={item.status === 'reviewed' || item.status === 'published' ? item.claimType : 'general guidance'} tone={item.status === 'reviewed' || item.status === 'published' ? 'accent' : 'neutral'} icon="book-outline" />
                <StatusPill label={`evidence: ${item.evidenceQuality}`} tone="neutral" icon="analytics-outline" />
              </View>
            </View>
          ))
        )}
      </Section>
      <Text variant="caption" color="textTertiary">
        Rule {explanation.ruleId} · engine {explanation.engineVersion} · confidence {explanation.confidence}
      </Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Text variant="label" color="textSecondary">
        {title.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  factors: { gap: 8 },
  factorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  factorLabel: { flex: 1 },
  actions: { paddingTop: 4 },
  evidenceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  evidenceDate: { width: 84 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
