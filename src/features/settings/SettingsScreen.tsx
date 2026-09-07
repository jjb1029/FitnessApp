import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { features } from '@/config/flags';
import { resetOnboarding, updateUserSettings } from '@/data/repositories';
import type { UserSettings } from '@/domain';
import { useOnboardingStore } from '@/store/onboardingStore';
import { Button, Card, Chip, ListRow, Screen, SectionHeader, Text, Toggle, useTheme, useToast } from '@/ui';

import { useCurrentUser } from '../app/UserProvider';

export function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { user, refresh } = useCurrentUser();
  const s = user.settings;

  const update = async (patch: Partial<UserSettings>) => {
    await updateUserSettings(user.id, patch);
    refresh();
  };

  return (
    <Screen edges={['left', 'right']}>
      <SectionHeader title="Units and display" />
      <Card padded={false} style={{ paddingHorizontal: theme.spacing.lg, gap: theme.spacing.md, paddingVertical: theme.spacing.md }}>
        <ChipRow label="Weight" options={[{ value: 'lb', label: 'lb' }, { value: 'kg', label: 'kg' }]} value={s.unitWeight} onChange={(v) => update({ unitWeight: v, unitLength: v === 'lb' ? 'in' : 'cm' })} />
        <ChipRow label="Effort scale" options={[{ value: 'rir', label: 'RIR' }, { value: 'rpe', label: 'RPE' }]} value={s.intensityScale} onChange={(v) => update({ intensityScale: v })} />
        <ChipRow label="Theme" options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} value={s.theme} onChange={(v) => update({ theme: v })} />
        <Toggle label="Advanced mode" description="Shows RIR, estimated 1RM, and rule details by default" value={s.advancedMode} onValueChange={(v) => update({ advancedMode: v })} />
      </Card>

      <SectionHeader title="Workout" />
      <Card padded={false} style={{ paddingHorizontal: theme.spacing.lg }}>
        <Toggle label="Auto-start rest timer" description="Starts when you complete a set" value={s.restTimerAutoStart} onValueChange={(v) => update({ restTimerAutoStart: v })} />
        <Toggle label="Timer sound" value={s.restTimerSound} onValueChange={(v) => update({ restTimerSound: v })} />
        <Toggle label="Haptics" value={s.haptics} onValueChange={(v) => update({ haptics: v })} />
        <Toggle label="Keep screen awake during workouts" value={s.keepAwakeDuringWorkout} onValueChange={(v) => update({ keepAwakeDuringWorkout: v })} />
      </Card>

      <SectionHeader title="Data" />
      <Card padded={false} style={{ paddingHorizontal: theme.spacing.lg }}>
        <ListRow title="Backup" subtitle="Your phone's system backup includes this app's data. Export arrives in a later build." icon="cloud-outline" chevron={false} />
      </Card>

      <SectionHeader title="About" />
      <Card padded={false} style={{ paddingHorizontal: theme.spacing.lg }}>
        <ListRow title="Version" value={Constants.expoConfig?.version ?? '0.1.0'} icon="information-circle-outline" chevron={false} />
        <Toggle label="Crash reporting" description="Off until a reporting service is configured" value={s.crashReportingOptIn} onValueChange={(v) => update({ crashReportingOptIn: v })} disabled />
      </Card>

      {features.gallery ? (
        <>
          <SectionHeader title="Developer" />
          <View style={{ gap: theme.spacing.sm }}>
            <Button label="Component gallery" variant="secondary" onPress={() => router.push('/dev/gallery')} />
            <Button
              label="Reset onboarding"
              variant="destructive"
              onPress={async () => {
                useOnboardingStore.getState().reset();
                await resetOnboarding(user.id);
                refresh();
                toast.show({ message: 'Onboarding reset' });
              }}
            />
          </View>
        </>
      ) : null}
    </Screen>
  );
}

function ChipRow<T extends string>({ label, options, value, onChange }: { label: string; options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Text variant="label" color="textSecondary">
        {label.toUpperCase()}
      </Text>
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
        {options.map((o) => (
          <Chip key={o.value} label={o.label} selected={value === o.value} onPress={() => onChange(o.value)} />
        ))}
      </View>
    </View>
  );
}
