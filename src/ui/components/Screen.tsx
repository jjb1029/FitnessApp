import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useTheme } from '../theme';

export type ScreenProps = {
  children: ReactNode;
  /** Scrollable content (default) or a fixed layout that manages its own scrolling. */
  scroll?: boolean;
  edges?: Edge[];
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
  testID?: string;
};

/**
 * Screen shell: safe areas, screen padding, content max width (nothing breaks
 * on tablets), theme background.
 */
export function Screen({ children, scroll = true, edges = ['top', 'left', 'right'], contentContainerStyle, testID }: ScreenProps) {
  const theme = useTheme();
  const inner = (
    <View style={[styles.content, { maxWidth: theme.sizes.contentMaxWidth, paddingHorizontal: theme.sizes.screenPaddingH }]}>{children}</View>
  );
  return (
    <SafeAreaView edges={edges} style={[styles.root, { backgroundColor: theme.colors.bg }]} testID={testID}>
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[{ paddingBottom: theme.spacing.giant }, contentContainerStyle]}>
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { width: '100%', alignSelf: 'center', flex: 1 },
});
