import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Text } from 'react-native';
import { getAnimatedStyle, setUpTests } from 'react-native-reanimated';

import { useUiStore } from '@/store/uiStore';

import { Attention, Focus, HandOff, Recede, Recount, Settle, useGround } from './motion';
import { STATE_TRANSITION_BUDGET_MS } from './motionPlan';
import { ThemeProvider } from './theme';

/**
 * The motion primitives, frame by frame (docs/16 §8). `motionPlan.test.ts`
 * proves the timing rules; this proves the components follow them: the order a
 * hand-off happens in, that nothing snaps, that reduced motion is instant, and
 * that nothing moves under the user's thumb.
 */

setUpTests();

/** Reanimated's test clock advances one frame per ~17 ms; allow one frame past any deadline. */
const FRAME = 17;

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function renderWithTheme(ui: React.ReactElement, { reduceMotion = false }: { reduceMotion?: boolean } = {}) {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(reduceMotion);
  useUiStore.setState({ reduceMotion });
  return render(ui, { wrapper: ThemeProvider });
}

type Inspectable = { props: Record<string, unknown> };
type AnimatedValues = { opacity?: number; height?: number; transform?: unknown };

/** A layer that does not hold focus is hidden from screen readers, so inspecting one has to ask for hidden elements. */
const byId = (testID: string) => screen.getByTestId(testID, { includeHiddenElements: true }) as unknown as Inspectable;
const styleOf = (testID: string) => getAnimatedStyle(byId(testID)) as AnimatedValues;
const opacityOf = (testID: string) => styleOf(testID).opacity as number;
const heightOf = (testID: string) => styleOf(testID).height as number;
const advance = (ms: number) =>
  act(async () => {
    jest.advanceTimersByTime(ms);
  });

function Stage({ active }: { active: 'lift' | 'rest' }) {
  return (
    <HandOff
      testID="stage"
      active={active}
      initialHeight={60}
      layers={[
        { key: 'lift', node: <Text>Incline dumbbell press</Text> },
        { key: 'rest', node: <Text>1:45</Text> },
      ]}
    />
  );
}

/** What `onLayout` reports on device: the lifting stage is 78 pt, the resting stage 159 pt. */
async function measureStages() {
  await fireEvent(screen.getByTestId('handoff-lift', { includeHiddenElements: true }), 'layout', { nativeEvent: { layout: { height: 78 } } });
  await fireEvent(screen.getByTestId('handoff-rest', { includeHiddenElements: true }), 'layout', { nativeEvent: { layout: { height: 159 } } });
}

describe('HandOff', () => {
  it('lets the old state leave first, brings the new one in behind it, and glides rather than snaps', async () => {
    const view = await renderWithTheme(<Stage active="lift" />);
    await measureStages();
    // A set lands on the next frame, on device and in the test clock alike.
    await advance(FRAME);
    expect(heightOf('stage')).toBe(78);

    await view.rerender(<Stage active="rest" />);
    await advance(40);
    expect(opacityOf('handoff-lift')).toBeGreaterThan(0);
    expect(opacityOf('handoff-lift')).toBeLessThan(1);
    expect(opacityOf('handoff-rest')).toBe(0);
    expect(heightOf('stage')).toBeGreaterThan(78);
    expect(heightOf('stage')).toBeLessThan(159);

    await advance(160 - 40);
    expect(opacityOf('handoff-lift')).toBe(0);
    expect(opacityOf('handoff-rest')).toBeGreaterThan(0);
    expect(opacityOf('handoff-rest')).toBeLessThan(1);
  });

  it('has landed completely inside the 250 ms budget', async () => {
    const view = await renderWithTheme(<Stage active="lift" />);
    await measureStages();
    await view.rerender(<Stage active="rest" />);
    await advance(STATE_TRANSITION_BUDGET_MS + FRAME);
    expect(opacityOf('handoff-lift')).toBe(0);
    expect(opacityOf('handoff-rest')).toBe(1);
    expect(heightOf('stage')).toBe(159);
  });

  it('hands back the same way when rest ends', async () => {
    const view = await renderWithTheme(<Stage active="rest" />);
    await measureStages();
    await view.rerender(<Stage active="lift" />);
    await advance(STATE_TRANSITION_BUDGET_MS + FRAME);
    expect(opacityOf('handoff-rest')).toBe(0);
    expect(opacityOf('handoff-lift')).toBe(1);
    expect(heightOf('stage')).toBe(78);
  });

  it('is an instant state change under reduced motion', async () => {
    const view = await renderWithTheme(<Stage active="lift" />, { reduceMotion: true });
    await measureStages();
    await view.rerender(<Stage active="rest" />);
    await advance(FRAME);
    expect(opacityOf('handoff-lift')).toBe(0);
    expect(opacityOf('handoff-rest')).toBe(1);
    expect(heightOf('stage')).toBe(159);
  });

  it('hides the layer that does not hold focus from touch and from screen readers', async () => {
    await renderWithTheme(<Stage active="lift" />);
    // A screen reader cannot reach it at all…
    expect(screen.queryByTestId('handoff-rest')).toBeNull();
    expect(screen.getByTestId('handoff-lift')).toBeTruthy();
    // …and it takes no touches.
    const rest = byId('handoff-rest');
    expect(rest.props['aria-hidden']).toBe(true);
    expect(rest.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(rest.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ pointerEvents: 'none' })]));
  });
});

describe('Ground', () => {
  function Recovery({ resting }: { resting: boolean }) {
    const ground = useGround(resting);
    return <Recede testID="recede" progress={ground} amount={0.4} color="#000" />;
  }

  it('lets the history recede on the ground clock, and only as far as a veil', async () => {
    const view = await renderWithTheme(<Recovery resting={false} />);
    expect(opacityOf('recede')).toBe(0);
    await view.rerender(<Recovery resting />);
    await advance(100);
    expect(opacityOf('recede')).toBeGreaterThan(0);
    expect(opacityOf('recede')).toBeLessThan(0.4);
    await advance(STATE_TRANSITION_BUDGET_MS);
    expect(opacityOf('recede')).toBeCloseTo(0.4);
  });

  it('recedes instantly under reduced motion', async () => {
    const view = await renderWithTheme(<Recovery resting={false} />, { reduceMotion: true });
    await view.rerender(<Recovery resting />);
    await advance(FRAME);
    expect(opacityOf('recede')).toBeCloseTo(0.4);
  });
});

describe('Settle', () => {
  const loggedSet = (
    <Settle testID="row" when drain={{ color: '#000', radius: 8 }}>
      <Text>80 lb × 8</Text>
    </Settle>
  );

  it("drains a logged set's highlight without moving the row", async () => {
    await renderWithTheme(loggedSet);
    expect(opacityOf('row-drain')).toBe(1);
    await advance(90);
    expect(opacityOf('row-drain')).toBeGreaterThan(0);
    expect(opacityOf('row-drain')).toBeLessThan(1);
    expect(styleOf('row').transform).toEqual([{ translateY: 0 }]);
    await advance(150);
    expect(opacityOf('row-drain')).toBe(0);
    expect(styleOf('row').transform).toEqual([{ translateY: 0 }]);
  });

  it('shows history as it is under reduced motion', async () => {
    await renderWithTheme(loggedSet, { reduceMotion: true });
    expect(opacityOf('row-drain')).toBe(0);
  });
});

describe('Recount', () => {
  function Value({ trigger, value }: { trigger: string; value: string }) {
    return (
      <Recount testID="recount" trigger={trigger} value={value}>
        <Text>{value}</Text>
      </Recount>
    );
  }

  it('stays still while the user edits the number', async () => {
    const view = await renderWithTheme(<Value trigger="incline:set-2" value="80" />);
    await view.rerender(<Value trigger="incline:set-2" value="85" />);
    await advance(FRAME);
    expect(opacityOf('recount')).toBe(1);
  });

  it('ticks over when Forma moves on to a different number', async () => {
    const view = await renderWithTheme(<Value trigger="incline:set-3" value="85" />);
    await view.rerender(<Value trigger="pulldown:set-1" value="140" />);
    await advance(FRAME);
    expect(opacityOf('recount')).toBeLessThan(1);
    await advance(200);
    expect(opacityOf('recount')).toBe(1);
  });
});

describe('Attention', () => {
  const wash = (trigger: number) => (
    <Attention testID="attention" trigger={trigger} color="#000" radius={12}>
      <Text>Complete set</Text>
    </Attention>
  );

  it('rises behind the button when rest hands focus back, then clears', async () => {
    const view = await renderWithTheme(wash(0));
    expect(opacityOf('attention-wash')).toBe(0);
    await view.rerender(wash(1));
    await advance(120 + FRAME);
    expect(opacityOf('attention-wash')).toBeGreaterThan(0.9);
    await advance(600);
    expect(opacityOf('attention-wash')).toBe(0);
  });
});

describe('Focus', () => {
  const row = (visible: boolean, identity: number) => (
    <Focus testID="focus" visible={visible} identity={identity} color="#000" radius={8}>
      <Text>set {identity}</Text>
    </Focus>
  );

  it('moves with the row instantly, so two rows never flash at once', async () => {
    const view = await renderWithTheme(row(true, 2));
    await view.rerender(row(false, 3));
    await advance(FRAME);
    expect(opacityOf('focus-highlight')).toBe(0);
  });

  it('fades in on the same row when rest ends', async () => {
    const view = await renderWithTheme(row(false, 3));
    await view.rerender(row(true, 3));
    await advance(60);
    expect(opacityOf('focus-highlight')).toBeGreaterThan(0);
    expect(opacityOf('focus-highlight')).toBeLessThan(1);
    await advance(200);
    expect(opacityOf('focus-highlight')).toBe(1);
  });
});
