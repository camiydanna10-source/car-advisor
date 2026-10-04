import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ShoppingBag, Wrench, Disc, Sparkles, ArrowRight, AlertOctagon } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { COLORS, TYPE, SPACING } from '../constants/theme';
import { GlassCard } from '../components/GlassCard';
import { ScreenContainer } from '../components/ScreenContainer';
import { AuthHeader } from '../components/AuthHeader';
import { AppHeader } from '../components/AppHeader';
import { BottomNav } from '../components/BottomNav';
import { useSession } from '../hooks/useSession';
import { SERVICES, ServiceCategory } from '../services/serviceCatalog';

// Guest-accessible service catalog + cost estimator — exploration without an
// account, per the "Visualizador/Invitado" flow from the product docs.
export default function ServiceCatalogScreen() {
  const router = useRouter();
  const { status, user, vehicles } = useSession();
  const isClient = status === 'authenticated';
  const [activeCategory, setActiveCategory] = useState<'TODOS' | ServiceCategory>('TODOS');

  const filteredServices = activeCategory === 'TODOS'
    ? SERVICES
    : SERVICES.filter(s => s.category === activeCategory);

  return (
    <>
      {isClient ? <AppHeader userName={user?.name} /> : <AuthHeader label="Guest Catalog" />}
      <ScreenContainer>
        <View style={styles.headerBox}>
          <View style={styles.badgeRow}>
            <ShoppingBag size={16} color={COLORS.primary} />
            <Text style={styles.badgeText}>{isClient ? 'CATÁLOGO DE SERVICIOS' : 'CATÁLOGO DE SERVICIOS · SIN REGISTRO'}</Text>
          </View>
          <Text style={styles.title}>Servicios & Cotizador</Text>
          <Text style={styles.subtitle}>
            Selecciona el mantenimiento requerido y solicita la atención con costo transparente.
          </Text>
        </View>

        {/* Category Pills */}
        <View style={styles.categoryRow}>
          <TouchableOpacity
            style={[styles.catBtn, activeCategory === 'TODOS' && styles.catBtnActive]}
            onPress={() => setActiveCategory('TODOS')}
          >
            <Text style={[styles.catText, activeCategory === 'TODOS' && styles.catTextActive]}>Todos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.catBtn, activeCategory === 'MECANICA' && styles.catBtnActive]}
            onPress={() => setActiveCategory('MECANICA')}
          >
            <Wrench size={14} color={activeCategory === 'MECANICA' ? COLORS.onPrimary : COLORS.onSurfaceVariant} />
            <Text style={[styles.catText, activeCategory === 'MECANICA' && styles.catTextActive]}>Mecánica</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.catBtn, activeCategory === 'NEUMATICOS' && styles.catBtnActive]}
            onPress={() => setActiveCategory('NEUMATICOS')}
          >
            <Disc size={14} color={activeCategory === 'NEUMATICOS' ? COLORS.onPrimary : COLORS.onSurfaceVariant} />
            <Text style={[styles.catText, activeCategory === 'NEUMATICOS' && styles.catTextActive]}>Neumáticos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.catBtn, activeCategory === 'ESTETICA' && styles.catBtnActive]}
            onPress={() => setActiveCategory('ESTETICA')}
          >
            <Sparkles size={14} color={activeCategory === 'ESTETICA' ? COLORS.onPrimary : COLORS.onSurfaceVariant} />
            <Text style={[styles.catText, activeCategory === 'ESTETICA' && styles.catTextActive]}>Estética</Text>
          </TouchableOpacity>
        </View>

        {/* Service Items Grid */}
        <View style={styles.serviceList}>
          {filteredServices.map(item => (
            <GlassCard key={item.id} style={styles.serviceCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.serviceTitle}>{item.title}</Text>
                <Text style={styles.servicePrice}>{item.price}€</Text>
              </View>
              <Text style={styles.serviceDesc}>{item.description}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.timeTag}>⏱️ {item.estimatedTime}</Text>
                <TouchableOpacity
                  style={styles.selectBtn}
                  onPress={() =>
                    router.push({
                      pathname: '/request-service',
                      params: {
                        serviceTitle: item.title,
                        servicePrice: String(item.price),
                        ...(isClient && vehicles[0] ? { plate: vehicles[0].plate } : {}),
                      },
                    })
                  }
                >
                  <Text style={styles.selectBtnText}>Solicitar Servicio</Text>
                  <ArrowRight size={14} color={COLORS.onPrimary} />
                </TouchableOpacity>
              </View>
            </GlassCard>
          ))}
        </View>

        {/* Guest footer: jump to SOS (clients have it in the bottom bar) */}
        {!isClient && (
          <TouchableOpacity style={styles.sosLink} onPress={() => router.push('/sos')}>
            <AlertOctagon size={16} color={COLORS.tertiary} />
            <Text style={styles.sosLinkText}>¿Es una emergencia? Pedir auxilio vial</Text>
          </TouchableOpacity>
        )}
      </ScreenContainer>
      {isClient && <BottomNav />}
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
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  catBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceContainerLow,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  catBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  catText: {
    color: COLORS.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '600',
  },
  catTextActive: {
    color: COLORS.onPrimary,
  },
  serviceList: {
    gap: 16,
  },
  serviceCard: {
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceTitle: {
    color: COLORS.onSurface,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  servicePrice: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  serviceDesc: {
    color: COLORS.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
  },
  timeTag: {
    color: COLORS.onSurfaceVariant,
    fontSize: 12,
  },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  selectBtnText: {
    color: COLORS.onPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  sosLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
    paddingVertical: 8,
  },
  sosLinkText: {
    color: COLORS.tertiary,
    fontSize: 12,
    fontWeight: '600',
  },
});
