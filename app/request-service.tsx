import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
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

// Per-vehicle technical specs — the exact part/accessory references a
// mechanic needs to have ready, keyed by maintenance area so each catalog
// service can surface the one relevant to it.
interface VehiclePartSpecs {
  aceite: { tipo: string; filtro: string; capacidad: string };
  frenos: { pastillasDelanteras: string; pastillasTraseras: string; discos: string };
  neumaticos: { medida: string; presion: string };
  bateria: { tipo: string };
  distribucion: { tipo: string; proximoCambioKm: number };
}

interface VehicleData {
  brand: string;
  model: string;
  year: number;
  motor: string;
  color: string;
  mileage: number;
  owner: string;
  specs: VehiclePartSpecs;
}

// Mock DGT-style vehicle registry — simulates a real plate lookup, including
// the technical specs (filter/pad/tire references) a mechanic would need.
// Any plate not found here still resolves to a plausible generic result, so
// the flow always works end-to-end without a real government/parts API.
const MOCK_VEHICLE_DB: Record<string, VehicleData> = {
  '9876KMT': {
    brand: 'Mazda', model: 'CX-5 Touring', year: 2023, motor: 'Híbrido (ECO)',
    color: 'Gris Titanio', mileage: 48250, owner: 'Carlos Sainz',
    specs: {
      aceite: { tipo: '0W-20 Sintético', filtro: 'OEM Mazda PE01-14-302', capacidad: '4.5 L' },
      frenos: { pastillasDelanteras: 'Akebono ACT-1234', pastillasTraseras: 'Akebono ACT-5678', discos: 'Ventilados 320mm' },
      neumaticos: { medida: '225/65 R17', presion: '32 PSI' },
      bateria: { tipo: '12V 70Ah AGM Start-Stop' },
      distribucion: { tipo: 'Cadena (sin mantenimiento programado)', proximoCambioKm: 0 },
    },
  },
  '1234ABC': {
    brand: 'Seat', model: 'León FR', year: 2022, motor: 'Gasolina',
    color: 'Rojo Cristal', mileage: 32100, owner: 'María García',
    specs: {
      aceite: { tipo: '5W-40 Sintético', filtro: 'Bosch 0451103316', capacidad: '4.3 L' },
      frenos: { pastillasDelanteras: 'Brembo P85020', pastillasTraseras: 'Brembo P85021', discos: 'Ventilados 312mm' },
      neumaticos: { medida: '225/40 R18', presion: '34 PSI' },
      bateria: { tipo: '12V 60Ah' },
      distribucion: { tipo: 'Correa dentada', proximoCambioKm: 90000 },
    },
  },
  '4521LPN': {
    brand: 'Volkswagen', model: 'Golf GTD', year: 2021, motor: 'Diésel',
    color: 'Negro Perlado', mileage: 61500, owner: 'Andrés Morales',
    specs: {
      aceite: { tipo: '5W-30 Longlife', filtro: 'Mann HU7008z', capacidad: '4.6 L' },
      frenos: { pastillasDelanteras: 'TRW GDB1330', pastillasTraseras: 'TRW GDB1331', discos: '288mm' },
      neumaticos: { medida: '225/45 R17', presion: '36 PSI' },
      bateria: { tipo: '12V 90Ah AGM' },
      distribucion: { tipo: 'Correa + bomba de agua', proximoCambioKm: 150000 },
    },
  },
};

const GENERIC_FALLBACK: VehicleData = {
  brand: 'Toyota', model: 'Corolla', year: 2022, motor: 'Gasolina',
  color: 'Blanco Nieve', mileage: 39800, owner: 'Piloto CarAdvisor',
  specs: {
    aceite: { tipo: '0W-16 Sintético Toyota Genuine', filtro: 'Toyota 04152-37010', capacidad: '4.0 L' },
    frenos: { pastillasDelanteras: 'Akebono ACT-0099', pastillasTraseras: 'Akebono ACT-0100', discos: '282mm' },
    neumaticos: { medida: '205/55 R16', presion: '32 PSI' },
    bateria: { tipo: '12V 50Ah' },
    distribucion: { tipo: 'Cadena (sin mantenimiento programado)', proximoCambioKm: 0 },
  },
};

const normalizePlate = (plate: string) => plate.replace(/\s|-/g, '').toUpperCase();

// Decides which part/accessory block is relevant to the selected catalog
// service, so both the client and the mechanic see exactly what's needed —
// not just generic car data.
function getRequiredPart(vehicle: VehicleData, serviceTitle: string) {
  const s = serviceTitle.toLowerCase();
  if (s.includes('aceite')) {
    return {
      label: 'Cambio de Aceite & Filtro',
      items: [
        { k: 'Aceite recomendado', v: vehicle.specs.aceite.tipo },
        { k: 'Filtro de aceite', v: vehicle.specs.aceite.filtro },
        { k: 'Capacidad', v: vehicle.specs.aceite.capacidad },
      ],
    };
  }
  if (s.includes('freno') || s.includes('pastilla')) {
    return {
      label: 'Frenos',
      items: [
        { k: 'Pastillas delanteras', v: vehicle.specs.frenos.pastillasDelanteras },
        { k: 'Pastillas traseras', v: vehicle.specs.frenos.pastillasTraseras },
        { k: 'Discos', v: vehicle.specs.frenos.discos },
      ],
    };
  }
  if (s.includes('neumático') || s.includes('pinchazo') || s.includes('balanceo')) {
    return {
      label: 'Neumáticos',
      items: [
        { k: 'Medida', v: vehicle.specs.neumaticos.medida },
        { k: 'Presión recomendada', v: vehicle.specs.neumaticos.presion },
      ],
    };
  }
  if (s.includes('batería')) {
    return {
      label: 'Batería',
      items: [{ k: 'Tipo requerido', v: vehicle.specs.bateria.tipo }],
    };
  }
  if (s.includes('obd') || s.includes('diagnóstico')) {
    return {
      label: 'Diagnóstico Computarizado',
      items: [
        { k: 'Motor', v: vehicle.motor },
        { k: 'Distribución', v: vehicle.specs.distribucion.tipo },
      ],
    };
  }
  return null;
}

export default function RequestServiceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ serviceTitle?: string; servicePrice?: string }>();
  const serviceTitle = params.serviceTitle || 'Servicio seleccionado';
  const servicePrice = params.servicePrice;

  const [plate, setPlate] = useState('');
  const [isLooking, setIsLooking] = useState(false);
  const [vehicle, setVehicle] = useState<VehicleData | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  const requiredPart = vehicle ? getRequiredPart(vehicle, serviceTitle) : null;

  const handleLookup = () => {
    const clean = normalizePlate(plate);
    if (clean.length < 6) {
      setErrorMsg('Introduce una matrícula válida para consultar el vehículo.');
      return;
    }
    setErrorMsg('');
    setVehicle(null);
    setIsLooking(true);

    // Simulated DGT lookup — in production this would call a real registry API.
    setTimeout(() => {
      setVehicle(MOCK_VEHICLE_DB[clean] || GENERIC_FALLBACK);
      setIsLooking(false);
    }, 1200);
  };

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
        [{ text: 'Entendido', onPress: () => router.push('/catalog') }]
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

          <View style={styles.plateWidget}>
            <View style={styles.plateEuBand}>
              <Text style={styles.plateEuStars}>★★</Text>
              <Text style={styles.plateEuLetter}>E</Text>
            </View>
            <TextInput
              style={styles.plateInput}
              value={plate}
              onChangeText={setPlate}
              placeholder="0000 XXX"
              placeholderTextColor="rgba(18,18,18,0.4)"
              autoCapitalize="characters"
              maxLength={8}
            />
          </View>

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
  plateWidget: {
    height: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.DEFAULT,
    borderWidth: 2,
    borderColor: '#D0D4DC',
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
  },
  plateEuBand: {
    width: 32,
    backgroundColor: '#003399',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  plateEuStars: {
    color: '#FFCC00',
    fontSize: 8,
    fontWeight: '700',
  },
  plateEuLetter: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  plateInput: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 22,
    letterSpacing: 3,
    color: '#121212',
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
