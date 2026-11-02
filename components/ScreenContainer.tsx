import React from 'react';
import { ScrollView, ScrollViewProps, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPACING } from '../constants/theme';

interface ScreenContainerProps extends ScrollViewProps {
  children: React.ReactNode;
}

// Shared scroll wrapper so screens stop hardcoding `paddingBottom: 100` and
// actually clear the home-indicator / gesture area on notched devices.
export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  contentContainerStyle,
  ...rest
}) => {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      contentContainerStyle={[
        styles.base,
        { paddingBottom: SPACING.xl + insets.bottom },
        contentContainerStyle,
      ]}
      {...rest}
    >
      {children}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  base: {
    padding: SPACING.md,
  },
});
