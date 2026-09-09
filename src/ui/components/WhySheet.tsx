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
  /** The decision itself, e.g. "80 lb today" or "Hack squat instead". */
  title: string;
  explanation: Explanation | null;
  /** Resolved Tier 3 items; the sheet renders what it is given. */
  knowledgeItems?: KnowledgeItemSummary[];
};

/**
 * The single renderer for every Explanation (docs/12, docs/14 §2). Forma
 * explaining its thinking: Tier 1 is the reason plus what would change its
 * mind; "Show more" reveals what it saw and how it decides; "Where this comes
 * from" lists the knowledge behind the rule.
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

          {explanation.counterfactual ? (
            <Section title="What changes my mind">
              <Text variant="callout">{explanation.counterfactual}</Text>
            </Section>
          ) : null}

          {tier >= 2 ? <Tier2 explanation={explanation} /> : null}
          {tier >= 3 ? <Tier3 explanation={explanation} items={knowledgeItems} /> : null}

          <View style={[styles.actions, { gap: theme.spacing.sm }]}>
            <Button label="Got it" size="lg" fullWidth onPress={close} />
            {tier === 1 ? <Button label="Show more" variant="ghost" onPress={() => setTier(2)} /> : null}
            {tier === 2 ? <Button label="Where this comes from" variant="ghost" onPress={() => setTier(3)} /> : null}
          </View>
        </ScrollView>
      ) : (
        <View style={{ gap: theme.spacing.lg }}>
          <Text variant="body" color="textSecondary">
            I do not have an explanation for this one.
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
        <Section title="What I saw">
          {explanation.evidence.map((e, i) => (
            <View key={`${e.kind}-${i}`} style={styles.evidenceRow}>
              {'date' in e ? (
                <Text variant="caption" color="textTertiary" style={styles.evidenceDate}>
                  {e.date}
                </Text>
              ) : null}
              <Text variant="callout" style={{ flex: 1 }}>
                {e.label}
              </Text>
            </View>
          ))}
        </Section>
      ) : null}
      <Section title="How I decide">
        <Text variant="headline">{explanation.rule.name}</Text>
        <Text variant="callout" color="textSecondary">
          {explanation.rule.description}
        </Text>
      </Section>
      {explanation.alternatives && explanation.alternatives.length > 0 ? (
        <Section title="What else I considered">
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
        <Section title="What you taught me">
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
      <Section title="Where this comes from">
        {items.length === 0 ? (
          <Text variant="callout" color="textSecondary">
            The knowledge behind this rule is still being written up.
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
