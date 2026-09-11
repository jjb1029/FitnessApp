import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '../theme';
import type { TypographyName } from '../tokens';
import { Text } from './Text';

/**
 * `screen` owns the surface (the Today block, the finish verdict), `section`
 * owns a region (the current action, rest), `row` is one line in a list of
 * decisions (next-time targets).
 */
export type DecisionRank = 'screen' | 'section' | 'row';

export type DecisionEyebrow = {
  text: string;
  /** `accent` means Forma changed something since last time. That is the tell. */
  tone?: 'secondary' | 'accent';
  /** `label` is the uppercase category; `title` names a specific thing, e.g. an exercise. */
  variant?: 'label' | 'title';
};

export type DecisionDoor = {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
};

export type DecisionBlockProps = {
  rank: DecisionRank;
  eyebrow?: DecisionEyebrow;
  /** `row` only: what the decision is about, e.g. the exercise name. */
  leading?: string;
  /**
   * The decision itself. Strings take the rank's size; pass a node to control
   * it. Omitted only when the lead is a control rendered below the block — the
   * dock keeps its numbers beneath a changing stage so they never move.
   */
  lead?: ReactNode;
  /** What the decision is based on, in the user's own numbers. */
  basis?: ReactNode;
  /**
   * Basis sits under the lead by default. `above` is only for blocks whose
   * lead is a live control — the dock — where the sentence belongs with the
   * identity rather than between the numbers and the button.
   */
  basisPlacement?: 'below' | 'above';
  door?: DecisionDoor;
  /** The primary action, e.g. Start workout / Complete set. */
  action?: ReactNode;
  /** Anything after the action, e.g. Do later / Skip. */
  footer?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const LEAD_VARIANT: Record<DecisionRank, TypographyName> = {
  screen: 'display',
  section: 'title2',
  row: 'body',
};

/**
 * The Decision Block (docs/15 §2, docs/16 §6 and V1). Forma's rhetorical shape,
 * made a component so it is one thing to look at rather than four screens that
 * happen to argue the same way:
 *
 *     EYEBROW  what kind of thing this is  ............  DOOR  Why?
 *     LEAD     the decision or the action
 *     BASIS    what it is based on
 *     ACTION
 *
 * Invariants the component enforces so the pattern stays recognisable: the
 * eyebrow and the door share the top row, the basis sits against the lead, the
 * lead's size comes from the rank, and there is no border and no card. Blocks
 * are separated by space.
 *
 * Review question: is this a Decision Block, or did we build a form? If there
 * is no engine decision behind it, it is not one — use a list row.
 */
export function DecisionBlock({ rank, eyebrow, leading, lead, basis, basisPlacement = 'below', door, action, footer, style, testID }: DecisionBlockProps) {
  const theme = useTheme();

  if (rank === 'row') {
    return (
      <View style={[styles.row, { minHeight: theme.sizes.touchMin, gap: theme.spacing.sm }, style]} testID={testID}>
        {leading ? (
          <Text variant="body" color="text" numberOfLines={2} style={styles.rowLeading}>
            {leading}
          </Text>
        ) : null}
        {renderPart(lead, 'numBody')}
        {basis ? renderPart(basis, 'numCaption', 'textSecondary') : null}
        {door ? (
          <Pressable
            onPress={door.onPress}
            accessibilityRole="button"
            accessibilityLabel={door.accessibilityLabel ?? `${door.label} ${leading ?? ''}`.trim()}
            hitSlop={8}
            style={({ pressed }) => [styles.door, { minHeight: theme.sizes.touchMin, opacity: pressed ? 0.6 : 1 }]}>
            <Text variant="callout" color="accent" style={styles.doorText}>
              {door.label}
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  const basisNode = basis ? renderPart(basis, 'callout', 'textSecondary', 2) : null;

  return (
    <View style={style} testID={testID}>
      {eyebrow || door ? (
        <View style={[styles.top, { gap: theme.spacing.sm }]}>
          {eyebrow ? (
            <Text
              variant={eyebrow.variant === 'title' ? 'headline' : 'label'}
              color={eyebrow.tone === 'accent' ? 'accent' : 'textSecondary'}
              numberOfLines={1}
              style={styles.eyebrow}>
              {eyebrow.variant === 'title' ? eyebrow.text : eyebrow.text.toUpperCase()}
            </Text>
          ) : (
            <View style={styles.eyebrow} />
          )}
          {door ? (
            <Pressable
              onPress={door.onPress}
              accessibilityRole="button"
              accessibilityLabel={door.accessibilityLabel ?? door.label}
              hitSlop={10}
              style={({ pressed }) => [styles.topDoor, { opacity: pressed ? 0.6 : 1 }]}>
              <Text variant="callout" color="accent" style={styles.doorText}>
                {door.label}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {basisPlacement === 'above' ? basisNode : null}
      {lead !== undefined ? <View style={{ marginTop: basisPlacement === 'above' ? theme.spacing.xs : 2 }}>{renderPart(lead, LEAD_VARIANT[rank])}</View> : null}
      {basisPlacement === 'below' ? <View style={{ marginTop: theme.spacing.xs }}>{basisNode}</View> : null}

      {action ? <View style={{ marginTop: rank === 'screen' ? theme.spacing.lg : theme.spacing.sm }}>{action}</View> : null}
      {footer ? <View style={{ marginTop: theme.spacing.xs }}>{footer}</View> : null}
    </View>
  );
}

/** Strings get the block's type; nodes are rendered as given. */
function renderPart(part: ReactNode, variant: TypographyName, color?: 'text' | 'textSecondary', numberOfLines?: number): ReactNode {
  if (typeof part === 'string' || typeof part === 'number') {
    return (
      <Text variant={variant} color={color ?? 'text'} numberOfLines={numberOfLines}>
        {part}
      </Text>
    );
  }
  return part;
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', minHeight: 26 },
  eyebrow: { flex: 1 },
  topDoor: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 4 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowLeading: { flex: 1 },
  door: { justifyContent: 'center', paddingHorizontal: 4 },
  doorText: { fontWeight: '600' },
});
