import { useEffect, useRef, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, interpolateColor, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';

import { handOffTimeline, shouldRecount, type HandOffTimeline, type RecountSample } from './motionPlan';
import { useTheme } from './theme';
import { motion } from './tokens';

/**
 * Forma's motion primitives (docs/16 §8). Motion communicates state, never
 * decoration: each primitive runs because something happened, lands inside
 * 250 ms, never gates input, and becomes an instant state change under reduced
 * motion.
 *
 * Deliberately still: countdown numerals, history numbers, labels, explanatory
 * text, and any control while the user is entering data. Nothing here loops.
 */

/** Things arrive and settle; nothing overshoots or bounces. */
const ARRIVE = Easing.bezier(0.2, 0, 0, 1);
const LEAVE = Easing.out(Easing.quad);

const suffixed = (testID: string | undefined, suffix: string) => (testID ? `${testID}-${suffix}` : undefined);

// ---------- Ground ----------

/**
 * A phase's surface as a 0→1 progress that follows a flag. Consumers map it
 * to what the phase changes — a background, a recede, a mute — so the whole
 * surface moves together on one clock.
 */
export function useGround(active: boolean): SharedValue<number> {
  const { reduceMotion } = useTheme();
  const progress = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    const target = active ? 1 : 0;
    progress.set(reduceMotion ? target : withTiming(target, { duration: motion.ground, easing: ARRIVE }));
  }, [active, reduceMotion, progress]);
  return progress;
}

/** A background between two grounds, driven by `useGround`. */
export function useGroundColor(progress: SharedValue<number>, from: string, to: string) {
  return useAnimatedStyle(() => ({ backgroundColor: interpolateColor(progress.get(), [0, 1], [from, to]) }));
}

/** Full strength down to `floor` as the ground rises: controls that wait without moving. */
export function useGroundOpacity(progress: SharedValue<number>, floor: number) {
  return useAnimatedStyle(() => ({ opacity: 1 - (1 - floor) * progress.get() }));
}

/**
 * The ground rising over content that has stopped being the point — the
 * workout history while the user rests. It is a veil, not a hide: the content
 * stays legible, and touches pass straight through.
 */
export function Recede({ progress, amount, color, testID }: { progress: SharedValue<number>; amount: number; color: string; testID?: string }) {
  const style = useAnimatedStyle(() => ({ opacity: amount * progress.get() }));
  return <Animated.View testID={testID} style={[StyleSheet.absoluteFill, { backgroundColor: color, pointerEvents: 'none' }, style]} />;
}

// ---------- Settle ----------

export type SettleProps = {
  /** Plays once, when the element mounts with this true. */
  when?: boolean;
  /** Rise into place from this many points below. Zero for history, which never moves. */
  rise?: number;
  /** Instead of fading in, a highlight of this colour drains away: the row stops being the action and becomes history. */
  drain?: { color: string; radius: number };
  delay?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  children: ReactNode;
};

/**
 * Settle: something arriving in its final place rather than appearing. An
 * exercise that becomes current rises the last few points into focus; a set
 * that was just logged keeps its position and lets its highlight drain.
 */
export function Settle({ when = true, rise = 0, drain, delay = 0, style, testID, children }: SettleProps) {
  const { reduceMotion } = useTheme();
  const play = when && !reduceMotion;
  // Initial values are the "before" frame; the mount effect carries them to rest.
  const appear = useSharedValue(play && !drain ? 0 : 1);
  const offset = useSharedValue(play && !drain ? rise : 0);
  const highlight = useSharedValue(play && drain ? 1 : 0);
  useEffect(() => {
    if (!play) return;
    const timing = { duration: motion.settle, easing: ARRIVE };
    if (drain) {
      highlight.set(withDelay(delay, withTiming(0, timing)));
    } else {
      appear.set(withDelay(delay, withTiming(1, timing)));
      offset.set(withDelay(delay, withTiming(0, timing)));
    }
    // An element arrives once; later renders must never replay it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const contentStyle = useAnimatedStyle(() => ({ opacity: appear.get(), transform: [{ translateY: offset.get() }] }));
  const highlightStyle = useAnimatedStyle(() => ({ opacity: highlight.get() }));
  return (
    <Animated.View testID={testID} style={[style, contentStyle]}>
      {drain ? <Animated.View testID={suffixed(testID, 'drain')} style={[StyleSheet.absoluteFill, { backgroundColor: drain.color, borderRadius: drain.radius, pointerEvents: 'none' }, highlightStyle]} /> : null}
      {children}
    </Animated.View>
  );
}

// ---------- Hand-off ----------

export type HandOffLayer = { key: string; node: ReactNode };

export type HandOffProps = {
  /** The layer that holds focus. Changing it runs the hand-off. */
  active: string;
  layers: readonly HandOffLayer[];
  /** A best guess for the very first frame, before the active layer has measured. */
  initialHeight?: number;
  /** Every layer's natural height, whenever one changes. */
  onHeights?: (heights: number[]) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Hand-off: one state gives way to the next in place. Layers are stacked and
 * anchored to the bottom, so whatever sits below them — the controls — never
 * moves. The outgoing layer fades out, the incoming one fades in just behind
 * it, and the container's height glides to the new layer's, so the surface
 * breathes with the phase instead of snapping.
 *
 * Hidden layers stay mounted, so an outgoing state leaves showing where it
 * ended, but they take no touches and are hidden from screen readers.
 */
export function HandOff({ active, layers, initialHeight = 0, onHeights, style, testID }: HandOffProps) {
  const { reduceMotion } = useTheme();
  const timeline = handOffTimeline(reduceMotion);
  const height = useSharedValue(initialHeight);
  const heights = useRef<Record<string, number>>({});
  const activeKey = useRef(active);
  const measuredActive = useRef(false);

  const glideTo = (h: number, instant: boolean) => {
    height.set(instant || timeline.ground === 0 ? h : withTiming(h, { duration: timeline.ground, easing: ARRIVE }));
  };

  useEffect(() => {
    activeKey.current = active;
    const h = heights.current[active];
    if (h !== undefined) glideTo(h, false);
    // `glideTo` is recreated each render; only a change of focus should glide.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const onLayerHeight = (key: string, h: number) => {
    if (heights.current[key] === h) return;
    heights.current[key] = h;
    onHeights?.(Object.values(heights.current));
    if (key !== activeKey.current) return;
    glideTo(h, !measuredActive.current);
    measuredActive.current = true;
  };

  const containerStyle = useAnimatedStyle(() => ({ height: height.get() }));

  return (
    <Animated.View style={[styles.handOff, style, containerStyle]} testID={testID}>
      {layers.map((layer) => (
        <HandOffLayerView key={layer.key} layerKey={layer.key} active={layer.key === active} timeline={timeline} onHeight={onLayerHeight}>
          {layer.node}
        </HandOffLayerView>
      ))}
    </Animated.View>
  );
}

function HandOffLayerView({ layerKey, active, timeline, onHeight, children }: { layerKey: string; active: boolean; timeline: HandOffTimeline; onHeight: (key: string, h: number) => void; children: ReactNode }) {
  const opacity = useSharedValue(active ? 1 : 0);
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (active) {
      opacity.set(timeline.in === 0 ? 1 : withDelay(timeline.inDelay, withTiming(1, { duration: timeline.in, easing: ARRIVE })));
    } else {
      opacity.set(timeline.out === 0 ? 0 : withTiming(0, { duration: timeline.out, easing: LEAVE }));
    }
  }, [active, timeline.in, timeline.inDelay, timeline.out, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return (
    <Animated.View
      testID={`handoff-${layerKey}`}
      onLayout={(e) => onHeight(layerKey, e.nativeEvent.layout.height)}
      aria-hidden={!active}
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
      style={[styles.layer, { pointerEvents: active ? 'box-none' : 'none' }, style]}>
      {children}
    </Animated.View>
  );
}

// ---------- Reveal ----------

/**
 * Reveal: supporting information arriving after the primary change has
 * landed — the rest bar and the next set, after the countdown. Used sparingly.
 * Under reduced motion the information is simply there.
 */
export function Reveal({ when, delay, style, testID, children }: { when: boolean; delay?: number; style?: StyleProp<ViewStyle>; testID?: string; children: ReactNode }) {
  const { reduceMotion } = useTheme();
  const timeline = handOffTimeline(reduceMotion);
  const opacity = useSharedValue(1);
  const was = useRef(when);
  useEffect(() => {
    const arriving = when && !was.current;
    was.current = when;
    if (!arriving || timeline.reveal === 0) return;
    opacity.set(withSequence(withTiming(0, { duration: 0 }), withDelay(delay ?? timeline.revealDelay, withTiming(1, { duration: timeline.reveal, easing: ARRIVE }))));
  }, [when, delay, timeline.reveal, timeline.revealDelay, opacity]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return (
    <Animated.View testID={testID} style={[style, animated]}>
      {children}
    </Animated.View>
  );
}

// ---------- Recount ----------

/**
 * Recount: a number that changed because something happened — the next
 * exercise's target, the session's set count — ticks in rather than snapping.
 * A value the user is editing never recounts (see `shouldRecount`).
 */
export function Recount({ trigger, value, style, testID, children }: RecountSample & { style?: StyleProp<ViewStyle>; testID?: string; children: ReactNode }) {
  const { reduceMotion } = useTheme();
  const opacity = useSharedValue(1);
  const previous = useRef<RecountSample | null>(null);
  useEffect(() => {
    const next = { trigger, value };
    const fire = shouldRecount(previous.current, next);
    previous.current = next;
    if (!fire || reduceMotion) return;
    opacity.set(withSequence(withTiming(0.3, { duration: 0 }), withTiming(1, { duration: motion.recount, easing: ARRIVE })));
  }, [trigger, value, reduceMotion, opacity]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return (
    <Animated.View testID={testID} style={[style, animated]}>
      {children}
    </Animated.View>
  );
}

// ---------- Hand-off accents ----------

/**
 * One wash behind the primary action when focus is handed back to it — rest
 * is over, this is the thing to press. It rises inside the hand-off and fades
 * behind a live button; it never delays the tap.
 */
export function Attention({ trigger, color, radius, style, testID, children }: { trigger: number; color: string; radius: number; style?: StyleProp<ViewStyle>; testID?: string; children: ReactNode }) {
  const { reduceMotion } = useTheme();
  const opacity = useSharedValue(0);
  const seen = useRef(trigger);
  useEffect(() => {
    if (seen.current === trigger) return;
    seen.current = trigger;
    if (reduceMotion) return;
    opacity.set(withSequence(withTiming(1, { duration: motion.handOffOut, easing: ARRIVE }), withDelay(motion.handOffOut, withTiming(0, { duration: motion.ground, easing: LEAVE }))));
  }, [trigger, reduceMotion, opacity]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return (
    <View testID={testID} style={style}>
      <Animated.View testID={suffixed(testID, 'wash')} style={[StyleSheet.absoluteFill, { backgroundColor: color, borderRadius: radius, transform: [{ scale: 1.03 }], pointerEvents: 'none' }, animated]} />
      {children}
    </View>
  );
}

/**
 * The highlight that marks "this set is the action". When the row it sits on
 * changes, it moves instantly — the set that just landed drains its own
 * highlight, so animating here would flash two rows at once. When only the
 * phase changes (rest ending), it fades in: focus handed to the next set.
 */
export function Focus({ visible, identity, color, radius, style, testID, children }: { visible: boolean; identity: string | number; color: string; radius: number; style?: StyleProp<ViewStyle>; testID?: string; children: ReactNode }) {
  const { reduceMotion } = useTheme();
  const opacity = useSharedValue(visible ? 1 : 0);
  const last = useRef(identity);
  useEffect(() => {
    const target = visible ? 1 : 0;
    const moved = last.current !== identity;
    last.current = identity;
    opacity.set(moved || reduceMotion ? target : withTiming(target, { duration: motion.handOffIn, easing: ARRIVE }));
  }, [visible, identity, reduceMotion, opacity]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return (
    <View testID={testID} style={style}>
      <Animated.View testID={suffixed(testID, 'highlight')} style={[StyleSheet.absoluteFill, { backgroundColor: color, borderRadius: radius, pointerEvents: 'none' }, animated]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  handOff: { overflow: 'hidden' },
  layer: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
