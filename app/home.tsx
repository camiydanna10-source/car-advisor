import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import {
  ArrowRight,
  Calendar,
  Car,
  Check,
  ChevronRight,
  ClipboardCheck,
  Disc,
  Droplets,
  Fuel,
  Gauge,
  History,
  Plus,
  ScanSearch,
  ShieldCheck,
  Wrench,
} from 'lucide-react-native';
import { COLORS, RADIUS, SPACING, TYPE } from '../constants/theme';
import { GlassCard } from '../components/GlassCard';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppHeader } from '../components/AppHeader';
import { BottomNav } from '../components/BottomNav';
import { BottomSheet } from '../components/BottomSheet';
import { FadeInView } from '../components/FadeInView';
import { OdometerGauge } from '../components/OdometerGauge';
import { SuggestionCard } from '../components/SuggestionCard';
import { useSession } from '../hooks/useSession';
import { useServiceHistory } from '../hooks/useServiceHistory';
import { useNotificationSync } from '../hooks/useNotificationSync';
import { RECORD_LABEL, formatDate } from '../services/maintenancePlan';
import { SERVICES } from '../services/serviceCatalog';
import { colorHex, formatPlate, getItvInfo, suggestServices } from '../services/vehicleLookup';
import { setActiveVehicle } from '../services/vehicleStorage';

// Client home (dashboard prototype). It only shows data we really have for the vehicle:
// registry fields, ITV status derived from its year, and rule-based service suggestions.
export default function HomeScreen() {
  const router = useRouter();
  const { status, user, vehicles, refresh } = useSession();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const history = useServiceHistory(user?.email, vehicles);
  useNotificationSync(user?.email, vehicles, history.byPlate, history.loaded);

  if (status === 'loading') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }
  if (status === 'guest') return <Redirect href="/" />;
  if (vehicles.length === 0) {
    return (
      <Redirect
        href={{ pathname: '/register-vehicle', params: { name: user?.name ?? '', mode: 'complete' } }}
      />
    );
  }

  const vehicle = vehicles[0];
  const records = history.byPlate[vehicle.plate] ?? [];
  const itv = getItvInfo(vehicle, records);
  const suggestions = suggestServices(vehicle, records);
  const lastService = [...records]
    .filter(r => r.type !== 'odometer')
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const itvTitle = {
    overdue: 'ITV vencida',
    soon: 'Pre-ITV recomendada',
    unknown: 'Registra tu última ITV',
    ok: itv.basis === 'registered' ? 'ITV al día' : 'ITV sin urgencia',
  }[itv.status];
  const mainSuggestion = suggestions[0];
  const alertCount = suggestions.filter(s => s.priority !== 'low').length;
  const urgent = mainSuggestion.priority === 'high';

  const requestService = (serviceTitle: string, servicePrice: string) =>
    router.push({
      pathname: '/request-service',
      params: { serviceTitle, servicePrice, plate: vehicle.plate },
    });

  const switchVehicle = async (plate: string) => {
    if (user) await setActiveVehicle(user.email, plate);
    await refresh();
    setSwitcherOpen(false);
  };

  const quickActions = [
    { id: 's6', title: 'Pre-ITV', sub: 'Revisión previa a la ITV', icon: ClipboardCheck },
    { id: 's1', title: 'Cambio de aceite', sub: vehicle.specs.aceite.tipo, icon: Droplets },
    { id: 's2', title: 'Diagnóstico OBD-II', sub: 'Lectura de códigos de error', icon: ScanSearch },
    { id: 's3', title: 'Neumáticos', sub: vehicle.specs.neumaticos.medida, icon: Disc },
  ].map(action => ({ ...action, service: SERVICES.find(s => s.id === action.id)! }));

  return (
    <>
      <AppHeader
        userName={user?.name}
        vehicleLabel={`${vehicle.brand} ${vehicle.model.split(' ')[0]} · ${vehicle.year}`}
        onVehiclePress={() => setSwitcherOpen(true)}
        alertCount={alertCount}
        onBellPress={() => setAlertsOpen(true)}
      />
      <ScreenContainer contentContainerStyle={styles.content}>
        {/* Hero: linked vehicle */}
        <FadeInView>
          <GlassCard style={styles.hero}>
            <View style={styles.heroGlow} pointerEvents="none" />
            <View style={styles.heroTop}>
              <View style={{ flex: 1 }}>
                <View style={styles.linkedRow}>
                  <View style={styles.linkedDot} />
                  <Text style={styles.linkedLabel}>VEHÍCULO VINCULADO</Text>
                </View>
                <Text style={styles.vehicleName} numberOfLines={1}>
                  {vehicle.brand} {vehicle.model}
                </Text>
                <Text style={styles.vehicleSub}>
                  {vehicle.year} · {vehicle.color}
                </Text>
              </View>
              <View style={styles.plateChip}>
                <Text style={styles.plateText}>{formatPlate(vehicle.plate)}</Text>
              </View>
            </View>

            <View style={styles.heroVisual}>
              <View style={styles.heroCircleA} pointerEvents="none" />
              <View style={styles.heroCircleB} pointerEvents="none" />
              <Car size={84} color={COLORS.primary} strokeWidth={1.25} />
              <View style={styles.heroStrip}>
                <View style={styles.heroStripIcon}>
                  <ShieldCheck size={16} color={COLORS.onPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroStripTitle} numberOfLines={1}>
                    {itvTitle}
                  </Text>
                  <Text style={styles.heroStripSub} numberOfLines={1}>{itv.summary}</Text>
                </View>
                <View style={styles.colorPill}>
                  <View style={[styles.colorDot, { backgroundColor: colorHex(vehicle.color) }]} />
                </View>
              </View>
            </View>
          </GlassCard>
        </FadeInView>

        {/* Instrument cluster */}
        <FadeInView delay={90}>
          <GlassCard style={styles.cluster}>
            <View style={styles.clusterHeader}>
              <Gauge size={17} color={COLORS.primary} />
              <Text style={styles.clusterTitle}>DATOS DEL VEHÍCULO</Text>
            </View>
            <OdometerGauge km={vehicle.mileage} caption={`Matriculado en ${vehicle.year}`} />
            <View style={styles.metricsRow}>
              <View style={styles.metric}>
                <View style={styles.metricIcon}>
                  <Fuel size={17} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.metricLabel}>Motor</Text>
                  <Text style={styles.metricValue} numberOfLines={1}>{vehicle.motor}</Text>
                </View>
              </View>
              <View style={styles.metric}>
                <View style={styles.metricIcon}>
                  <ClipboardCheck size={17} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.metricLabel}>ITV</Text>
                  <Text style={styles.metricValue} numberOfLines={1}>{itv.short}</Text>
                </View>
              </View>
            </View>
          </GlassCard>
        </FadeInView>

        {/* Preventive maintenance alert */}
        <FadeInView delay={180}>
          <GlassCard variant="high" style={styles.alertCard}>
            <View
              style={[
                styles.alertAccent,
                { backgroundColor: urgent ? COLORS.tertiaryContainer : COLORS.primary },
              ]}
            />
            <View style={styles.alertTop}>
              <View style={styles.alertIcon}>
                <Wrench size={20} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.alertLabelRow}>
                  <Text style={styles.alertLabel}>MANTENIMIENTO PREVENTIVO</Text>
                  <Text style={[styles.alertChip, urgent && styles.alertChipUrgent]}>
                    {urgent ? 'Pronto' : 'Recomendado'}
                  </Text>
                </View>
                <Text style={styles.alertTitle}>{mainSuggestion.service.title}</Text>
                <Text style={styles.alertReason}>{mainSuggestion.reason}</Text>
              </View>
            </View>
            <View style={styles.alertFooter}>
              <View style={styles.alertMeta}>
                <Calendar size={14} color={COLORS.primary} />
                <Text style={styles.alertMetaText}>
                  {mainSuggestion.service.estimatedTime} · {mainSuggestion.service.price}€
                </Text>
              </View>
              <TouchableOpacity
                style={styles.alertBtn}
                onPress={() =>
                  requestService(mainSuggestion.service.title, String(mainSuggestion.service.price))
                }
              >
                <Text style={styles.alertBtnText}>Apartar turno</Text>
                <ArrowRight size={15} color={COLORS.onPrimary} />
              </TouchableOpacity>
            </View>
          </GlassCard>
        </FadeInView>

        {/* Quick actions */}
        <FadeInView delay={270}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Acciones rápidas</Text>
            <TouchableOpacity onPress={() => router.replace('/catalog')}>
              <Text style={styles.sectionLink}>Ver todos los servicios</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.actionsGrid}>
            {quickActions.map(action => {
              const Icon = action.icon;
              return (
                <TouchableOpacity
                  key={action.id}
                  style={styles.actionItem}
                  activeOpacity={0.8}
                  onPress={() => requestService(action.service.title, String(action.service.price))}
                >
                  <GlassCard style={styles.actionCard}>
                    <View style={styles.actionIcon}>
                      <Icon size={21} color={COLORS.primary} />
                    </View>
                    <Text style={styles.actionTitle} numberOfLines={1}>{action.title}</Text>
                    <Text style={styles.actionSub} numberOfLines={1}>{action.sub}</Text>
                    <View style={styles.actionFooter}>
                      <Text style={styles.actionMeta}>
                        {action.service.price}€ · {action.service.estimatedTime}
                      </Text>
                      <ChevronRight size={15} color={COLORS.onSurfaceVariant} />
                    </View>
                  </GlassCard>
                </TouchableOpacity>
              );
            })}
          </View>
        </FadeInView>

        {/* Service history (no history data yet) */}
        <FadeInView delay={360}>
          <Text style={styles.sectionTitle}>Último servicio realizado</Text>
          <TouchableOpacity activeOpacity={0.85} onPress={() => router.replace('/timeline')}>
            <GlassCard style={styles.historyCard}>
              <View style={styles.historyIcon}>
                <History size={18} color={lastService ? COLORS.primary : COLORS.onSurfaceVariant} />
              </View>
              {lastService ? (
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyTitle}>{RECORD_LABEL[lastService.type]}</Text>
                  <Text style={styles.historyText}>
                    {formatDate(lastService.date)} · {lastService.km.toLocaleString('es-ES')} km
                  </Text>
                </View>
              ) : (
                <Text style={styles.historyText}>
                  Todavía no hay servicios registrados. Añádelos en tu cronología para recibir avisos exactos.
                </Text>
              )}
              <ChevronRight size={16} color={COLORS.onSurfaceVariant} />
            </GlassCard>
          </TouchableOpacity>
        </FadeInView>
      </ScreenContainer>
      <BottomNav />

      {/* Vehicle switcher */}
      <BottomSheet
        visible={switcherOpen}
        onClose={() => setSwitcherOpen(false)}
        title="Mis vehículos"
        subtitle="Elige con cuál quieres trabajar"
      >
        {vehicles.map(item => {
          const active = item.plate === vehicle.plate;
          return (
            <TouchableOpacity
              key={item.plate}
              style={[styles.vehicleRow, active && styles.vehicleRowActive]}
              onPress={() => switchVehicle(item.plate)}
            >
              <View style={[styles.rowSwatch, { backgroundColor: colorHex(item.color) }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{item.brand} {item.model}</Text>
                <Text style={styles.rowMeta}>
                  {formatPlate(item.plate)} · {item.year} · {item.mileage.toLocaleString('es-ES')} km
                </Text>
              </View>
              {active ? <Check size={18} color={COLORS.primary} /> : null}
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          style={styles.addRow}
          onPress={() => {
            setSwitcherOpen(false);
            router.push({
              pathname: '/register-vehicle',
              params: { name: user?.name ?? '', mode: 'add' },
            });
          }}
        >
          <Plus size={16} color={COLORS.primary} />
          <Text style={styles.addRowText}>Añadir otro vehículo</Text>
        </TouchableOpacity>
      </BottomSheet>

      {/* Maintenance alerts (bell) */}
      <BottomSheet
        visible={alertsOpen}
        onClose={() => setAlertsOpen(false)}
        title="Avisos de mantenimiento"
        subtitle={`Recomendaciones para tu ${vehicle.brand} ${vehicle.model}`}
      >
        {suggestions.map(suggestion => (
          <SuggestionCard
            key={suggestion.service.id}
            suggestion={suggestion}
            onRequest={() => {
              setAlertsOpen(false);
              requestService(suggestion.service.title, String(suggestion.service.price));
            }}
          />
        ))}
      </BottomSheet>
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
  // Hero
  hero: {
    gap: SPACING.sm,
  },
  heroGlow: {
    position: 'absolute',
    right: -40,
    bottom: -32,
    width: 176,
    height: 176,
    borderRadius: 88,
    backgroundColor: 'rgba(107, 216, 203, 0.10)',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  linkedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  linkedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  linkedLabel: {
    ...TYPE.labelSm,
    color: COLORS.primary,
    letterSpacing: 1,
    fontWeight: '700',
  },
  vehicleName: {
    ...TYPE.headlineMd,
    color: COLORS.onSurface,
    marginTop: 2,
  },
  vehicleSub: {
    ...TYPE.bodySm,
    color: COLORS.onSurfaceVariant,
    marginTop: 1,
  },
  plateChip: {
    backgroundColor: COLORS.surfaceContainerHighest,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  plateText: {
    ...TYPE.labelMd,
    color: COLORS.primary,
    letterSpacing: 2,
    fontWeight: '700',
  },
  heroVisual: {
    height: 150,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceContainerLowest,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 34,
  },
  heroCircleA: {
    position: 'absolute',
    left: -30,
    top: -40,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(107, 216, 203, 0.07)',
  },
  heroCircleB: {
    position: 'absolute',
    right: -20,
    bottom: -50,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(236, 106, 6, 0.06)',
  },
  heroStrip: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(50, 53, 55, 0.88)',
    borderRadius: RADIUS.DEFAULT,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  heroStripIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroStripTitle: {
    color: COLORS.onSurface,
    fontSize: 12,
    fontWeight: '700',
  },
  heroStripSub: {
    color: COLORS.onSurfaceVariant,
    fontSize: 10,
    marginTop: 1,
  },
  colorPill: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: RADIUS.full,
    padding: 5,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  // Cluster
  cluster: {
    gap: SPACING.sm,
  },
  clusterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  clusterTitle: {
    ...TYPE.labelSm,
    color: COLORS.onSurfaceVariant,
    letterSpacing: 1,
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  metric: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.DEFAULT,
    padding: 10,
  },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    ...TYPE.labelSm,
    color: COLORS.onSurfaceVariant,
  },
  metricValue: {
    color: COLORS.onSurface,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 1,
  },
  // Alert
  alertCard: {
    gap: SPACING.sm,
    paddingLeft: SPACING.md + 6,
  },
  alertAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
  },
  alertTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(107, 216, 203, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  alertLabel: {
    ...TYPE.labelSm,
    color: COLORS.primary,
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  alertChip: {
    color: COLORS.primary,
    backgroundColor: 'rgba(107, 216, 203, 0.15)',
    fontSize: 9,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  alertChipUrgent: {
    color: COLORS.tertiary,
    backgroundColor: 'rgba(236, 106, 6, 0.2)',
  },
  alertTitle: {
    ...TYPE.headlineSm,
    color: COLORS.onSurface,
    marginTop: 2,
  },
  alertReason: {
    ...TYPE.bodySm,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
    lineHeight: 17,
  },
  alertFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    paddingTop: 4,
  },
  alertMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  alertMetaText: {
    color: COLORS.onSurfaceVariant,
    fontSize: 12,
  },
  alertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
  },
  alertBtnText: {
    color: COLORS.onPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  // Quick actions
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    ...TYPE.headlineSm,
    color: COLORS.onSurface,
    marginBottom: SPACING.sm,
  },
  sectionLink: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  actionItem: {
    flexGrow: 1,
    flexBasis: '45%',
    minWidth: 140,
  },
  actionCard: {
    gap: 4,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.DEFAULT,
    backgroundColor: COLORS.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionTitle: {
    color: COLORS.onSurface,
    fontSize: 15,
    fontWeight: '700',
  },
  actionSub: {
    color: COLORS.onSurfaceVariant,
    fontSize: 12,
  },
  actionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  actionMeta: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  // History
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyTitle: {
    color: COLORS.onSurface,
    fontSize: 14,
    fontWeight: '700',
  },
  historyText: {
    flex: 1,
    color: COLORS.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 17,
  },
  // Sheets
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surfaceContainerHigh,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'transparent',
    padding: 12,
  },
  vehicleRowActive: {
    borderColor: COLORS.primary,
  },
  rowSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  rowName: {
    color: COLORS.onSurface,
    fontSize: 14,
    fontWeight: '700',
  },
  rowMeta: {
    color: COLORS.onSurfaceVariant,
    fontSize: 11,
    marginTop: 2,
  },
  addRow: {
    height: 44,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(107, 216, 203, 0.4)',
    backgroundColor: 'rgba(107, 216, 203, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addRowText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
});
