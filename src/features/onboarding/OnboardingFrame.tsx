import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, IconButton, ProgressBar, Text, useTheme } from '@/ui';

export const ONBOARDING_STEPS = 5;

export type OnboardingFrameProps = {
  step: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  primary?: { label: string; onPress: () => void; disabled?: boolean; loading?: boolean };
  secondary?: { label: string; onPress: () => void };
  canGoBack?: boolean;
};

/** Shared onboarding shell: thin progress bar, back, big question, pinned action. */
export function OnboardingFrame({ step, title, subtitle, children, primary, secondary, canGoBack = true }: OnboardingFrameProps) {
  const theme = useTheme();
  const router = useRouter();
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.bg }]} edges={['top', 'left', 'right', 'bottom']}>
      <View style={[styles.top, { paddingHorizontal: theme.spacing.lg }]}>
        {canGoBack ? <IconButton icon="chevron-back" accessibilityLabel="Back" onPress={() => router.back()} /> : <View style={{ width: 44 }} />}
        <View style={styles.progress}>
          <ProgressBar progress={step / ONBOARDING_STEPS} accessibilityLabel={`Step ${step} of ${ONBOARDING_STEPS}`} height={4} />
        </View>
        <View style={{ width: 44 }} />
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: theme.sizes.screenPaddingH, paddingBottom: theme.spacing.xxl, maxWidth: theme.sizes.contentMaxWidth, alignSelf: 'center', width: '100%' }}>
        <Text variant="title1" style={{ marginTop: theme.spacing.xl }}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="callout" color="textSecondary" style={{ marginTop: theme.spacing.sm }}>
            {subtitle}
          </Text>
        ) : null}
        <View style={{ marginTop: theme.spacing.xxl }}>{children}</View>
      </ScrollView>
      {primary || secondary ? (
        <View style={[styles.footer, { paddingHorizontal: theme.sizes.screenPaddingH, gap: theme.spacing.sm, maxWidth: theme.sizes.contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
          {primary ? <Button label={primary.label} size="lg" fullWidth onPress={primary.onPress} disabled={primary.disabled} loading={primary.loading} /> : null}
          {secondary ? <Button label={secondary.label} variant="ghost" onPress={secondary.onPress} style={{ alignSelf: 'center' }} /> : null}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', height: 48, gap: 8 },
  progress: { flex: 1 },
  footer: { paddingTop: 8, paddingBottom: 8 },
});
