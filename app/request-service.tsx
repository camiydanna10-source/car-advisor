import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
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
import { createOrder } from '../services/orders';
import { PHONE_ERROR, formatPhone, normalizePhone } from '../services/phone';
import { setPhone } from '../services/profileStorage';
import { PhoneField } from '../components/PhoneField';
import {
  VehicleData,
  formatPlate,
  getRequiredPart,
  isPlateValid,
  lookupVehicle,
} from '../services/vehicleLookup';

export default function RequestServiceScreen() {
  const router = useRouter();
  const { status: sessionStatus, user, phone: savedPhone, vehicles } = useSession();
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
  // null = the client has not typed yet: show the phone saved in their profile.
  const [phoneInput, setPhoneInput] = useState<string | null>(null);
  const phoneValue = phoneInput ?? (savedPhone ? formatPhone(savedPhone) : '');
  const [guestName, setGuestName] = useState('');
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');

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

  const handleConfirm = async () => {
    if (!vehicle) return;
    const phone = normalizePhone(phoneValue);
    setNameError('');
    setPhoneError('');
    if (!user && !guestName.trim()) {
      setNameError('Indica tu nombre para que el mecánico sepa a quién llamar.');
      return;
    }
    if (!phone) {
      setPhoneError(PHONE_ERROR);
      return;
    }
    setIsConfirming(true);
    let orderId: string | undefined;
    try {
      // Prefer the client's saved vehicle: it carries the latest odometer reading.
      const snapshot = vehicles.find(v => v.plate === vehicle.plate) ?? vehicle;
      const order = await createOrder({
        client: { name: user?.name ?? guestName.trim(), email: user?.email, phone },
        vehicle: snapshot,
        service: { title: serviceTitle, price: servicePrice ? Number(servicePrice) : undefined },
      });
      orderId = order.id;
      if (user && phone !== savedPhone) await setPhone(user.email, phone);
    } catch {
      setErrorMsg('No se pudo enviar la solicitud. Inténtalo de nuevo.');
    } finally {
      setIsConfirming(false);
    }
    // "Despacho en curso": wait for a mechanic to confirm and follow the order from there.
    if (orderId) router.replace({ pathname: '/order-status', params: { id: orderId } });
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

          {errorMsg && !vehicle ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

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

        {/* Contact: the mechanic calls or writes to this number */}
        {vehicle && (
          <GlassCard style={styles.card}>
            <Text style={styles.partHeaderText}>Datos de contacto</Text>
            {!user ? (
              <View style={styles.guestField}>
                <Text style={styles.guestLabel}>Nombre</Text>
                <TextInput
                  style={styles.guestInput}
                  value={guestName}
                  onChangeText={setGuestName}
                  placeholder="Tu nombre"
                  placeholderTextColor={COLORS.outline}
                  autoComplete="name"
                />
                {nameError ? <Text style={styles.guestError}>{nameError}</Text> : null}
              </View>
            ) : null}
            <PhoneField
              value={phoneValue}
              onChangeText={setPhoneInput}
              hint="El mecánico te llamará o te escribirá por WhatsApp a este número para confirmar la cita."
              error={phoneError}
            />
          </GlassCard>
        )}

        {/* Confirm CTA */}
        {vehicle && errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
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
  guestField: {
    gap: 6,
  },
  guestLabel: {
    ...TYPE.labelSm,
    color: COLORS.onSurfaceVariant,
    letterSpacing: 0.6,
  },
  guestInput: {
    height: 48,
    borderRadius: RADIUS.DEFAULT,
    backgroundColor: COLORS.surfaceContainerLow,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    paddingHorizontal: 14,
    color: COLORS.onSurface,
    fontSize: 15,
  },
  guestError: {
    color: COLORS.error,
    fontSize: 12,
  },
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
