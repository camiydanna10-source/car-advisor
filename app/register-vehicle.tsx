import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Car,
  Search,
  CheckCircle2,
  Gauge,
  Palette,
  Fuel,
  Calendar,
  User,
  ClipboardCheck,
  Save,
  ArrowRight,
  Sparkles,
} from 'lucide-react-native';
import { COLORS, TYPE, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { GlassCard } from '../components/GlassCard';
import { ScreenContainer } from '../components/ScreenContainer';
import { AuthHeader } from '../components/AuthHeader';
import { PlateInput } from '../components/PlateInput';
import { StatusChip } from '../components/StatusChip';
import {
  VehicleData,
  getItvInfo,
  isPlateValid,
  lookupVehicle,
  suggestServices,
} from '../services/vehicleLookup';
import { createCar } from '../services/carService';

const PRIORITY_CHIP = {
  high: { label: 'RECOMENDADO', type: 'warning' },
  medium: { label: 'CONVIENE REVISAR', type: 'info' },
  low: { label: 'OPCIONAL', type: 'info' },
} as const;

// Shown right after sign-up. Confirms the account was created (the former standalone
// "registro exitoso" screen), then the plate completes the client's vehicle record
// (saved through POST /api/cars) and drives the suggested services, incl. Pre-ITV.
export default function RegisterVehicleScreen() {
  const router = useRouter();
  const { name } = useLocalSearchParams<{ name?: string }>();

  const [plate, setPlate] = useState('');
  const [isLooking, setIsLooking] = useState(false);
  const [vehicle, setVehicle] = useState<VehicleData | null>(null);
  const [lookupError, setLookupError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  const firstName = name?.split(' ')[0];

  const handleLookup = async () => {
    if (!isPlateValid(plate)) {
      setLookupError('Introduce una matrícula válida para consultar el vehículo.');
      return;
    }
    setLookupError('');
    setSaveError('');
    setSaved(false);
    setVehicle(null);
    setIsLooking(true);
    try {
      setVehicle(await lookupVehicle(plate));
    } catch {
      setLookupError('No se pudo consultar el vehículo. Inténtalo de nuevo.');
    } finally {
      setIsLooking(false);
    }
  };

  const handleSave = async () => {
    if (!vehicle) return;
    setSaveError('');
    setIsSaving(true);
    try {
      await createCar(vehicle);
      setSaved(true);
    } catch (err: any) {
      setSaveError(err.message || 'No se pudo guardar el vehículo.');
    } finally {
      setIsSaving(false);
    }
  };

  const suggestions = vehicle ? suggestServices(vehicle) : [];
  const itv = vehicle ? getItvInfo(vehicle) : null;

  return (
    <>
      <AuthHeader label="Vehicle Setup" showBack={false} />
      <ScreenContainer keyboardShouldPersistTaps="handled">
        <GlassCard variant="primaryGlow" style={styles.successCard}>
          <CheckCircle2 size={40} color={COLORS.primary} />
          <View style={styles.successTextBox}>
            <Text style={styles.successTitle}>¡Registro exitoso!</Text>
            <Text style={styles.successSubtitle}>
              Tu cuenta ha sido creada correctamente en CarAdvisor.
            </Text>
          </View>
        </GlassCard>

        <View style={styles.headerBox}>
          <View style={styles.stepPill}>
            <View style={styles.stepDot} />
            <Text style={styles.stepPillText}>PASO 2 DE 2 · TU VEHÍCULO</Text>
          </View>
          <View style={styles.progressRow}>
            <View style={[styles.progressSegment, styles.progressDone]} />
            <View style={[styles.progressSegment, saved && styles.progressDone]} />
          </View>
          <Text style={styles.title}>
            {firstName ? `${firstName}, ¿qué coche conduces?` : '¿Qué coche conduces?'}
          </Text>
          <Text style={styles.subtitle}>
            Introduce tu matrícula y completaremos los datos del vehículo en tu ficha de cliente.
          </Text>
        </View>

        <GlassCard variant="primaryGlow" style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Car size={18} color={COLORS.primary} />
            <Text style={styles.cardHeaderTitle}>Matrícula del Vehículo</Text>
          </View>

          <PlateInput value={plate} onChangeText={setPlate} onSubmitEditing={handleLookup} />

          {lookupError ? <Text style={styles.errorText}>{lookupError}</Text> : null}

          <TouchableOpacity style={styles.lookupBtn} onPress={handleLookup} disabled={isLooking}>
            {isLooking ? (
              <ActivityIndicator size="small" color={COLORS.onPrimary} />
            ) : (
              <Search size={18} color={COLORS.onPrimary} />
            )}
            <Text style={styles.lookupBtnText}>
              {isLooking ? 'Consultando datos del vehículo...' : 'Consultar Datos del Vehículo'}
            </Text>
          </TouchableOpacity>
        </GlassCard>

        {vehicle && (
          <GlassCard style={styles.card}>
            <View style={styles.resultHeaderRow}>
              <CheckCircle2 size={18} color={COLORS.success} />
              <Text style={styles.resultHeaderText}>Vehículo encontrado</Text>
            </View>

            <Text style={styles.resultCarName}>{vehicle.brand} {vehicle.model}</Text>

            <View style={styles.dataGrid}>
              <View style={styles.dataItem}>
                <Calendar size={14} color={COLORS.onSurfaceVariant} />
                <Text style={styles.dataLabel}>Año</Text>
                <Text style={styles.dataValue}>{vehicle.year}</Text>
              </View>
              <View style={styles.dataItem}>
                <Fuel size={14} color={COLORS.onSurfaceVariant} />
                <Text style={styles.dataLabel}>Motor</Text>
                <Text style={styles.dataValue}>{vehicle.motor}</Text>
              </View>
              <View style={styles.dataItem}>
                <Palette size={14} color={COLORS.onSurfaceVariant} />
                <Text style={styles.dataLabel}>Color</Text>
                <Text style={styles.dataValue}>{vehicle.color}</Text>
              </View>
              <View style={styles.dataItem}>
                <Gauge size={14} color={COLORS.onSurfaceVariant} />
                <Text style={styles.dataLabel}>Kilometraje</Text>
                <Text style={styles.dataValue}>{vehicle.mileage.toLocaleString('es-ES')} km</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <User size={14} color={COLORS.primary} />
              <Text style={styles.infoText}>Titular: {vehicle.owner}</Text>
            </View>
            {itv && (
              <View style={styles.infoRow}>
                <ClipboardCheck size={14} color={COLORS.primary} />
                <Text style={styles.infoText}>{itv.summary}</Text>
              </View>
            )}

            {saved ? (
              <View style={styles.savedBox}>
                <CheckCircle2 size={16} color={COLORS.success} />
                <Text style={styles.savedText}>Vehículo guardado en tu ficha de cliente</Text>
              </View>
            ) : (
              <>
                {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}
                <TouchableOpacity
                  style={[styles.saveBtn, SHADOWS.glass]}
                  onPress={handleSave}
                  disabled={isSaving}
                  activeOpacity={0.85}
                >
                  {isSaving ? (
                    <ActivityIndicator color={COLORS.onPrimary} />
                  ) : (
                    <>
                      <Save size={18} color={COLORS.onPrimary} />
                      <Text style={styles.saveBtnText}>
                        {saveError ? 'Reintentar guardado' : 'Guardar vehículo en mi cuenta'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </GlassCard>
        )}

        {vehicle && (
          <View style={styles.suggestionsBox}>
            <View style={styles.suggestionsHeader}>
              <Sparkles size={16} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Servicios recomendados para tu {vehicle.brand}</Text>
            </View>

            {suggestions.map(({ service, reason, priority }) => (
              <GlassCard key={service.id} style={styles.suggestionCard}>
                <View style={styles.suggestionTop}>
                  <StatusChip
                    label={PRIORITY_CHIP[priority].label}
                    type={PRIORITY_CHIP[priority].type}
                  />
                  <Text style={styles.servicePrice}>{service.price}€</Text>
                </View>
                <Text style={styles.serviceTitle}>{service.title}</Text>
                <Text style={styles.serviceReason}>{reason}</Text>
                <View style={styles.suggestionFooter}>
                  <Text style={styles.timeTag}>⏱️ {service.estimatedTime}</Text>
                  <TouchableOpacity
                    style={styles.requestBtn}
                    onPress={() =>
                      router.push({
                        pathname: '/request-service',
                        params: {
                          serviceTitle: service.title,
                          servicePrice: String(service.price),
                          plate: vehicle.plate,
                        },
                      })
                    }
                  >
                    <Text style={styles.requestBtnText}>Solicitar</Text>
                    <ArrowRight size={14} color={COLORS.onPrimary} />
                  </TouchableOpacity>
                </View>
              </GlassCard>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.footerLink} onPress={() => router.replace('/')}>
          <Text style={styles.footerLinkText}>
            {saved ? 'Continuar al inicio de sesión' : 'Omitir por ahora'}
          </Text>
        </TouchableOpacity>
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  successCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  successTextBox: {
    flex: 1,
    gap: 2,
  },
  successTitle: {
    ...TYPE.headlineSm,
    color: COLORS.onSurface,
  },
  successSubtitle: {
    ...TYPE.bodySm,
    color: COLORS.onSurfaceVariant,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceContainerHighest,
  },
  progressDone: {
    backgroundColor: COLORS.primary,
  },
  headerBox: {
    marginBottom: SPACING.md,
    gap: 6,
  },
  stepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surfaceContainerHigh,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  stepPillText: {
    ...TYPE.labelSm,
    color: COLORS.primary,
    letterSpacing: 1,
  },
  title: {
    ...TYPE.headlineLg,
    color: COLORS.onSurface,
  },
  subtitle: {
    ...TYPE.bodyMd,
    color: COLORS.onSurfaceVariant,
  },
  card: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardHeaderTitle: {
    ...TYPE.labelMd,
    color: COLORS.onSurface,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    fontWeight: '600',
  },
  lookupBtn: {
    height: 48,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.DEFAULT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  lookupBtnText: {
    color: COLORS.onPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  resultHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultHeaderText: {
    color: COLORS.success,
    fontSize: 12,
    fontWeight: '700',
  },
  resultCarName: {
    ...TYPE.headlineMd,
    color: COLORS.onSurface,
  },
  dataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  dataItem: {
    flexBasis: '45%',
    flexGrow: 1,
    gap: 2,
  },
  dataLabel: {
    color: COLORS.onSurfaceVariant,
    fontSize: 10,
    marginTop: 2,
  },
  dataValue: {
    color: COLORS.onSurface,
    fontSize: 14,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    flex: 1,
    color: COLORS.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '600',
  },
  savedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderRadius: RADIUS.DEFAULT,
    padding: SPACING.sm,
  },
  savedText: {
    flex: 1,
    color: COLORS.success,
    fontSize: 12,
    fontWeight: '700',
  },
  saveBtn: {
    height: 48,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.DEFAULT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveBtnText: {
    color: COLORS.onPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  suggestionsBox: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    ...TYPE.headlineSm,
    color: COLORS.onSurface,
    flex: 1,
  },
  suggestionCard: {
    gap: 8,
  },
  suggestionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  servicePrice: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  serviceTitle: {
    color: COLORS.onSurface,
    fontSize: 15,
    fontWeight: '700',
  },
  serviceReason: {
    color: COLORS.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 17,
  },
  suggestionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
  },
  timeTag: {
    color: COLORS.onSurfaceVariant,
    fontSize: 12,
  },
  requestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  requestBtnText: {
    color: COLORS.onPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  footerLink: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  footerLinkText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
});
