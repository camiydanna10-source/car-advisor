import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, CheckCircle2, Phone, Radio, XCircle } from 'lucide-react-native';
import { COLORS, RADIUS, SPACING, TYPE } from '../constants/theme';
import { GlassCard } from '../components/GlassCard';
import { StatusChip } from '../components/StatusChip';
import { ScreenContainer } from '../components/ScreenContainer';
import { AuthHeader } from '../components/AuthHeader';
import { AppHeader } from '../components/AppHeader';
import { BottomNav } from '../components/BottomNav';
import { DispatchPulse } from '../components/DispatchPulse';
import { ToolCheckIcon } from '../components/ToolCheckIcon';
import { useSession } from '../hooks/useSession';
import { useOrder } from '../hooks/useOrderStatus';
import { ServiceOrder, cancelOrder, timeAgo } from '../services/orders';
import { formatPhone } from '../services/phone';
import { formatPlate } from '../services/vehicleLookup';

// Re-renders the "hace X min" texts without waiting for the order to change.
function useTick(ms: number) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(timer);
  }, [ms]);
  return now;
}

type Step = { key: string; label: string; detail?: string; done: boolean; current: boolean };

function stepsFor(order: ServiceOrder, now: Date): Step[] {
  const doneSteps = order.checklist.filter(item => item.done).length;
  const accepted = order.status !== 'pending';
  return [
    {
      key: 'sent',
      label: 'Solicitud enviada',
      detail: timeAgo(order.createdAt, now),
      done: true,
      current: order.status === 'pending',
    },
    {
      key: 'assigned',
      label: 'Mecánico asignado',
      detail: accepted && order.mechanic ? order.mechanic.name : 'Esperando confirmación',
      done: accepted,
      current: order.status === 'in_progress' && !order.checkIn,
    },
    {
      key: 'work',
      label: 'En el taller',
      detail:
        order.checkIn || order.status === 'completed'
          ? `Checklist ${doneSteps}/${order.checklist.length}`
          : undefined,
      done: order.status === 'completed',
      current: order.status === 'in_progress' && !!order.checkIn,
    },
    {
      key: 'done',
      label: 'Servicio terminado',
      detail: order.completedAt ? timeAgo(order.completedAt, now) : undefined,
      done: order.status === 'completed',
      current: false,
    },
  ];
}

// Waiting screen after requesting a service ("despacho en curso") until a mechanic confirms,
// then it follows the order up to its completion. The screen polls the order every few seconds.
export default function OrderStatusScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { status, role, user } = useSession();
  const order = useOrder(id ? String(id) : undefined);
  const now = useTick(15000);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const isClient = status === 'authenticated' && role === 'client';
  const goHome = () => router.replace(isClient ? '/home' : '/catalog');

  const header = isClient ? <AppHeader userName={user?.name} /> : <AuthHeader label="Order Status" showBack={false} />;

  if (id && order === undefined) {
    return (
      <>
        {header}
        <View style={styles.loading}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      </>
    );
  }

  if (!id || !order) {
    return (
      <>
        {header}
        <ScreenContainer>
          <Text style={styles.subtitle}>No encontramos esta solicitud.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={goHome}>
            <Text style={styles.primaryBtnText}>Volver</Text>
          </TouchableOpacity>
        </ScreenContainer>
        {isClient ? <BottomNav /> : null}
      </>
    );
  }

  const cancel = async () => {
    setBusy(true);
    setError('');
    try {
      await cancelOrder(order.id);
    } catch (err: any) {
      setError(err.message || 'No se pudo cancelar la solicitud.');
    } finally {
      setBusy(false);
      setConfirmCancel(false);
    }
  };

  const hero = {
    pending: {
      chip: 'DESPACHO EN CURSO',
      chipType: 'warning' as const,
      title: 'Buscando un mecánico disponible',
      text: 'Tu solicitud ya está en los mecánicos de guardia. En cuanto uno la acepte te lo confirmamos aquí; no hace falta que cierres esta pantalla.',
      color: COLORS.tertiary,
      Icon: Radio,
    },
    in_progress: {
      chip: order.checkIn ? 'EN EL TALLER' : 'MECÁNICO ASIGNADO',
      chipType: 'info' as const,
      title: order.checkIn ? 'Tu coche está en el taller' : `${order.mechanic?.name ?? 'Un mecánico'} ha aceptado tu solicitud`,
      text: order.checkIn
        ? 'El mecánico está trabajando en tu vehículo. Te avisaremos cuando termine.'
        : `${order.mechanic?.name ?? 'El mecánico'} te contactará${
            order.client.phone ? ` al ${formatPhone(order.client.phone)}` : ''
          } para confirmar la cita.`,
      color: COLORS.primary,
      Icon: ToolCheckIcon,
    },
    completed: {
      chip: 'SERVICIO TERMINADO',
      chipType: 'success' as const,
      title: 'Servicio completado',
      text: 'Ya figura en tu cronología de mantenimiento.',
      color: COLORS.success,
      Icon: CheckCircle2,
    },
    cancelled: {
      chip: 'SOLICITUD CANCELADA',
      chipType: 'error' as const,
      title: 'Solicitud cancelada',
      text: 'No se ha realizado ningún cargo. Puedes volver a solicitar el servicio cuando quieras.',
      color: COLORS.error,
      Icon: XCircle,
    },
  }[order.status];
  const HeroIcon = hero.Icon;
  const steps = stepsFor(order, now);

  return (
    <>
      {header}
      <ScreenContainer contentContainerStyle={styles.content}>
        <GlassCard variant={order.status === 'pending' ? 'alertGlow' : 'primaryGlow'} style={styles.hero}>
          <DispatchPulse active={order.status === 'pending'} color={hero.color}>
            <HeroIcon size={26} color="#FFF" />
          </DispatchPulse>
          <StatusChip label={hero.chip} type={hero.chipType} />
          <Text style={styles.title}>{hero.title}</Text>
          <Text style={styles.subtitle}>{hero.text}</Text>
          {order.status === 'pending' ? (
            <Text style={styles.elapsed}>Esperando desde {timeAgo(order.createdAt, now)}</Text>
          ) : null}
          {order.status === 'completed' && order.diagnosis ? (
            <Text style={styles.diagnosis}>Diagnóstico: {order.diagnosis}</Text>
          ) : null}
        </GlassCard>

        {order.status !== 'cancelled' ? (
          <GlassCard style={styles.card}>
            <Text style={styles.sectionLabel}>SEGUIMIENTO</Text>
            {steps.map((step, index) => (
              <View key={step.key} style={styles.stepRow}>
                <View style={styles.rail}>
                  <View style={[styles.dot, step.done && styles.dotDone, step.current && styles.dotCurrent]}>
                    {step.done ? <Check size={13} color={COLORS.onPrimary} /> : null}
                  </View>
                  {index < steps.length - 1 ? <View style={[styles.line, step.done && styles.lineDone]} /> : null}
                </View>
                <View style={styles.stepText}>
                  <Text style={[styles.stepLabel, !step.done && !step.current && styles.stepMuted]}>{step.label}</Text>
                  {step.detail ? <Text style={styles.stepDetail}>{step.detail}</Text> : null}
                </View>
              </View>
            ))}
          </GlassCard>
        ) : null}

        <GlassCard style={styles.card}>
          <Text style={styles.sectionLabel}>RESUMEN · {order.code}</Text>
          <Text style={styles.summaryTitle}>{order.service.title}</Text>
          {order.service.price ? <Text style={styles.price}>{order.service.price}€</Text> : null}
          <Text style={styles.summaryLine}>
            {order.vehicle.brand} {order.vehicle.model} · {formatPlate(order.vehicle.plate)}
          </Text>
          {order.client.phone ? (
            <View style={styles.phoneRow}>
              <Phone size={14} color={COLORS.primary} />
              <Text style={styles.summaryLine}>Te contactarán al {formatPhone(order.client.phone)}</Text>
            </View>
          ) : null}
        </GlassCard>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {order.status === 'pending' ? (
          confirmCancel ? (
            <GlassCard style={styles.card}>
              <Text style={styles.summaryLine}>¿Cancelar la solicitud? Dejará de verse para los mecánicos.</Text>
              <View style={styles.rowButtons}>
                <TouchableOpacity style={[styles.secondaryBtn, { flex: 1 }]} onPress={() => setConfirmCancel(false)}>
                  <Text style={styles.secondaryBtnText}>No, mantener</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.dangerBtn, { flex: 1 }]} onPress={cancel} disabled={busy}>
                  {busy ? <ActivityIndicator color={COLORS.error} /> : <Text style={styles.dangerBtnText}>Sí, cancelar</Text>}
                </TouchableOpacity>
              </View>
            </GlassCard>
          ) : (
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setConfirmCancel(true)}>
              <Text style={styles.secondaryBtnText}>Cancelar solicitud</Text>
            </TouchableOpacity>
          )
        ) : null}

        {order.status === 'completed' && isClient ? (
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/timeline')}>
            <Text style={styles.primaryBtnText}>Ver mi cronología</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity style={styles.linkBtn} onPress={goHome}>
          <Text style={styles.linkText}>{isClient ? 'Volver al inicio' : 'Volver al catálogo'}</Text>
        </TouchableOpacity>
      </ScreenContainer>
      {isClient ? <BottomNav /> : null}
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
  hero: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: SPACING.lg,
  },
  title: {
    ...TYPE.headlineMd,
    color: COLORS.onSurface,
    textAlign: 'center',
  },
  subtitle: {
    color: COLORS.onSurfaceVariant,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  elapsed: {
    color: COLORS.tertiary,
    fontSize: 12,
    fontWeight: '700',
  },
  diagnosis: {
    color: COLORS.onSurface,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
  card: {
    gap: 8,
  },
  sectionLabel: {
    ...TYPE.labelSm,
    color: COLORS.onSurfaceVariant,
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
  },
  rail: {
    width: 24,
    alignItems: 'center',
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceContainerLow,
  },
  dotDone: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dotCurrent: {
    borderColor: COLORS.tertiary,
    backgroundColor: 'rgba(236, 106, 6, 0.2)',
  },
  line: {
    flex: 1,
    width: 2,
    marginVertical: 2,
    backgroundColor: COLORS.outlineVariant,
  },
  lineDone: {
    backgroundColor: COLORS.primary,
  },
  stepText: {
    flex: 1,
    paddingBottom: 14,
  },
  stepLabel: {
    color: COLORS.onSurface,
    fontSize: 14,
    fontWeight: '700',
  },
  stepMuted: {
    color: COLORS.onSurfaceVariant,
    fontWeight: '600',
  },
  stepDetail: {
    color: COLORS.onSurfaceVariant,
    fontSize: 12,
    marginTop: 1,
  },
  summaryTitle: {
    color: COLORS.onSurface,
    fontSize: 15,
    fontWeight: '700',
  },
  price: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  summaryLine: {
    color: COLORS.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 17,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  error: {
    color: COLORS.error,
    fontSize: 12,
  },
  rowButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryBtn: {
    height: 50,
    borderRadius: RADIUS.DEFAULT,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: COLORS.onPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryBtn: {
    height: 48,
    borderRadius: RADIUS.DEFAULT,
    backgroundColor: COLORS.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: COLORS.onSurface,
    fontSize: 14,
    fontWeight: '700',
  },
  dangerBtn: {
    height: 48,
    borderRadius: RADIUS.DEFAULT,
    borderWidth: 1,
    borderColor: COLORS.error,
    backgroundColor: 'rgba(255, 180, 171, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerBtnText: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: '700',
  },
  linkBtn: {
    alignSelf: 'center',
    paddingVertical: 8,
  },
  linkText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
});
