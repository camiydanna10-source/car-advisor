import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import {
  ArrowRight,
  Car,
  ClipboardCheck,
  Disc,
  Droplets,
  Gauge,
  Plus,
  ScanSearch,
  Trash2,
  type LucideIcon,
} from 'lucide-react-native';
import { COLORS, RADIUS, SPACING, TYPE } from '../constants/theme';
import { GlassCard } from '../components/GlassCard';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppHeader } from '../components/AppHeader';
import { BottomNav } from '../components/BottomNav';
import { BottomSheet } from '../components/BottomSheet';
import { FadeInView } from '../components/FadeInView';
import { useSession } from '../hooks/useSession';
import { useServiceHistory } from '../hooks/useServiceHistory';
import { useNotificationSync } from '../hooks/useNotificationSync';
import {
  MaintenanceKind,
  MaintenanceStatus,
  RECORD_LABEL,
  RecordType,
  ServiceRecord,
  buildMaintenancePlan,
  formatDate,
  toISODate,
} from '../services/maintenancePlan';
import { SERVICES } from '../services/serviceCatalog';
import { addRecord, deleteRecord } from '../services/serviceHistoryStorage';
import { updateVehicle } from '../services/vehicleStorage';

const KIND_ICON: Record<MaintenanceKind, LucideIcon> = {
  itv: ClipboardCheck,
  oil: Droplets,
  tires: Disc,
  diagnostic: ScanSearch,
};

const RECORD_ICON: Record<RecordType, LucideIcon> = {
  itv: ClipboardCheck,
  oil: Droplets,
  tires: Disc,
  diagnostic: ScanSearch,
  odometer: Gauge,
};

const RECORD_TYPES: RecordType[] = ['itv', 'oil', 'tires', 'diagnostic', 'odometer'];
const TYPE_CHIP: Record<RecordType, string> = {
  itv: 'ITV',
  oil: 'Aceite',
  tires: 'Neumáticos',
  diagnostic: 'OBD-II',
  odometer: 'Kilometraje',
};

const SOURCE_LABEL: Record<ServiceRecord['source'], string> = {
  user: 'Registrado por ti',
  provider: 'Datos oficiales',
  workshop: 'Taller CarAdvisor',
};

const STATUS_STYLE: Record<MaintenanceStatus, { bg: string; fg: string; label?: string }> = {
  overdue: { bg: 'rgba(255, 180, 171, 0.16)', fg: COLORS.error },
  soon: { bg: 'rgba(236, 106, 6, 0.2)', fg: COLORS.tertiary },
  ok: { bg: 'rgba(107, 216, 203, 0.15)', fg: COLORS.primary },
  unknown: { bg: COLORS.surfaceContainerHigh, fg: COLORS.onSurfaceVariant },
};

// "ddmmyyyy" typed digits -> "dd/mm/yyyy"
const maskDate = (text: string) => {
  const d = text.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
};

// "dd/mm/yyyy" -> ISO date, or null when it is not a real date.
const parseTypedDate = (text: string) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!m) return null;
  const [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(year, month - 1, day, 12);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
};

export default function TimelineScreen() {
  const router = useRouter();
  const { status, user, vehicles, refresh } = useSession();
  const history = useServiceHistory(user?.email, vehicles);
  useNotificationSync(user?.email, vehicles, history.byPlate, history.loaded);

  const [formOpen, setFormOpen] = useState(false);
  const [type, setType] = useState<RecordType>('oil');
  const [dateText, setDateText] = useState('');
  const [kmText, setKmText] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

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
  const records = [...(history.byPlate[vehicle.plate] ?? [])].sort((a, b) =>
    a.date === b.date ? b.km - a.km : a.date < b.date ? 1 : -1
  );
  const plan = buildMaintenancePlan(vehicle, records);
  const hasEstimates = plan.some(item => item.basis === 'estimated' && item.kind !== 'diagnostic');

  const openForm = (preset: RecordType = 'oil') => {
    setType(preset);
    setDateText(formatDate(new Date()));
    setKmText(String(vehicle.mileage));
    setError('');
    setFormOpen(true);
  };

  const requestService = (serviceId: string) => {
    const service = SERVICES.find(s => s.id === serviceId);
    if (!service) return;
    router.push({
      pathname: '/request-service',
      params: { serviceTitle: service.title, servicePrice: String(service.price), plate: vehicle.plate },
    });
  };

  const save = async () => {
    if (!user) return;
    const date = parseTypedDate(dateText);
    const km = Number(kmText.replace(/\D/g, ''));
    if (!date) return setError('Escribe la fecha con el formato dd/mm/aaaa.');
    if (date.getTime() > Date.now()) return setError('La fecha no puede ser futura.');
    if (date.getFullYear() < vehicle.year) return setError(`La fecha no puede ser anterior a ${vehicle.year} (año del vehículo).`);
    if (!kmText.trim() || !Number.isFinite(km) || km > 999999) return setError('Indica el kilometraje (solo números).');

    setSaving(true);
    try {
      await addRecord(user.email, { plate: vehicle.plate, type, date: toISODate(date), km });
      // A newer odometer reading also updates the vehicle, so every km-based notice stays current.
      if (km > vehicle.mileage) await updateVehicle(user.email, vehicle.plate, { mileage: km });
      await Promise.all([history.reload(), refresh()]);
      setFormOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!user) return;
    await deleteRecord(user.email, vehicle.plate, id);
    setConfirmId(null);
    await history.reload();
  };

  return (
    <>
      <AppHeader userName={user?.name} />
      <ScreenContainer contentContainerStyle={styles.content}>
        <FadeInView>
          <Text style={styles.eyebrow}>CRONOLOGÍA</Text>
          <Text style={styles.title}>Salud y mantenimiento</Text>
          <View style={styles.vehicleRow}>
            <Car size={14} color={COLORS.primary} />
            <Text style={styles.vehicleText} numberOfLines={1}>
              {vehicle.brand} {vehicle.model} · {vehicle.mileage.toLocaleString('es-ES')} km
            </Text>
          </View>
        </FadeInView>

        {/* Maintenance status */}
        <FadeInView delay={80} style={styles.block}>
          <Text style={styles.sectionTitle}>Estado del mantenimiento</Text>
          {plan.map(item => {
            const Icon = KIND_ICON[item.kind];
            const tone = STATUS_STYLE[item.status];
            return (
              <GlassCard key={item.kind} style={styles.planCard}>
                <View style={styles.planTop}>
                  <View style={styles.planIcon}>
                    <Icon size={19} color={COLORS.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.planLabel}>{item.label}</Text>
                    {item.basis === 'estimated' ? (
                      <Text style={styles.planBasis}>Estimación · sin fechas registradas</Text>
                    ) : null}
                  </View>
                  <View style={[styles.statusChip, { backgroundColor: tone.bg }]}>
                    <Text style={[styles.statusText, { color: tone.fg }]}>{item.headline}</Text>
                  </View>
                </View>
                {item.reason ? <Text style={styles.planReason}>{item.reason}</Text> : null}
                <View style={styles.planActions}>
                  <TouchableOpacity onPress={() => openForm(item.kind)}>
                    <Text style={styles.linkText}>Registrar último servicio</Text>
                  </TouchableOpacity>
                  {item.status !== 'ok' ? (
                    <TouchableOpacity style={styles.requestBtn} onPress={() => requestService(item.serviceId)}>
                      <Text style={styles.requestBtnText}>Solicitar</Text>
                      <ArrowRight size={13} color={COLORS.onPrimary} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </GlassCard>
            );
          })}
          {hasEstimates ? (
            <Text style={styles.hint}>
              Registra la fecha de tu última ITV y de tus últimos servicios para recibir avisos exactos en el móvil.
            </Text>
          ) : null}
        </FadeInView>

        {/* History */}
        <FadeInView delay={160} style={styles.block}>
          <View style={styles.historyHeader}>
            <Text style={styles.sectionTitle}>Historial</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => openForm()}>
              <Plus size={14} color={COLORS.primary} />
              <Text style={styles.addBtnText}>Registrar</Text>
            </TouchableOpacity>
          </View>

          <View>
            {records.map(record => {
              const Icon = RECORD_ICON[record.type];
              return (
                <View key={record.id} style={styles.event}>
                  <View style={styles.rail}>
                    <View style={styles.dot}>
                      <Icon size={13} color={COLORS.onPrimary} />
                    </View>
                    <View style={styles.line} />
                  </View>
                  <GlassCard style={styles.eventCard}>
                    <View style={styles.eventTop}>
                      <Text style={styles.eventTitle}>{RECORD_LABEL[record.type]}</Text>
                      {record.source === 'user' ? (
                        <TouchableOpacity
                          onPress={() => setConfirmId(confirmId === record.id ? null : record.id)}
                          accessibilityLabel="Eliminar registro"
                        >
                          <Trash2 size={15} color={COLORS.onSurfaceVariant} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                    <Text style={styles.eventMeta}>
                      {formatDate(record.date)} · {record.km.toLocaleString('es-ES')} km
                    </Text>
                    <Text style={styles.eventSource}>{SOURCE_LABEL[record.source]}</Text>
                    {confirmId === record.id ? (
                      <View style={styles.confirmRow}>
                        <Text style={styles.confirmText}>¿Eliminar este registro?</Text>
                        <TouchableOpacity onPress={() => remove(record.id)}>
                          <Text style={styles.confirmYes}>Sí, eliminar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setConfirmId(null)}>
                          <Text style={styles.linkText}>No</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </GlassCard>
                </View>
              );
            })}

            {/* Registration (always known: it comes from the plate lookup) */}
            <View style={styles.event}>
              <View style={styles.rail}>
                <View style={[styles.dot, styles.dotMuted]}>
                  <Car size={13} color={COLORS.onSurfaceVariant} />
                </View>
              </View>
              <GlassCard style={styles.eventCard}>
                <Text style={styles.eventTitle}>Matriculación</Text>
                <Text style={styles.eventMeta}>
                  {vehicle.registrationDate ? formatDate(vehicle.registrationDate) : vehicle.year}
                  {' · '}
                  {vehicle.brand} {vehicle.model}
                </Text>
              </GlassCard>
            </View>
          </View>

          {records.length === 0 ? (
            <Text style={styles.hint}>
              Aún no hay servicios registrados. Cuando solicites uno en CarAdvisor, o lo añadas tú, aparecerá aquí.
            </Text>
          ) : null}
        </FadeInView>
      </ScreenContainer>
      <BottomNav />

      <BottomSheet
        visible={formOpen}
        onClose={() => setFormOpen(false)}
        title="Registrar servicio"
        subtitle={`${vehicle.brand} ${vehicle.model}`}
      >
        <View style={styles.chipRow}>
          {RECORD_TYPES.map(item => (
            <TouchableOpacity
              key={item}
              style={[styles.typeChip, type === item && styles.typeChipActive]}
              onPress={() => setType(item)}
            >
              <Text style={[styles.typeChipText, type === item && styles.typeChipTextActive]}>
                {TYPE_CHIP[item]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.fieldHelp}>{RECORD_LABEL[type]}</Text>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Fecha</Text>
          <TextInput
            style={styles.input}
            value={dateText}
            onChangeText={text => setDateText(maskDate(text))}
            placeholder="dd/mm/aaaa"
            placeholderTextColor={COLORS.outline}
            keyboardType="number-pad"
            maxLength={10}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Kilometraje</Text>
          <TextInput
            style={styles.input}
            value={kmText}
            onChangeText={text => setKmText(text.replace(/\D/g, '').slice(0, 6))}
            placeholder="Km en el cuentakilómetros"
            placeholderTextColor={COLORS.outline}
            keyboardType="number-pad"
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
          {saving ? (
            <ActivityIndicator color={COLORS.onPrimary} />
          ) : (
            <Text style={styles.saveBtnText}>Guardar registro</Text>
          )}
        </TouchableOpacity>
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
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  vehicleText: {
    flex: 1,
    color: COLORS.onSurfaceVariant,
    fontSize: 13,
  },
  block: {
    gap: SPACING.sm,
  },
  sectionTitle: {
    ...TYPE.headlineSm,
    color: COLORS.onSurface,
  },
  // Plan cards
  planCard: {
    gap: 8,
  },
  planTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  planIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planLabel: {
    color: COLORS.onSurface,
    fontSize: 15,
    fontWeight: '700',
  },
  planBasis: {
    color: COLORS.outline,
    fontSize: 10,
    marginTop: 1,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  planReason: {
    color: COLORS.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 17,
  },
  planActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  linkText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  requestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
  },
  requestBtnText: {
    color: COLORS.onPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  hint: {
    color: COLORS.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 17,
  },
  // History
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(107, 216, 203, 0.4)',
    backgroundColor: 'rgba(107, 216, 203, 0.08)',
  },
  addBtnText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  event: {
    flexDirection: 'row',
    gap: 12,
  },
  rail: {
    width: 28,
    alignItems: 'center',
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotMuted: {
    backgroundColor: COLORS.surfaceContainerHigh,
  },
  line: {
    flex: 1,
    width: 2,
    marginVertical: 2,
    backgroundColor: COLORS.outlineVariant,
  },
  eventCard: {
    flex: 1,
    gap: 3,
    marginBottom: SPACING.sm,
  },
  eventTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  eventTitle: {
    flex: 1,
    color: COLORS.onSurface,
    fontSize: 14,
    fontWeight: '700',
  },
  eventMeta: {
    color: COLORS.onSurfaceVariant,
    fontSize: 12,
  },
  eventSource: {
    color: COLORS.outline,
    fontSize: 10,
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 6,
  },
  confirmText: {
    flex: 1,
    color: COLORS.onSurfaceVariant,
    fontSize: 12,
  },
  confirmYes: {
    color: COLORS.error,
    fontSize: 12,
    fontWeight: '700',
  },
  // Form
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  typeChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(107, 216, 203, 0.12)',
  },
  typeChipText: {
    color: COLORS.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '600',
  },
  typeChipTextActive: {
    color: COLORS.primary,
  },
  fieldHelp: {
    color: COLORS.onSurfaceVariant,
    fontSize: 12,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    ...TYPE.labelSm,
    color: COLORS.onSurfaceVariant,
    letterSpacing: 0.6,
  },
  input: {
    height: 48,
    borderRadius: RADIUS.DEFAULT,
    backgroundColor: COLORS.surfaceContainerLow,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    paddingHorizontal: 14,
    color: COLORS.onSurface,
    fontSize: 15,
  },
  error: {
    color: COLORS.error,
    fontSize: 12,
  },
  saveBtn: {
    height: 48,
    borderRadius: RADIUS.DEFAULT,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: COLORS.onPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
});
