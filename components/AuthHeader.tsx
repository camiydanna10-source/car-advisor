import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, HelpCircle, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../constants/theme';
import { useSession } from '../hooks/useSession';

interface AuthHeaderProps {
  /** Small English "shell label" accent under the wordmark, e.g. "Sign In" — a stylistic
   *  quirk carried over consistently from every Stitch prototype screen. */
  label: string;
  showBack?: boolean;
}

export const AuthHeader: React.FC<AuthHeaderProps> = ({ label, showBack = true }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { status } = useSession();
  // Logged-in clients go back to their home; everyone else to the entry screen.
  const goHome = () => router.replace(status === 'authenticated' ? '/home' : '/');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        {showBack ? (
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()} accessibilityLabel="Volver">
            <ChevronLeft size={22} color={COLORS.onSurface} />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconBtn} />
        )}

        <TouchableOpacity style={styles.centerGroup} onPress={goHome} accessibilityRole="button" accessibilityLabel="Ir al inicio">
          <Text style={styles.wordmark}>
            Car<Text style={styles.wordmarkAccent}>Advisor</Text>
          </Text>
          <Text style={styles.shellLabel}>{label}</Text>
        </TouchableOpacity>

        <View style={styles.rightGroup}>
          <TouchableOpacity style={styles.iconBtn} accessibilityLabel="Ayuda y soporte">
            <HelpCircle size={20} color={COLORS.onSurfaceVariant} />
          </TouchableOpacity>
          <View style={styles.avatar}>
            <User size={16} color={COLORS.onSurfaceVariant} />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(16, 20, 21, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(61, 73, 71, 0.4)',
  },
  row: {
    height: 56,
    paddingHorizontal: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerGroup: {
    alignItems: 'center',
  },
  wordmark: {
    color: COLORS.onSurface,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  wordmarkAccent: {
    color: COLORS.primary,
  },
  shellLabel: {
    color: COLORS.onSurfaceVariant,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 1,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
