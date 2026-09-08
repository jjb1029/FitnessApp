import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import type { LoadedExercise } from '@/data/repositories';
import type { Exercise, IntensityScale, SkipReason, SwapReason } from '@/domain';
import { rankSubstitutes, type RankedSubstitute } from '@/engine';
import { Button, Card, Chip, ListRow, Sheet, Text, TextField, useTheme, WhySheet } from '@/ui';

import { effortLabel, effortValue } from './format';

// ---------- RIR ----------

export function RirSheet({ visible, value, scale, onSelect, onClose }: { visible: boolean; value: number | null; scale: IntensityScale; onSelect: (rir: number | null) => void; onClose: () => void }) {
  const theme = useTheme();
  const options = [0, 1, 2, 3, 4, 5];
  return (
    <Sheet visible={visible} onClose={onClose} title={scale === 'rpe' ? 'How hard was that set?' : 'Reps left in the tank?'}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        {options.map((rir) => (
          <Chip
            key={rir}
            label={`${effortLabel(scale)} ${rir === 5 && scale === 'rir' ? '5+' : effortValue(rir, scale)}`}
            selected={value === rir}
            onPress={() => {
              onSelect(rir);
              onClose();
            }}
          />
        ))}
        <Chip
          label="Not sure"
          selected={value === null}
          onPress={() => {
            onSelect(null);
            onClose();
          }}
        />
      </View>
      <Text variant="caption" color="textTertiary" style={{ marginTop: theme.spacing.md }}>
        {scale === 'rpe' ? 'RPE 10 is nothing left. RPE 8 is two more reps possible.' : '0 RIR is nothing left. 2 RIR is two more reps possible. Optional.'}
      </Text>
    </Sheet>
  );
}

// ---------- Skip ----------

const SKIP: { reason: SkipReason; label: string }[] = [
  { reason: 'no_time', label: 'No time' },
  { reason: 'equipment_busy', label: 'Equipment busy' },
  { reason: 'not_feeling_it', label: 'Not feeling it' },
  { reason: 'discomfort', label: 'Discomfort' },
];

export function SkipSheet({ visible, exerciseName, onSkip, onClose }: { visible: boolean; exerciseName: string; onSkip: (reason: SkipReason) => void; onClose: () => void }) {
  const theme = useTheme();
  return (
    <Sheet visible={visible} onClose={onClose} title={`Skip ${exerciseName}?`}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        {SKIP.map((s) => (
          <Chip key={s.reason} label={s.label} onPress={() => onSkip(s.reason)} />
        ))}
      </View>
      <Button label="Keep it" variant="ghost" onPress={onClose} style={{ marginTop: theme.spacing.md, alignSelf: 'center' }} />
    </Sheet>
  );
}

// ---------- Swap ----------

const SWAP: { reason: SwapReason; label: string }[] = [
  { reason: 'equipment', label: 'Equipment unavailable' },
  { reason: 'dislike', label: "Don't like it" },
  { reason: 'discomfort', label: 'Discomfort' },
  { reason: 'too_hard', label: 'Too hard' },
  { reason: 'too_easy', label: 'Too easy' },
  { reason: 'variety', label: 'Variety' },
];

export type SwapSheetProps = {
  visible: boolean;
  item: LoadedExercise | null;
  candidates: Exercise[];
  availableEquipment: Set<Exercise['equipmentIds'][number]>;
  onSwap: (to: Exercise, reason: SwapReason, scope: 'session' | 'program') => void;
  onClose: () => void;
};

export function SwapSheet({ visible, item, candidates, availableEquipment, onSwap, onClose }: SwapSheetProps) {
  const theme = useTheme();
  const [reason, setReason] = useState<SwapReason | null>(null);
  const [scope, setScope] = useState<'session' | 'program'>('session');
  const [why, setWhy] = useState<RankedSubstitute | null>(null);
  const [search, setSearch] = useState('');
  const [manual, setManual] = useState(false);

  const close = () => {
    setReason(null);
    setScope('session');
    setManual(false);
    setSearch('');
    onClose();
  };
  const choose = (to: Exercise, r: SwapReason, s: 'session' | 'program') => {
    setReason(null);
    setScope('session');
    setManual(false);
    setSearch('');
    onSwap(to, r, s);
  };

  const ranked = useMemo(() => {
    if (!item || !reason) return [];
    return rankSubstitutes({ source: item.exercise, reason, candidates, availableEquipment, repRange: item.targetSnapshot.repRange, limit: 5 });
  }, [item, reason, candidates, availableEquipment]);

  const manualList = useMemo(() => {
    const q = search.trim().toLowerCase();
    return candidates.filter((c) => c.id !== item?.exercise.id && (q.length === 0 || c.name.toLowerCase().includes(q) || c.aliases.some((a) => a.toLowerCase().includes(q)))).slice(0, 30);
  }, [candidates, search, item]);

  if (!item) return null;

  return (
    <Sheet visible={visible} onClose={close} title={reason ? `Instead of ${item.exercise.name}` : `Why swap ${item.exercise.name}?`}>
      {!reason ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          {SWAP.map((s) => (
            <Chip key={s.reason} label={s.label} onPress={() => setReason(s.reason)} />
          ))}
        </View>
      ) : (
        <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
          {reason === 'discomfort' ? (
            <Text variant="caption" color="textSecondary" style={{ marginBottom: theme.spacing.md }}>
              If this is pain rather than discomfort, consider speaking with a professional.
            </Text>
          ) : null}
          {!manual ? (
            <View style={{ gap: theme.spacing.sm }}>
              {ranked.length === 0 ? (
                <Text variant="callout" color="textSecondary">
                  No close match with your equipment. Search all exercises instead.
                </Text>
              ) : null}
              {ranked.map((r) => (
                <Card key={r.exercise.id} onPress={() => choose(r.exercise, reason, scope)} style={{ paddingVertical: theme.spacing.md }}>
                  <View style={styles.rowBetween}>
                    <Text variant="headline" style={{ flex: 1 }}>
                      {r.exercise.name}
                    </Text>
                    <Text variant="mono" color="accent">
                      {r.score}% similar
                    </Text>
                  </View>
                  <View style={[styles.rowBetween, { marginTop: 2 }]}>
                    <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
                      {r.reasonLine}
                    </Text>
                    <Button label="Why?" variant="ghost" onPress={() => setWhy(r)} />
                  </View>
                </Card>
              ))}
            </View>
          ) : (
            <View style={{ gap: theme.spacing.sm }}>
              <TextField placeholder="Search exercises" value={search} onChangeText={setSearch} autoFocus />
              {manualList.map((c) => (
                <ListRow key={c.id} title={c.name} subtitle={c.equipmentIds.join(', ')} onPress={() => choose(c, reason, scope)} chevron={false} />
              ))}
            </View>
          )}
          <View style={[styles.rowBetween, { marginTop: theme.spacing.lg }]}>
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              <Chip label="Just today" selected={scope === 'session'} onPress={() => setScope('session')} />
              <Chip label="Update my program" selected={scope === 'program'} onPress={() => setScope('program')} />
            </View>
          </View>
          <Button label={manual ? 'Back to suggestions' : 'Search all exercises'} variant="ghost" onPress={() => setManual((m) => !m)} style={{ alignSelf: 'center', marginTop: theme.spacing.sm }} />
        </ScrollView>
      )}
      <WhySheet visible={why !== null} onClose={() => setWhy(null)} title={why ? `${why.exercise.name} · ${why.score}% similar` : ''} explanation={why?.explanation ?? null} />
    </Sheet>
  );
}

// ---------- Note ----------

export function NoteSheet({ visible, title, initial, onSave, onClose }: { visible: boolean; title: string; initial: string | null; onSave: (text: string | null) => void; onClose: () => void }) {
  const theme = useTheme();
  // The parent remounts this sheet (via `key`) when the exercise or its note changes.
  const [text, setText] = useState(initial ?? '');
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <View style={[styles.noteBox, { backgroundColor: theme.colors.bgSunken, borderColor: theme.colors.border, borderRadius: theme.radius.md }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Felt heavy, left shoulder tight, try a wider grip…"
          placeholderTextColor={theme.colors.textTertiary}
          multiline
          autoFocus
          style={[theme.typography.body, { color: theme.colors.text, minHeight: 96, textAlignVertical: 'top' }]}
        />
      </View>
      <Button
        label="Save note"
        size="lg"
        fullWidth
        onPress={() => {
          onSave(text.trim().length > 0 ? text.trim() : null);
          onClose();
        }}
        style={{ marginTop: theme.spacing.md }}
      />
    </Sheet>
  );
}

// ---------- Exercise menu and info ----------

export function ExerciseMenuSheet({ visible, item, onClose, onInfo, onSwap, onNote, onSkip, onRest }: { visible: boolean; item: LoadedExercise | null; onClose: () => void; onInfo: () => void; onSwap: () => void; onNote: () => void; onSkip: () => void; onRest: (seconds: number | null) => void }) {
  const theme = useTheme();
  if (!item) return null;
  const current = item.restSecondsOverride ?? item.targetSnapshot.restSeconds;
  const options = [60, 90, 120, 150, 180, 240];
  return (
    <Sheet visible={visible} onClose={onClose} title={item.exercise.name}>
      <ListRow title="How to do it" subtitle="Setup, execution, cues" icon="information-circle-outline" onPress={onInfo} />
      <ListRow title="Swap exercise" icon="swap-horizontal" onPress={onSwap} />
      <ListRow title="Add a note" icon="create-outline" onPress={onNote} />
      <ListRow title="Skip exercise" icon="remove-circle-outline" onPress={onSkip} />
      <Text variant="label" color="textSecondary" style={{ marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm }}>
        REST FOR THIS EXERCISE
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        {options.map((s) => (
          <Chip key={s} label={`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`} selected={current === s} onPress={() => onRest(s === item.targetSnapshot.restSeconds ? null : s)} />
        ))}
      </View>
    </Sheet>
  );
}

export function ExerciseInfoSheet({ visible, exercise, onClose }: { visible: boolean; exercise: Exercise | null; onClose: () => void }) {
  const theme = useTheme();
  if (!exercise) return null;
  const section = (title: string, lines: string[]) =>
    lines.length === 0 ? null : (
      <View style={{ gap: 4 }}>
        <Text variant="label" color="textSecondary">
          {title}
        </Text>
        {lines.map((l, i) => (
          <Text key={i} variant="callout">
            {title === 'CUES' || title === 'COMMON MISTAKES' ? '• ' : `${i + 1}. `}
            {l}
          </Text>
        ))}
      </View>
    );
  return (
    <Sheet visible={visible} onClose={onClose} title={exercise.name}>
      <ScrollView style={{ maxHeight: 480 }} contentContainerStyle={{ gap: theme.spacing.lg }} showsVerticalScrollIndicator={false}>
        <Text variant="caption" color="textSecondary">
          {exercise.muscles
            .filter((m) => m.role === 'primary')
            .map((m) => m.muscleId.replace(/_/g, ' '))
            .join(', ')}{' '}
          · {exercise.movementPattern.replace(/_/g, ' ')} · {exercise.equipmentIds.join(', ')}
        </Text>
        {section('SETUP', exercise.instructions.setup)}
        {section('EXECUTION', exercise.instructions.execution)}
        {section('CUES', exercise.instructions.cues)}
        {section('COMMON MISTAKES', exercise.instructions.commonMistakes)}
        <Button label="Got it" size="lg" fullWidth onPress={onClose} />
      </ScrollView>
    </Sheet>
  );
}

// ---------- Session menu ----------

export function SessionMenuSheet({ visible, onClose, onFinish, onAddExercise, onDiscard, autoRest, onToggleAutoRest }: { visible: boolean; onClose: () => void; onFinish: () => void; onAddExercise: () => void; onDiscard: () => void; autoRest: boolean; onToggleAutoRest: () => void }) {
  const theme = useTheme();
  return (
    <Sheet visible={visible} onClose={onClose} title="This workout">
      <ListRow title="Finish workout" icon="checkmark-done-outline" onPress={onFinish} />
      <ListRow title="Add exercise" icon="add-circle-outline" onPress={onAddExercise} />
      <ListRow title={autoRest ? 'Rest timer: auto-start on' : 'Rest timer: auto-start off'} subtitle="Tap to change for this session" icon="timer-outline" onPress={onToggleAutoRest} chevron={false} />
      <Button label="Discard workout" variant="destructive" onPress={onDiscard} style={{ marginTop: theme.spacing.lg, alignSelf: 'center' }} />
    </Sheet>
  );
}

export function AddExerciseSheet({ visible, candidates, onPick, onClose }: { visible: boolean; candidates: Exercise[]; onPick: (e: Exercise) => void; onClose: () => void }) {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const close = () => {
    setSearch('');
    onClose();
  };
  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return candidates.filter((c) => q.length === 0 || c.name.toLowerCase().includes(q) || c.aliases.some((a) => a.toLowerCase().includes(q))).slice(0, 30);
  }, [candidates, search]);
  return (
    <Sheet visible={visible} onClose={close} title="Add exercise">
      <TextField placeholder="Search exercises" value={search} onChangeText={setSearch} autoFocus />
      <ScrollView style={{ maxHeight: 400, marginTop: theme.spacing.sm }} keyboardShouldPersistTaps="handled">
        {list.map((c) => (
          <ListRow
            key={c.id}
            title={c.name}
            subtitle={c.equipmentIds.join(', ')}
            onPress={() => {
              setSearch('');
              onPick(c);
            }}
            chevron={false}
          />
        ))}
      </ScrollView>
    </Sheet>
  );
}

export function ConfirmSheet({ visible, title, message, confirmLabel, destructive, onConfirm, onClose }: { visible: boolean; title: string; message: string; confirmLabel: string; destructive?: boolean; onConfirm: () => void; onClose: () => void }) {
  const theme = useTheme();
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <Text variant="body" color="textSecondary">
        {message}
      </Text>
      <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.lg }}>
        <Button label={confirmLabel} size="lg" fullWidth variant={destructive ? 'destructive' : 'primary'} onPress={onConfirm} />
        <Button label="Keep going" variant="ghost" onPress={onClose} style={{ alignSelf: 'center' }} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  noteBox: { borderWidth: StyleSheet.hairlineWidth, padding: 12 },
});
