import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Redirect } from 'expo-router';
import {
  AlertOctagon,
  CheckCircle2,
  MapPin,
  MessageSquare,
  Navigation,
  Phone,
  ShieldCheck,
  X,
} from 'lucide-react-native';
import { COLORS, RADIUS, SPACING, TYPE } from '../constants/theme';
import { GlassCard } from '../components/GlassCard';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppHeader } from '../components/AppHeader';
import { BottomNav } from '../components/BottomNav';
import { FadeInView } from '../components/FadeInView';
import { useSession } from '../hooks/useSession';
import { useWorkshop } from '../hooks/useWorkshop';
import {
  SosAlert,
  acceptSosAlert,
  completeSosAlert,
  rejectSosAlert,
  setShiftActive,
  timeAgo,
} from '../services/orders';
import { formatPhone, telUrl, whatsappUrl } from '../services/phone';
import { formatPlate } from '../services/vehicleLookup';

// SOS inbox of the mechanic: separate from the scheduled services. The "on guard" switch only
// controls these alerts (and the siren); the services inbox does not depend on it.
export default function WorkshopSosScreen() {
  const { status, role, user } = useSession();
  const workshop = useWorkshop(user?.email);
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
  const { alerts, shiftActive } = workshop;

  const openAlerts = shiftActive
    ? alerts.filter(a => a.status === 'open' && !a.rejectedBy.includes(me.email))
    : [];
  const inProgress = alerts.filter(a => a.status === 'accepted' && a.mechanic?.email === me.email);
  const finished = alerts.filter(a => a.status === 'completed' && a.mechanic?.email === me.email).slice(0, 5);

  const run = async (id: string, action: () => Promise<void>) => {
    setBusyId(id);
    setNotice('');
    try {
      await action();
    } catch (err: any) {
      setNotice(err.message || 'No se pudo completar la acción.');
    } finally {
      setBusyId(null);
      await workshop.reload();
    }
  };

  const open = (url: string, failure: string) => Linking.openURL(url).catch(() => setNotice(failure));

  const openRoute = (alert: SosAlert) => {
    if (!alert.mapsUrl) {
      setNotice('El cliente no compartió su ubicación: llámalo para saber dónde está.');
      return;
    }
    open(alert.mapsUrl, 'No se pudo abrir el mapa en este dispositivo.');
  };

  const clientLine = (alert: SosAlert) =>
    `${alert.client.name}${
      alert.vehicle ? ` · ${alert.vehicle.brand} ${alert.vehicle.model} (${formatPlate(alert.vehicle.plate)})` : ''
    }`;

  const placeText = (alert: SosAlert) =>
    alert.location
      ? alert.location.address ?? `${alert.location.latitude.toFixed(5)}, ${alert.location.longitude.toFixed(5)}`
      : 'Sin ubicación GPS: llama al cliente';

  const registeredChip = (alert: SosAlert) => (
    <View style={[styles.chip, alert.client.email ? styles.chipRegistered : styles.chipGuest]}>
      <Text style={[styles.chipText, !alert.client.email && { color: COLORS.onSurfaceVariant }]}>
        {alert.client.email ? 'REGISTRADO' : 'INVITADO'}
      </Text>
    </View>
  );

  return (
    <>
      <AppHeader userName={user.name} modeLabel="Modo Mecánico" />
      <ScreenContainer contentContainerStyle={styles.content}>
        <FadeInView>
          <Text style={styles.eyebrow}>BANDEJA SOS</Text>
          <Text style={styles.title}>Auxilio en carretera</Text>
        </FadeInView>

        {/* On guard: only for SOS */}
        <FadeInView delay={60}>
          <GlassCard style={styles.guardCard}>
            <ShieldCheck size={22} color={shiftActive ? COLORS.primary : COLORS.outline} />
            <View style={{ flex: 1 }}>
              <Text style={styles.guardTitle}>{shiftActive ? 'De guardia SOS' : 'Fuera de guardia'}</Text>
              <Text style={styles.guardSub}>
                {shiftActive
                  ? 'Recibes los avisos de auxilio con alarma. Los servicios programados no dependen de esto.'
                  : 'No recibes avisos SOS ni suena la alarma. Tus servicios programados no cambian.'}
              </Text>
            </View>
            <Switch
              value={shiftActive}
              onValueChange={next => run('guard', () => setShiftActive(me.email, next))}
              disabled={busyId === 'guard'}
              trackColor={{ false: COLORS.surfaceContainerHighest, true: COLORS.primaryContainer }}
              thumbColor={shiftActive ? COLORS.primary : COLORS.outline}
              accessibilityLabel="Guardia SOS"
            />
          </GlassCard>
        </FadeInView>

        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        {/* New alerts */}
        <View style={styles.block}>
          <Text style={styles.sectionTitle}>Alertas nuevas</Text>
          {openAlerts.length === 0 ? (
            <GlassCard style={styles.emptyCard}>
              <AlertOctagon size={20} color={COLORS.onSurfaceVariant} />
              <Text style={styles.emptyText}>
                {shiftActive
                  ? 'No hay auxilios pendientes. Cuando un cliente lance un SOS sonará la alarma.'
                  : 'Activa la guardia para recibir avisos de auxilio.'}
              </Text>
            </GlassCard>
          ) : (
            openAlerts.map(alert => (
              <FadeInView key={alert.id}>
                <GlassCard style={styles.sosCard}>
                  <View style={styles.sosTop}>
                    <View style={styles.sosIcon}>
                      <AlertOctagon size={20} color="#FFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sosLabel}>AUXILIO VIAL · {alert.code}</Text>
                      <Text style={styles.sosTitle}>{alert.emergency.label}</Text>
                    </View>
                    <Text style={styles.muted}>{timeAgo(alert.createdAt)}</Text>
                  </View>
                  <View style={styles.rowWrap}>
                    <Text style={styles.body}>{clientLine(alert)}</Text>
                    {registeredChip(alert)}
                  </View>
                  <View style={styles.rowWrap}>
                    <MapPin size={14} color={COLORS.tertiary} />
                    <Text style={[styles.muted, { flex: 1 }]} numberOfLines={2}>
                      {placeText(alert)}
                    </Text>
                  </View>
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => run(alert.id, () => rejectSosAlert(alert.id, me.email))}
                      disabled={busyId === alert.id}
                    >
                      <X size={15} color={COLORS.onSurfaceVariant} />
                      <Text style={styles.rejectText}>Rechazar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.acceptBtn}
                      onPress={() => run(alert.id, () => acceptSosAlert(alert.id, me))}
                      disabled={busyId === alert.id}
                    >
                      <CheckCircle2 size={16} color="#FFF" />
                      <Text style={styles.acceptText}>Aceptar auxilio</Text>
                    </TouchableOpacity>
                  </View>
                </GlassCard>
              </FadeInView>
            ))
          )}
        </View>

        {/* Accepted: call first, then the route */}
        {inProgress.length > 0 ? (
          <View style={styles.block}>
            <Text style={styles.sectionTitle}>En curso</Text>
            {inProgress.map(alert => (
              <GlassCard key={alert.id} style={styles.progressCard}>
                <View style={styles.sosTop}>
                  <View style={[styles.sosIcon, { backgroundColor: COLORS.primaryContainer }]}>
                    <CheckCircle2 size={20} color="#FFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sosLabel, { color: COLORS.primary }]}>ACEPTADO · {alert.code}</Text>
                    <Text style={styles.sosTitle}>{alert.emergency.label}</Text>
                  </View>
                </View>
                <View style={styles.rowWrap}>
                  <Text style={styles.body}>{clientLine(alert)}</Text>
                  {registeredChip(alert)}
                </View>

                <Text style={styles.stepLabel}>1 · Llama al cliente</Text>
                {alert.client.phone ? (
                  <>
                    <Text style={styles.phone}>{formatPhone(alert.client.phone)}</Text>
                    <View style={styles.actions}>
                      <TouchableOpacity
                        style={styles.callBtn}
                        onPress={() => open(telUrl(alert.client.phone!), 'No se pudo iniciar la llamada.')}
                      >
                        <Phone size={16} color={COLORS.onPrimary} />
                        <Text style={styles.callText}>Llamar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.whatsBtn}
                        onPress={() =>
                          open(
                            whatsappUrl(
                              alert.client.phone!,
                              `Hola ${alert.client.name}, soy ${me.name} de CarAdvisor. He aceptado tu auxilio (${alert.emergency.label}) y voy hacia ti.`
                            ),
                            'No se pudo abrir WhatsApp.'
                          )
                        }
                      >
                        <MessageSquare size={16} color={COLORS.primary} />
                        <Text style={styles.whatsText}>WhatsApp</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <Text style={styles.muted}>El cliente no dejó teléfono.</Text>
                )}

                <Text style={styles.stepLabel}>2 · Ve a la ubicación</Text>
                <Text style={styles.muted}>{placeText(alert)}</Text>
                <TouchableOpacity style={styles.routeBtn} onPress={() => openRoute(alert)}>
                  <Navigation size={16} color="#FFF" />
                  <Text style={styles.routeText}>Ver ruta</Text>
                </TouchableOpacity>

                <Text style={styles.stepLabel}>3 · Cuando termines</Text>
                <TouchableOpacity
                  style={styles.doneBtn}
                  onPress={() => run(alert.id, () => completeSosAlert(alert.id))}
                  disabled={busyId === alert.id}
                >
                  <Text style={styles.doneText}>Auxilio terminado</Text>
                </TouchableOpacity>
              </GlassCard>
            ))}
          </View>
        ) : null}

        {finished.length > 0 ? (
          <View style={styles.block}>
            <Text style={styles.sectionTitle}>Atendidos recientemente</Text>
            {finished.map(alert => (
              <GlassCard key={alert.id} style={styles.finishedCard}>
                <CheckCircle2 size={16} color={COLORS.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.body}>
                    {alert.code} · {alert.emergency.label}
                  </Text>
                  <Text style={styles.muted}>
                    {alert.client.name} · {timeAgo(alert.completedAt ?? alert.createdAt)}
                  </Text>
                </View>
              </GlassCard>
            ))}
          </View>
        ) : null}
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
  eyebrow: {
    ...TYPE.labelSm,
    color: COLORS.tertiary,
    letterSpacing: 1.2,
    fontWeight: '700',
  },
  title: {
    ...TYPE.headlineLg,
    color: COLORS.onSurface,
    marginTop: 2,
  },
  block: {
    gap: SPACING.sm,
  },
  sectionTitle: {
    ...TYPE.headlineSm,
    color: COLORS.onSurface,
  },
  guardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  guardTitle: {
    ...TYPE.headlineSm,
    color: COLORS.onSurface,
  },
  guardSub: {
    color: COLORS.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 1,
  },
  notice: {
    color: COLORS.tertiary,
    fontSize: 12,
    lineHeight: 17,
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
  sosCard: {
    gap: 10,
    borderColor: COLORS.tertiaryContainer,
    borderWidth: 1,
    backgroundColor: 'rgba(236, 106, 6, 0.10)',
  },
  progressCard: {
    gap: 8,
    borderColor: 'rgba(107, 216, 203, 0.4)',
    borderWidth: 1,
  },
  sosTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sosIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.tertiaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosLabel: {
    ...TYPE.labelSm,
    color: COLORS.tertiary,
    letterSpacing: 0.8,
    fontWeight: '800',
  },
  sosTitle: {
    color: COLORS.onSurface,
    fontSize: 16,
    fontWeight: '700',
  },
  rowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  body: {
    color: COLORS.onSurface,
    fontSize: 13,
    flexShrink: 1,
  },
  muted: {
    color: COLORS.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 17,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  chipRegistered: {
    backgroundColor: 'rgba(107, 216, 203, 0.15)',
  },
  chipGuest: {
    backgroundColor: COLORS.surfaceContainerHigh,
  },
  chipText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  rejectBtn: {
    flex: 1,
    height: 44,
    borderRadius: RADIUS.DEFAULT,
    backgroundColor: COLORS.surfaceContainerHigh,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  rejectText: {
    color: COLORS.onSurfaceVariant,
    fontSize: 13,
    fontWeight: '700',
  },
  acceptBtn: {
    flex: 1.5,
    height: 44,
    borderRadius: RADIUS.DEFAULT,
    backgroundColor: COLORS.tertiaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  acceptText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  stepLabel: {
    ...TYPE.labelSm,
    color: COLORS.primary,
    letterSpacing: 0.8,
    fontWeight: '800',
    marginTop: 6,
  },
  phone: {
    color: COLORS.onSurface,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  callBtn: {
    flex: 1,
    height: 44,
    borderRadius: RADIUS.DEFAULT,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  callText: {
    color: COLORS.onPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  whatsBtn: {
    flex: 1,
    height: 44,
    borderRadius: RADIUS.DEFAULT,
    borderWidth: 1,
    borderColor: 'rgba(107, 216, 203, 0.5)',
    backgroundColor: 'rgba(107, 216, 203, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  whatsText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  routeBtn: {
    height: 44,
    borderRadius: RADIUS.DEFAULT,
    backgroundColor: COLORS.tertiaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  routeText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  doneBtn: {
    height: 44,
    borderRadius: RADIUS.DEFAULT,
    backgroundColor: COLORS.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: {
    color: COLORS.onSurface,
    fontSize: 13,
    fontWeight: '700',
  },
  finishedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
