import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
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
  Wrench,
  Package,
} from 'lucide-react-native';
import { COLORS, TYPE, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { GlassCard } from '../components/GlassCard';
import { ScreenContainer } from '../components/ScreenContainer';
import { AuthHeader } from '../components/AuthHeader';
import { PlateInput } from '../components/PlateInput';
import { useSession } from '../hooks/useSession';
import {
  VehicleData,
  formatPlate,
  getRequiredPart,
  isPlateValid,
  lookupVehicle,
} from '../services/vehicleLookup';

export default function RequestServiceScreen() {
  const router = useRouter();
  const { status: sessionStatus, vehicles } = useSession();
  const myVehicle = sessionStatus === 'authenticated' ? vehicles[0] : undefined;
  const params = useLocalSearchParams<{
    serviceTitle?: string;
    servicePrice?: string;
    plate?: string;
  }>();
  const serviceTitle = params.serviceTitle || 'Servicio seleccionado';
  const servicePrice = params.servicePrice;

  const [plate, setPlate] = useState(params.plate ?? '');
  const [isLooking, setIsLooking] = useState(Boolean(params.plate));
  const [vehicle, setVehicle] = useState<VehicleData | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  const requiredPart = vehicle ? getRequiredPart(vehicle, serviceTitle) : null;

  const runLookup = async (value: string) => {
    if (!isPlateValid(value)) {
      setErrorMsg('Introduce una matrícula válida para consultar el vehículo.');
      return;
    }
    setErrorMsg('');
    setVehicle(null);
    setIsLooking(true);
    try {
      setVehicle(await lookupVehicle(value));
    } catch {
      setErrorMsg('No se pudo consultar el vehículo. Inténtalo de nuevo.');
    } finally {
      setIsLooking(false);
    }
  };

  const handleLookup = () => runLookup(plate);

  // Coming from the post-registration screen the plate is already known.
  useEffect(() => {
    const knownPlate = params.plate;
    if (!knownPlate) return;
    let cancelled = false;
    lookupVehicle(knownPlate)
      .then(found => !cancelled && setVehicle(found))
      .catch(() => !cancelled && setErrorMsg('No se pudo consultar el vehículo. Inténtalo de nuevo.'))
      .finally(() => !cancelled && setIsLooking(false));
    return () => {
      cancelled = true;
    };
  }, [params.plate]);

  const handleConfirm = () => {
    setIsConfirming(true);
    setTimeout(() => {
      setIsConfirming(false);
      const partLine = requiredPart
        ? `\n\nPieza preparada: ${requiredPart.items[0].v}`
        : '';
      Alert.alert(
        '¡Servicio solicitado!',
        `${serviceTitle} agendado para ${vehicle?.brand} ${vehicle?.model} (${plate.toUpperCase()}).${partLine}\n\nUn asesor te contactará para confirmar la cita.`,
        [{ text: 'Entendido', onPress: () => router.replace(myVehicle ? '/home' : '/catalog') }]
      );
    }, 1000);
  };

  return (
    <>
      <AuthHeader label="Request Service" />
      <ScreenContainer>
        <View style={styles.headerBox}>
          <View style={styles.badgeRow}>
            <Wrench size={16} color={COLORS.primary} />
            <Text style={styles.badgeText}>SOLICITUD DE SERVICIO</Text>
          </View>
          <Text style={styles.title}>Identifica tu vehículo</Text>
          <Text style={styles.subtitle}>
            Introduce la matrícula para consultar los datos del coche y completar el registro
            antes de efectuar el servicio.
          </Text>
        </View>

        {/* Selected service summary */}
        <GlassCard variant="primaryGlow" style={styles.serviceCard}>
          <Text style={styles.serviceLabel}>SERVICIO SELECCIONADO</Text>
          <View style={styles.serviceRow}>
            <Text style={styles.serviceTitle}>{serviceTitle}</Text>
            {servicePrice ? <Text style={styles.servicePrice}>{servicePrice}€</Text> : null}
          </View>
        </GlassCard>

        {/* Plate lookup */}
        <GlassCard style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Car size={18} color={COLORS.primary} />
            <Text style={styles.cardHeaderTitle}>Matrícula del Vehículo</Text>
          </View>

          <PlateInput value={plate} onChangeText={setPlate} onSubmitEditing={handleLookup} />

          {myVehicle && !vehicle && !isLooking ? (
            <TouchableOpacity
              style={styles.myVehicleBtn}
              onPress={() => {
                setPlate(myVehicle.plate);
                runLookup(myVehicle.plate);
              }}
            >
              <Car size={16} color={COLORS.primary} />
              <Text style={styles.myVehicleText}>
                Usar mi {myVehicle.brand} {myVehicle.model} ({formatPlate(myVehicle.plate)})
              </Text>
            </TouchableOpacity>
          ) : null}

          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

          <TouchableOpacity style={styles.lookupBtn} onPress={handleLookup} disabled={isLooking}>
            {isLooking ? (
              <ActivityIndicator size="small" color={COLORS.onPrimary} />
            ) : (
              <Search size={18} color={COLORS.onPrimary} />
            )}
            <Text style={styles.lookupBtnText}>
              {isLooking ? 'Consultando datos oficiales...' : 'Consultar Datos del Vehículo'}
            </Text>
          </TouchableOpacity>
        </GlassCard>

        {/* Vehicle data result */}
        {vehicle && (
          <GlassCard variant="alertGlow" style={styles.card}>
            <View style={styles.resultHeaderRow}>
              <CheckCircle2 size={18} color={COLORS.success} />
              <Text style={styles.resultHeaderText}>Vehículo Encontrado y Registrado</Text>
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
                <Text style={styles.dataValue}>{vehicle.mileage.toLocaleString()} km</Text>
              </View>
            </View>

            <View style={styles.ownerRow}>
              <User size={14} color={COLORS.primary} />
              <Text style={styles.ownerText}>Propietario registrado: {vehicle.owner}</Text>
            </View>
          </GlassCard>
        )}

        {/* Required part/accessory for this specific service — the key info
            both the client and the mechanic need before the job starts. */}
        {vehicle && requiredPart && (
          <GlassCard variant="primaryGlow" style={styles.card}>
            <View style={styles.resultHeaderRow}>
              <Package size={18} color={COLORS.primary} />
              <Text style={styles.partHeaderText}>Pieza / Accesorio Requerido</Text>
            </View>
            <Text style={styles.partSubtitle}>
              Para: {requiredPart.label} · {vehicle.brand} {vehicle.model}
            </Text>
            <View style={styles.partList}>
              {requiredPart.items.map(item => (
                <View key={item.k} style={styles.partRow}>
                  <Text style={styles.partKey}>{item.k}</Text>
                  <Text style={styles.partValue}>{item.v}</Text>
                </View>
              ))}
            </View>
            <View style={styles.mechanicNote}>
              <Wrench size={13} color={COLORS.onSurfaceVariant} />
              <Text style={styles.mechanicNoteText}>
                El mecánico asignado recibirá esta referencia exacta para traer la pieza correcta.
              </Text>
            </View>
          </GlassCard>
        )}

        {/* Confirm CTA */}
        {vehicle && (
          <TouchableOpacity
            style={[styles.confirmBtn, SHADOWS.glass]}
            onPress={handleConfirm}
            disabled={isConfirming}
            activeOpacity={0.85}
          >
            {isConfirming ? (
              <ActivityIndicator color={COLORS.onPrimary} />
            ) : (
              <>
                <CheckCircle2 size={20} color={COLORS.onPrimary} />
                <Text style={styles.confirmBtnText}>Confirmar y Solicitar Servicio</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  headerBox: {
    marginBottom: SPACING.md,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  badgeText: {
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
    marginTop: 4,
  },
  serviceCard: {
    marginBottom: SPACING.md,
    gap: 6,
  },
  serviceLabel: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceTitle: {
    color: COLORS.onSurface,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  servicePrice: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '800',
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
  myVehicleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 42,
    borderRadius: RADIUS.DEFAULT,
    borderWidth: 1,
    borderColor: 'rgba(107, 216, 203, 0.4)',
    backgroundColor: 'rgba(107, 216, 203, 0.08)',
  },
  myVehicleText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
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
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(61, 73, 71, 0.4)',
  },
  ownerText: {
    color: COLORS.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '600',
  },
  partHeaderText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  partSubtitle: {
    color: COLORS.onSurfaceVariant,
    fontSize: 11,
  },
  partList: {
    gap: 8,
  },
  partRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLowest,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: RADIUS.DEFAULT,
  },
  partKey: {
    color: COLORS.onSurfaceVariant,
    fontSize: 12,
  },
  partValue: {
    color: COLORS.onSurface,
    fontSize: 13,
    fontWeight: '700',
  },
  mechanicNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(61, 73, 71, 0.4)',
  },
  mechanicNoteText: {
    flex: 1,
    color: COLORS.onSurfaceVariant,
    fontSize: 11,
    lineHeight: 15,
  },
  confirmBtn: {
    height: 56,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmBtnText: {
    color: COLORS.onPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
});
