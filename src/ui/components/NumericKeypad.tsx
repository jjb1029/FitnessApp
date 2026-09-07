import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme';
import { Button } from './Button';
import { Chip } from './Chip';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { Text } from './Text';

export type NumericKeypadProps = {
  visible: boolean;
  title: string;
  initialValue: number;
  unit?: string;
  allowDecimal?: boolean;
  /** Quick-add chips, e.g. [2.5, 5, 10]. */
  quickAdds?: number[];
  onSubmit: (value: number) => void;
  onClose: () => void;
};

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'] as const;

/** In-app keypad for weight and reps: big keys, quick-add chips, no OS keyboard. */
export function NumericKeypad({ visible, title, initialValue, unit, allowDecimal = true, quickAdds = [], onSubmit, onClose }: NumericKeypadProps) {
  const theme = useTheme();
  const [text, setText] = useState<string | null>(null);
  const current = text ?? formatInitial(initialValue);

  const press = (key: (typeof KEYS)[number]) => {
    const base = text === null ? '' : text; // first key replaces the initial value
    if (key === 'back') {
      setText(base.length > 0 ? base.slice(0, -1) : '');
      return;
    }
    if (key === '.') {
      if (!allowDecimal || base.includes('.')) return;
      setText(base.length === 0 ? '0.' : `${base}.`);
      return;
    }
    if (base.replace('.', '').length >= 5) return;
    setText(base === '0' ? key : `${base}${key}`);
  };

  const submit = () => {
    const n = Number(current);
    if (Number.isFinite(n) && n >= 0) onSubmit(n);
    setText(null);
    onClose();
  };
  const close = () => {
    setText(null);
    onClose();
  };
  const quickAdd = (delta: number) => {
    const n = Number(current) || 0;
    setText(String(Number((n + delta).toFixed(2))));
  };

  return (
    <Sheet visible={visible} onClose={close} title={title}>
      <View style={styles.display} accessible accessibilityLiveRegion="polite" accessibilityLabel={`${current} ${unit ?? ''}`}>
        <Text variant="display" style={styles.displayText}>
          {current || '0'}
        </Text>
        {unit ? (
          <Text variant="title2" color="textSecondary">
            {unit}
          </Text>
        ) : null}
      </View>
      {quickAdds.length > 0 ? (
        <View style={[styles.quick, { marginBottom: theme.spacing.md }]}>
          {quickAdds.map((q) => (
            <Chip key={q} label={`+${q}`} onPress={() => quickAdd(q)} />
          ))}
        </View>
      ) : null}
      <View style={styles.grid}>
        {KEYS.map((key) => {
          const disabled = key === '.' && !allowDecimal;
          return (
            <Pressable
              key={key}
              onPress={() => press(key)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={key === 'back' ? 'Delete' : key}
              style={({ pressed }) => [
                styles.key,
                {
                  backgroundColor: pressed ? theme.colors.border : theme.colors.bgSunken,
                  borderRadius: theme.radius.md,
                  opacity: disabled ? 0.3 : 1,
                },
              ]}>
              {key === 'back' ? <Icon name="backspace-outline" /> : <Text variant="title2">{key}</Text>}
            </Pressable>
          );
        })}
      </View>
      <Button label="Done" size="lg" fullWidth onPress={submit} style={{ marginTop: theme.spacing.md }} />
    </Sheet>
  );
}

function formatInitial(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
}

const styles = StyleSheet.create({
  display: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 8, paddingVertical: 8 },
  displayText: { fontVariant: ['tabular-nums'] },
  quick: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  key: { width: '31.5%', height: 64, alignItems: 'center', justifyContent: 'center' },
});
