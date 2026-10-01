import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { AlertOctagon, Truck, Disc, Zap, Wrench, MapPin, MessageSquare, ShoppingBag } from 'lucide-react-native';
import { COLORS, SHADOWS, TYPE, SPACING } from '../constants/theme';
import { GlassCard } from '../components/GlassCard';
import { StatusChip } from '../components/StatusChip';
import { ScreenContainer } from '../components/ScreenContainer';
import { AuthHeader } from '../components/AuthHeader';

type EmergencyType = 'TOW' | 'TIRE' | 'BATTERY' | 'MECHANICAL';

interface ActiveSOS {
  type: EmergencyType;
  timestamp: string;
}

const EMERGENCY_OPTIONS: { type: EmergencyType; label: string; icon: any; desc: string }[] = [
  { type: 'TOW', label: 'Servicio de Grúa', icon: Truck, desc: 'Remolque a taller o domicilio' },
  { type: 'TIRE', label: 'Neumático Ponchado', icon: Disc, desc: 'Cambio de rueda o vulcanizado' },
  { type: 'BATTERY', label: 'Paso de Corriente', icon: Zap, desc: 'Carga de batería / arrancador' },
  { type: 'MECHANICAL', label: 'Falla Mecánica', icon: Wrench, desc: 'Diagnóstico express en sitio' },
];

// Guest-accessible SOS request — no account/garage required, matches the
// "Visualizador/Invitado" flow from the product docs (checkout exprés sin registro).
export default function RoadsideSOSScreen() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<EmergencyType>('TOW');
  const [activeSOS, setActiveSOS] = useState<ActiveSOS | null>(null);

  const handleLaunchSOS = () => {
    setActiveSOS({
      type: selectedType,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
  };

  const cancelSOS = () => setActiveSOS(null);

  const openWhatsAppSimulation = () => {
    const message = `🚨 *AUXILIO VIAL URGENTE CAR ADVISOR*\n\n` +
      `📍 *Ubicación GPS:* https://maps.google.com/?q=40.416775,-3.703790 (Autopista M-30 Km 18)\n` +
      `🔧 *Asistencia Solicitada:* ${selectedType}\n` +
      `⚠️ Por favor despachar mecánico de guardia.`;
    const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('WhatsApp no disponible', 'La alerta in-app ya ha sido enviada de todas formas.');
    });
  };

  return (
    <>
      <AuthHeader label="Guest SOS" />
      <ScreenContainer>
        <View style={styles.headerBox}>
          <View style={styles.badgeRow}>
            <AlertOctagon size={16} color={COLORS.tertiary} />
            <Text style={styles.badgeText}>AUXILIO EN CARRETERA 24/7 · SIN REGISTRO</Text>
          </View>
          <Text style={styles.title}>Asistencia SOS de Emergencia</Text>
          <Text style={styles.subtitle}>
            Captura GPS automática y despacho prioritario de mecánico más cercano.
          </Text>
        </View>

        {/* GPS Location Bar */}
        <GlassCard style={styles.gpsBar}>
          <MapPin size={20} color={COLORS.primary} />
          <View style={styles.gpsTextGroup}>
            <Text style={styles.gpsLabel}>UBICACIÓN DETECTADA VÍA GPS</Text>
            <Text style={styles.gpsCoords}>Autopista M-30 Km 18 (40.4167, -3.7037)</Text>
          </View>
        </GlassCard>

        {/* Active SOS Tracker */}
        {activeSOS ? (
          <GlassCard variant="alertGlow" style={styles.activeSosCard}>
            <View style={styles.statusHeader}>
              <StatusChip label="DESPACHO EN CURSO" type="warning" />
              <Text style={styles.timerText}>{activeSOS.timestamp}</Text>
            </View>

            <Text style={styles.activeTitle}>Mecánico Asignado en Camino</Text>
            <Text style={styles.activeSub}>
              Unidad Móvil #4 (Taller Central) • Tiempo estimado de llegada: 14 min.
            </Text>

            <View style={styles.sosActionRow}>
              <TouchableOpacity style={styles.whatsappBtn} onPress={openWhatsAppSimulation}>
                <MessageSquare size={18} color="#FFF" />
                <Text style={styles.btnTextWhite}>WhatsApp Central</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelBtn} onPress={cancelSOS}>
                <Text style={styles.cancelBtnText}>Cancelar SOS</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        ) : (
          <>
            {/* Emergency Category Selector Grid */}
            <Text style={styles.sectionTitle}>Selecciona el Tipo de Emergencia</Text>
            <View style={styles.grid}>
              {EMERGENCY_OPTIONS.map(opt => {
                const Icon = opt.icon;
                const isSelected = selectedType === opt.type;
                return (
                  <TouchableOpacity
                    key={opt.type}
                    style={styles.gridItem}
                    onPress={() => setSelectedType(opt.type)}
                  >
                    <GlassCard
                      variant={isSelected ? 'alertGlow' : 'normal'}
                      style={styles.itemInner}
                    >
                      <Icon size={24} color={isSelected ? COLORS.tertiary : COLORS.onSurfaceVariant} />
                      <Text style={[styles.optLabel, isSelected && styles.optLabelSelected]}>
                        {opt.label}
                      </Text>
                      <Text style={styles.optDesc}>{opt.desc}</Text>
                    </GlassCard>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Huge One-Tap Trigger Button */}
            <TouchableOpacity
              style={[styles.bigTriggerBtn, SHADOWS.sos]}
              onPress={handleLaunchSOS}
              activeOpacity={0.85}
            >
              <AlertOctagon size={32} color="#FFF" />
              <Text style={styles.triggerText}>SOLICITAR ASISTENCIA VIAL AHORA</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Guest footer: browse catalog without registering */}
        <TouchableOpacity style={styles.catalogLink} onPress={() => router.push('/catalog')}>
          <ShoppingBag size={16} color={COLORS.primary} />
          <Text style={styles.catalogLinkText}>Ver catálogo de servicios sin registrarme</Text>
        </TouchableOpacity>
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
    color: COLORS.tertiary,
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
  gpsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  gpsTextGroup: {
    flex: 1,
  },
  gpsLabel: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  gpsCoords: {
    color: COLORS.onSurface,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  sectionTitle: {
    ...TYPE.headlineSm,
    color: COLORS.onSurface,
    marginBottom: SPACING.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  gridItem: {
    flexGrow: 1,
    flexBasis: '45%',
    minWidth: 150,
    maxWidth: '100%',
  },
  itemInner: {
    minHeight: 110,
    justifyContent: 'center',
    gap: 6,
  },
  optLabel: {
    color: COLORS.onSurfaceVariant,
    fontSize: 13,
    fontWeight: '700',
  },
  optLabelSelected: {
    color: COLORS.onSurface,
  },
  optDesc: {
    color: COLORS.outline,
    fontSize: 10,
  },
  bigTriggerBtn: {
    height: 60,
    backgroundColor: COLORS.tertiaryContainer,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  triggerText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  activeSosCard: {
    padding: 16,
    gap: 12,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timerText: {
    color: COLORS.onSurfaceVariant,
    fontSize: 12,
  },
  activeTitle: {
    color: COLORS.onSurface,
    fontSize: 18,
    fontWeight: '700',
  },
  activeSub: {
    color: COLORS.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 18,
  },
  sosActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  whatsappBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#25D366',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnTextWhite: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingHorizontal: 16,
    height: 44,
    backgroundColor: COLORS.surfaceContainerHigh,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  cancelBtnText: {
    color: COLORS.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '600',
  },
  catalogLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
    paddingVertical: 8,
  },
  catalogLinkText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
});
