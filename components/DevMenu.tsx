import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet, Pressable } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, Code2, X } from 'lucide-react-native';
import { COLORS, RADIUS, SPACING, TYPE } from '../constants/theme';
import { DEMO_PLATES, DEV_ROUTE_GROUPS, DevRoute } from '../constants/devRoutes';

// Floating "DEV" button + modal with shortcuts to every screen, so the frontend can keep
// being built without replaying login/registration each time. Only rendered in development
// builds (`__DEV__`), so it never ships to production.
export const DevMenu: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  if (!__DEV__) return null;

  const go = (route: DevRoute) => {
    setVisible(false);
    router.push(route.href);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + SPACING.md }]}
        onPress={() => setVisible(true)}
        accessibilityLabel="Abrir menú de desarrollo"
        activeOpacity={0.85}
      >
        <Code2 size={14} color={COLORS.onPrimary} />
        <Text style={styles.fabText}>DEV</Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + SPACING.md }]}>
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetTitle}>Modo desarrollo</Text>
              <Text style={styles.sheetSubtitle}>Pantalla actual: {pathname}</Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setVisible(false)}
              accessibilityLabel="Cerrar menú de desarrollo"
            >
              <X size={18} color={COLORS.onSurface} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.list}>
            {DEV_ROUTE_GROUPS.map(group => (
              <View key={group.title} style={styles.group}>
                <Text style={styles.groupTitle}>{group.title.toUpperCase()}</Text>
                {group.routes.map(route => (
                  <TouchableOpacity key={route.label} style={styles.row} onPress={() => go(route)}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowLabel}>{route.label}</Text>
                      <Text style={styles.rowDescription}>{route.description}</Text>
                    </View>
                    <ChevronRight size={16} color={COLORS.onSurfaceVariant} />
                  </TouchableOpacity>
                ))}
              </View>
            ))}

            <View style={styles.group}>
              <Text style={styles.groupTitle}>MATRÍCULAS DE DEMOSTRACIÓN</Text>
              <Text style={styles.rowDescription}>
                {DEMO_PLATES.join('  ·  ')} — cualquier otra devuelve un vehículo genérico.
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: SPACING.md,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    opacity: 0.92,
  },
  fabText: {
    color: COLORS.onPrimary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  sheet: {
    maxHeight: '80%',
    backgroundColor: COLORS.surfaceContainer,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    paddingTop: SPACING.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  sheetTitle: {
    ...TYPE.headlineSm,
    color: COLORS.onSurface,
  },
  sheetSubtitle: {
    color: COLORS.onSurfaceVariant,
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    gap: SPACING.md,
  },
  group: {
    gap: 6,
  },
  groupTitle: {
    ...TYPE.labelSm,
    color: COLORS.primary,
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surfaceContainerHigh,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowLabel: {
    color: COLORS.onSurface,
    fontSize: 13,
    fontWeight: '700',
  },
  rowDescription: {
    color: COLORS.onSurfaceVariant,
    fontSize: 11,
    marginTop: 1,
  },
});
