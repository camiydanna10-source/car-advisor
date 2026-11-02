import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { CheckCircle2, ChevronRight, ClipboardList } from 'lucide-react-native';
import { COLORS, RADIUS, SPACING, TYPE } from '../constants/theme';
import { GlassCard } from '../components/GlassCard';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppHeader } from '../components/AppHeader';
import { BottomNav } from '../components/BottomNav';
import { FadeInView } from '../components/FadeInView';
import { useSession } from '../hooks/useSession';
import { useWorkshop } from '../hooks/useWorkshop';
import { ServiceOrder, acceptOrder, timeAgo } from '../services/orders';
import { formatPlate } from '../services/vehicleLookup';

type Tab = 'available' | 'mine' | 'done';

const STATUS_LABEL: Record<ServiceOrder['status'], string> = {
  pending: 'Disponible',
  in_progress: 'En taller',
  completed: 'Terminada',
  cancelled: 'Cancelada',
};

// Registered clients first (they can be scheduled and followed up); within each group the oldest
// request goes first so nobody waits behind newer ones.
const byPriority = (a: ServiceOrder, b: ServiceOrder) => {
  const ra = a.client.email ? 0 : 1;
  const rb = b.client.email ? 0 : 1;
  if (ra !== rb) return ra - rb;
  return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
};

// Services inbox of the mechanic (scheduled work). SOS roadside alerts have their own inbox and
// the on-guard switch only affects those.
export default function WorkshopScreen() {
  const router = useRouter();
  const { status, role, user } = useSession();
  const workshop = useWorkshop(user?.email);
  const [tab, setTab] = useState<Tab>('available');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  if (status === 'loading') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }
  if (status === 'guest') return <Redirect href="/" />;
  if (role !== 'mechanic' || !user) return <Redirect href="/home" />;

  const me = { name: user.name ?? 'Mecánico', email: user.email };
  const { orders } = workshop;

  const lists: Record<Tab, ServiceOrder[]> = {
    available: orders.filter(o => o.status === 'pending').sort(byPriority),
    mine: orders.filter(o => o.status === 'in_progress' && o.mechanic?.email === me.email),
    done: orders.filter(o => o.status === 'completed' && o.mechanic?.email === me.email),
  };

  const takeOrder = async (order: ServiceOrder) => {
    setBusyId(order.id);
    setNotice('');
    try {
      await acceptOrder(order.id, me);
      // The detail opens with the client's phone first: call, then work the order.
      router.push({ pathname: '/workshop-order', params: { id: order.id } });
    } catch (err: any) {
      setNotice(err.message || 'No se pudo aceptar el servicio.');
      await workshop.reload();
    } finally {
      setBusyId(null);
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'available', label: 'Disponibles' },
    { key: 'mine', label: 'En proceso' },
    { key: 'done', label: 'Terminadas' },
  ];
  const emptyText: Record<Tab, string> = {
    available: 'No hay servicios disponibles ahora. Cuando un cliente solicite uno aparecerá aquí.',
    mine: 'No tienes servicios en proceso. Acepta uno de los disponibles para empezar.',
    done: 'Todavía no has terminado ningún servicio.',
  };

  return (
    <>
      <AppHeader userName={user.name} modeLabel="Modo Mecánico" />
      <ScreenContainer contentContainerStyle={styles.content}>
        <FadeInView>
          <Text style={styles.eyebrow}>BANDEJA DE SERVICIOS</Text>
          <Text style={styles.title}>Servicios programados</Text>
          <Text style={styles.subtitle}>
            Los clientes registrados van primero para poder agendarlos bien. Los auxilios SOS están en su
            propia bandeja.
          </Text>
        </FadeInView>

        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        <FadeInView delay={80} style={styles.block}>
          <View style={styles.tabs}>
            {tabs.map(item => (
              <TouchableOpacity
                key={item.key}
                style={[styles.tab, tab === item.key && styles.tabActive]}
                onPress={() => setTab(item.key)}
              >
                <Text style={[styles.tabCount, tab === item.key && styles.tabTextActive]}>
                  {lists[item.key].length}
                </Text>
                <Text style={[styles.tabLabel, tab === item.key && styles.tabTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {lists[tab].length === 0 ? (
            <GlassCard style={styles.emptyCard}>
              <ClipboardList size={20} color={COLORS.onSurfaceVariant} />
              <Text style={styles.emptyText}>{emptyText[tab]}</Text>
            </GlassCard>
          ) : (
            lists[tab].map(order => {
              const doneSteps = order.checklist.filter(item => item.done).length;
              const registered = Boolean(order.client.email);
              return (
                <TouchableOpacity
                  key={order.id}
                  activeOpacity={0.85}
                  onPress={() => router.push({ pathname: '/workshop-order', params: { id: order.id } })}
                >
                  <GlassCard style={styles.orderCard}>
                    <View style={styles.orderTop}>
                      <Text style={styles.orderCode}>{order.code}</Text>
                      <View
                        style={[
                          styles.statusChip,
                          order.status === 'in_progress' && styles.statusChipActive,
                          order.status === 'completed' && styles.statusChipDone,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            order.status === 'in_progress' && { color: COLORS.tertiary },
                            order.status === 'completed' && { color: COLORS.onSurfaceVariant },
                          ]}
                        >
                          {STATUS_LABEL[order.status]}
                        </Text>
                      </View>
                      <View style={[styles.statusChip, !registered && styles.statusChipDone]}>
                        <Text style={[styles.statusText, !registered && { color: COLORS.onSurfaceVariant }]}>
                          {registered ? 'REGISTRADO' : 'INVITADO'}
                        </Text>
                      </View>
                      <Text style={styles.orderTime}>
                        {timeAgo(order.completedAt ?? order.acceptedAt ?? order.createdAt)}
                      </Text>
                    </View>
                    <Text style={styles.orderTitle}>{order.service.title}</Text>
                    <Text style={styles.orderMeta}>
                      {order.vehicle.brand} {order.vehicle.model} · {formatPlate(order.vehicle.plate)}
                    </Text>
                    <Text style={styles.orderMeta}>Cliente: {order.client.name}</Text>
                    <View style={styles.orderFooter}>
                      {order.status === 'in_progress' ? (
                        <Text style={styles.progressText}>
                          Checklist {doneSteps}/{order.checklist.length}
                        </Text>
                      ) : order.status === 'completed' ? (
                        <View style={styles.doneRow}>
                          <CheckCircle2 size={14} color={COLORS.primary} />
                          <Text style={styles.progressText}>
                            {registered ? 'Añadida a la cronología del cliente' : 'Terminada'}
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.progressText}>
                          {order.service.price ? `${order.service.price}€ · ` : ''}pendiente de aceptar
                        </Text>
                      )}
                      {order.status === 'pending' ? (
                        <TouchableOpacity
                          style={styles.acceptBtn}
                          onPress={() => takeOrder(order)}
                          disabled={busyId === order.id}
                        >
                          <Text style={styles.acceptText}>Aceptar servicio</Text>
                        </TouchableOpacity>
                      ) : (
                        <ChevronRight size={16} color={COLORS.onSurfaceVariant} />
                      )}
                    </View>
                  </GlassCard>
                </TouchableOpacity>
              );
            })
          )}
        </FadeInView>
      </ScreenContainer>
      <BottomNav />
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  content: {
    gap: SPACING.md,
  },
  block: {
    gap: SPACING.sm,
  },
  eyebrow: {
    ...TYPE.labelSm,
    color: COLORS.primary,
    letterSpacing: 1.2,
    fontWeight: '700',
  },
  title: {
    ...TYPE.headlineLg,
    color: COLORS.onSurface,
    marginTop: 2,
  },
  subtitle: {
    color: COLORS.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  notice: {
    color: COLORS.tertiary,
    fontSize: 12,
    lineHeight: 17,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(107, 216, 203, 0.10)',
  },
  tabCount: {
    color: COLORS.onSurface,
    fontSize: 18,
    fontWeight: '800',
  },
  tabLabel: {
    color: COLORS.onSurfaceVariant,
    fontSize: 11,
    fontWeight: '600',
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    flex: 1,
    color: COLORS.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 17,
  },
  orderCard: {
    gap: 4,
  },
  orderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderCode: {
    ...TYPE.labelMd,
    color: COLORS.onSurfaceVariant,
    fontWeight: '800',
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(107, 216, 203, 0.15)',
  },
  statusChipActive: {
    backgroundColor: 'rgba(236, 106, 6, 0.2)',
  },
  statusChipDone: {
    backgroundColor: COLORS.surfaceContainerHigh,
  },
  statusText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  orderTime: {
    flex: 1,
    textAlign: 'right',
    color: COLORS.outline,
    fontSize: 11,
  },
  orderTitle: {
    color: COLORS.onSurface,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  orderMeta: {
    color: COLORS.onSurfaceVariant,
    fontSize: 12,
  },
  orderFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
  },
  progressText: {
    color: COLORS.onSurfaceVariant,
    fontSize: 12,
    flexShrink: 1,
  },
  doneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  acceptBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
  },
  acceptText: {
    color: COLORS.onPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
});
