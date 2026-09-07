import { useState } from 'react';
import { View } from 'react-native';

import { buildExplanation } from '@/engine';
import { useUiStore } from '@/store/uiStore';
import {
  Button,
  Card,
  Chip,
  ExplainableValue,
  IconButton,
  ListRow,
  NumericKeypad,
  ProgressBar,
  Screen,
  SectionHeader,
  Sheet,
  Skeleton,
  StatusPill,
  Stepper,
  Text,
  TextField,
  Toggle,
  WhySheet,
  useTheme,
  useToast,
  EmptyState,
  ErrorState,
} from '@/ui';

/** Dev-only gallery: every component with realistic data, both themes. */
export function GalleryScreen() {
  const theme = useTheme();
  const toast = useToast();
  const themePreference = useUiStore((s) => s.themePreference);
  const setThemePreference = useUiStore((s) => s.setThemePreference);

  const [weight, setWeight] = useState(80);
  const [reps, setReps] = useState(10);
  const [rir, setRir] = useState(2);
  const [chip, setChip] = useState<'gym' | 'home' | 'both'>('gym');
  const [toggle, setToggle] = useState(true);
  const [sheet, setSheet] = useState(false);
  const [keypad, setKeypad] = useState(false);
  const [why, setWhy] = useState(false);
  const [text, setText] = useState('');

  const explanation = buildExplanation({
    ruleId: 'progression.double.increase_load',
    factors: [
      { label: 'Last time', value: '75 × 12 · 12 · 12 @ 2 RIR' },
      { label: 'Target', value: '8–12 reps @ 1–2 RIR' },
    ],
    evidence: [
      { kind: 'set', performedSetId: 'demo-1', date: '2026-09-04', label: '75 lb × 12 @ 2 RIR' },
      { kind: 'set', performedSetId: 'demo-2', date: '2026-09-04', label: '75 lb × 12 @ 2 RIR' },
      { kind: 'set', performedSetId: 'demo-3', date: '2026-09-04', label: '75 lb × 12 @ 2 RIR' },
    ],
    counterfactual: 'If you get fewer than 8 reps at 80 lb, I will keep 80 and aim for the bottom of the range next time.',
    alternatives: [{ label: 'Keep 75 lb and add a rep', reason: 'Not chosen because every set already reached the top of the range.' }],
  });

  return (
    <Screen edges={['left', 'right']}>
      <SectionHeader title="Theme" />
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
        {(['system', 'light', 'dark'] as const).map((p) => (
          <Chip key={p} label={p} selected={themePreference === p} onPress={() => setThemePreference(p)} />
        ))}
      </View>

      <SectionHeader title="Typography" />
      <Text variant="display">Display 34</Text>
      <Text variant="title1">Title 1 · 28</Text>
      <Text variant="title2">Title 2 · 22</Text>
      <Text variant="headline">Headline 17</Text>
      <Text variant="body">Body 17. The quick brown fox jumps over the lazy dog.</Text>
      <Text variant="callout" color="textSecondary">
        Callout 15 secondary
      </Text>
      <Text variant="caption" color="textTertiary">
        Caption 13 tertiary
      </Text>
      <Text variant="mono">Mono 80 × 10 · 2 RIR</Text>

      <SectionHeader title="Buttons" />
      <View style={{ gap: theme.spacing.sm }}>
        <Button label="Start workout" size="lg" fullWidth onPress={() => toast.show({ message: 'Started', action: { label: 'Undo', onPress: () => undefined } })} />
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
          <Button label="Secondary" variant="secondary" onPress={() => undefined} />
          <Button label="Ghost" variant="ghost" onPress={() => undefined} />
          <Button label="Discard" variant="destructive" onPress={() => undefined} />
          <Button label="Loading" loading onPress={() => undefined} />
          <Button label="Disabled" disabled onPress={() => undefined} />
          <Button label="With icon" icon="checkmark" onPress={() => undefined} />
          <IconButton icon="ellipsis-horizontal" accessibilityLabel="More" onPress={() => undefined} filled />
        </View>
      </View>

      <SectionHeader title="Chips" />
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
        <Chip label="Gym" selected={chip === 'gym'} onPress={() => setChip('gym')} />
        <Chip label="Home" selected={chip === 'home'} onPress={() => setChip('home')} />
        <Chip label="Both" selected={chip === 'both'} onPress={() => setChip('both')} />
        <Chip label="Disabled" disabled />
        <Chip label="With icon" icon="barbell-outline" onPress={() => undefined} />
      </View>

      <SectionHeader title="Status" />
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
        <StatusPill label="In range" tone="success" />
        <StatusPill label="Plateau" tone="warning" />
        <StatusPill label="Discomfort" tone="danger" />
        <StatusPill label="Next" tone="accent" icon="play" />
        <StatusPill label="Rest day" />
      </View>
      <View style={{ marginTop: theme.spacing.md }}>
        <ProgressBar progress={5 / 14} accessibilityLabel="5 of 14 sets" />
      </View>

      <SectionHeader title="Card and rows" />
      <Card>
        <Text variant="label" color="textSecondary">
          TODAY
        </Text>
        <Text variant="title1">Upper A</Text>
        <Text variant="callout" color="textSecondary">
          6 exercises · about 55 min
        </Text>
        <Button label="Start workout" size="lg" fullWidth style={{ marginTop: theme.spacing.lg }} onPress={() => undefined} />
      </Card>
      <Card padded={false} style={{ marginTop: theme.spacing.md, paddingHorizontal: theme.spacing.lg }}>
        <ListRow title="Bodyweight" subtitle="↓ 0.4 lb this week" value="182.4 lb" icon="scale-outline" onPress={() => undefined} />
        <ListRow title="Strength" subtitle="Mean e1RM change, 30 days" value="+2.1 %" icon="trending-up-outline" onPress={() => undefined} />
        <ListRow title="This week" subtitle="2 of 4 sessions done" icon="calendar-outline" />
      </Card>

      <SectionHeader title="Explainable value" />
      <Card>
        <ExplainableValue label="Incline DB Press" value="80 lb" delta="↑ 5" deltaTone="up" onPressWhy={() => setWhy(true)} />
        <ExplainableValue label="Lat Pulldown" value="140 lb" delta="+1 rep" deltaTone="neutral" onPressWhy={() => setWhy(true)} />
        <ExplainableValue label="Cable Row" value="120 lb" delta="keep" onPressWhy={() => setWhy(true)} compact />
      </Card>

      <SectionHeader title="Workout dock controls" />
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        <Stepper value={weight} onChange={setWeight} step={5} unit="lb" accessibilityLabel="Weight" onPressValue={() => setKeypad(true)} style={{ flex: 42 }} />
        <Stepper value={reps} onChange={setReps} step={1} unit="reps" accessibilityLabel="Reps" style={{ flex: 34 }} />
        <Stepper value={rir} onChange={setRir} step={1} max={5} unit="RIR" emphasis="secondary" accessibilityLabel="Reps in reserve" style={{ flex: 24 }} />
      </View>
      <Button label="Complete set" icon="checkmark" size="lg" fullWidth style={{ marginTop: theme.spacing.sm }} onPress={() => toast.show({ message: 'Set 2 logged · 80 lb × 10' })} />

      <SectionHeader title="Inputs" />
      <TextField label="Session note" placeholder="How did it feel?" value={text} onChangeText={setText} hint="Optional" />
      <Toggle label="Auto-start rest timer" description="Starts when you complete a set" value={toggle} onValueChange={setToggle} />

      <SectionHeader title="Sheets" />
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
        <Button label="Open sheet" variant="secondary" onPress={() => setSheet(true)} />
        <Button label="Open keypad" variant="secondary" onPress={() => setKeypad(true)} />
        <Button label="Open Why sheet" variant="secondary" onPress={() => setWhy(true)} />
      </View>

      <SectionHeader title="States" />
      <View style={{ gap: theme.spacing.sm }}>
        <Skeleton height={20} width="60%" />
        <Skeleton height={14} />
        <Skeleton height={14} width="80%" />
      </View>
      <Card style={{ marginTop: theme.spacing.md }}>
        <EmptyState title="Your sessions will appear here" message="Start a workout to log your first one." action={{ label: 'Start workout', onPress: () => undefined }} />
      </Card>
      <Card style={{ marginTop: theme.spacing.md }}>
        <ErrorState message="Couldn't save that set." onRetry={() => undefined} />
      </Card>

      <Sheet visible={sheet} onClose={() => setSheet(false)} title="Why swap Incline Dumbbell Press?">
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
          {['Equipment unavailable', "Don't like it", 'Discomfort', 'Too hard', 'Too easy', 'Variety'].map((r) => (
            <Chip key={r} label={r} onPress={() => setSheet(false)} />
          ))}
        </View>
      </Sheet>
      <NumericKeypad visible={keypad} title="Weight" initialValue={weight} unit="lb" quickAdds={[2.5, 5, 10]} onSubmit={setWeight} onClose={() => setKeypad(false)} />
      <WhySheet
        visible={why}
        onClose={() => setWhy(false)}
        title="Increase to 80 lb"
        explanation={explanation}
        knowledgeItems={[{ id: 'progressive-overload.double-progression', title: 'Double progression', claimType: 'recommendation', evidenceQuality: 'moderate', status: 'draft' }]}
      />
    </Screen>
  );
}
