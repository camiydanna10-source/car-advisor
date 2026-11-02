import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Redirect, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Gauge,
  Mail,
  MessageSquare,
  Package,
  Phone,
  Plus,
  X,
} from 'lucide-react-native';
import { COLORS, RADIUS, SPACING, TYPE } from '../constants/theme';
import { GlassCard } from '../components/GlassCard';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppHeader } from '../components/AppHeader';
import { BottomNav } from '../components/BottomNav';
import { useSession } from '../hooks/useSession';
import {
  ServiceOrder,
  acceptOrder,
  completeOrder,
  getOrder,
  saveOrderNotes,
  setCheckIn,
  timeAgo,
  toggleChecklistItem,
} from '../services/orders';
import { formatPhone, telUrl, whatsappUrl } from '../services/phone';
import { colorHex, formatPlate, getRequiredPart } from '../services/vehicleLookup';

// Order detail for the mechanic: what car it is, which part it needs, check-in, checklist,
// diagnosis and closing. Finishing writes the service into the client's timeline.
export default function WorkshopOrderScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { status, role, user } = useSession();

  const [order, setOrder] = useState<ServiceOrder | null | undefined>(undefined);
  const [kmText, setKmText] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [extraText, setExtraText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getOrder(String(id)).then(found => {
        if (cancelled) return;
        setOrder(found ?? null);
        if (found) {
          setKmText(String(found.checkIn?.km ?? found.vehicle.mileage));
          setDiagnosis(found.diagnosis ?? '');
          setRecommendations(found.recommendations ?? '');
        }
      });
      return () => {
        cancelled = true;
      };
    }, [id])
  );

  if (status === 'loading' || order === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }
  if (status === 'guest') return <Redirect href="/" />;
  if (role !== 'mechanic' || !user) return <Redirect href="/home" />;

  const me = { name: user.name ?? 'Mecánico', email: user.email };
  const back = () => router.replace('/workshop');

  if (order === null) {
    return (
      <>
        <AppHeader userName={user.name} modeLabel="Modo Mecánico" />
        <ScreenContainer>
          <Text style={styles.empty}>Esta orden ya no existe.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={back}>
            <Text style={styles.primaryBtnText}>Volver a las órdenes</Text>
          </TouchableOpacity>
        </ScreenContainer>
        <BottomNav />
      </>
    );
  }

  const mine = order.mechanic?.email === me.email;
  const editable = order.status === 'in_progress' && mine;
  const part = getRequiredPart(order.vehicle, order.service.title);
  const doneSteps = order.checklist.filter(item => item.done).length;

  // Runs a storage action and shows its error (e.g. "otro mecánico ya tomó esta orden").
  const act = async (action: () => Promise<ServiceOrder>) => {
    setBusy(true);
    setError('');
    try {
      setOrder(await action());
    } catch (err: any) {
      setError(err.message || 'No se pudo completar la acción.');
    } finally {
      setBusy(false);
    }
  };

  const registerCheckIn = () => {
    const km = Number(kmText.replace(/\D/g, ''));
    if (!kmText.trim() || !Number.isFinite(km) || km > 999999) {
      setError('Indica el kilometraje del cuentakilómetros (solo números).');
      return;
    }
    act(() => setCheckIn(order.id, km));
  };

  const saveNotes = () =>
    editable ? act(() => saveOrderNotes(order.id, { diagnosis, recommendations })) : Promise.resolve();

  const addExtraPart = () => {
    const text = extraText.trim();
    if (!text) return;
    setExtraText('');
    act(() => saveOrderNotes(order.id, { extraParts: [...order.extraParts, text] }));
  };

  const finish = async () => {
    setBusy(true);
    setError('');
    try {
      await saveOrderNotes(order.id, { diagnosis, recommendations });
      await completeOrder(order.id);
      router.replace('/workshop');
    } catch (err: any) {
      setError(err.message || 'No se pudo finalizar la orden.');
      setConfirmFinish(false);
      setBusy(false);
    }
  };

  return (
    <>
      <AppHeader userName={user.name} modeLabel="Modo Mecánico" />
      <ScreenContainer contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backRow} onPress={back} accessibilityLabel="Volver a las órdenes">
          <ArrowLeft size={18} color={COLORS.primary} />
          <Text style={styles.backText}>Órdenes</Text>
        </TouchableOpacity>

        {/* Summary */}
        <GlassCard variant="primaryGlow" style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.code}>{order.code}</Text>
            <Text style={styles.muted}>Solicitada {timeAgo(order.createdAt)}</Text>
          </View>
          <Text style={styles.title}>{order.service.title}</Text>
          {order.service.price ? <Text style={styles.price}>{order.service.price}€</Text> : null}
          {order.mechanic ? (
            <Text style={styles.muted}>
              {mine ? 'Asignada a ti' : `Asignada a ${order.mechanic.name}`}
              {order.completedAt ? ` · terminada ${timeAgo(order.completedAt)}` : ''}
            </Text>
          ) : null}
        </GlassCard>

        {/* Vehicle */}
        <GlassCard style={styles.card}>
          <Text style={styles.sectionLabel}>VEHÍCULO</Text>
          <View style={styles.rowBetween}>
            <Text style={styles.vehicleName}>
              {order.vehicle.brand} {order.vehicle.model}
            </Text>
            <View style={styles.plateChip}>
              <Text style={styles.plateText}>{formatPlate(order.vehicle.plate)}</Text>
            </View>
          </View>
          <View style={styles.colorRow}>
            <View style={[styles.swatch, { backgroundColor: colorHex(order.vehicle.color) }]} />
            <Text style={styles.muted}>
              {order.vehicle.year} · {order.vehicle.motor} · {order.vehicle.color}
            </Text>
          </View>
          <Text style={styles.muted}>
            Kilometraje declarado por el cliente: {order.vehicle.mileage.toLocaleString('es-ES')} km
          </Text>
        </GlassCard>

        {/* Part the car needs: the reason the plate lookup exists */}
        {part ? (
          <GlassCard style={styles.card}>
            <View style={styles.iconTitle}>
              <Package size={16} color={COLORS.primary} />
              <Text style={styles.sectionLabel}>PIEZA / REFERENCIA · {part.label.toUpperCase()}</Text>
            </View>
            {part.items.map(item => (
              <View key={item.k} style={styles.partRow}>
                <Text style={styles.partKey}>{item.k}</Text>
                <Text style={styles.partValue}>{item.v}</Text>
              </View>
            ))}
          </GlassCard>
        ) : null}

        {/* Client */}
        <GlassCard style={styles.card}>
          <Text style={styles.sectionLabel}>CLIENTE</Text>
          <Text style={styles.vehicleName}>{order.client.name}</Text>
          {order.client.phone ? (
            <>
              <Text style={styles.phoneNumber}>{formatPhone(order.client.phone)}</Text>
              <View style={styles.inlineForm}>
                <TouchableOpacity
                  style={[styles.contactBtn, { flex: 1 }]}
                  onPress={() => Linking.openURL(telUrl(order.client.phone!)).catch(() => {})}
                >
                  <Phone size={16} color={COLORS.onPrimary} />
                  <Text style={styles.contactBtnText}>Llamar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.contactBtnAlt, { flex: 1 }]}
                  onPress={() =>
                    Linking.openURL(
                      whatsappUrl(
                        order.client.phone!,
                        `Hola ${order.client.name}, soy ${me.name} de CarAdvisor. Te escribo por tu servicio: ${order.service.title}.`
                      )
                    ).catch(() => {})
                  }
                >
                  <MessageSquare size={16} color={COLORS.primary} />
                  <Text style={styles.contactBtnAltText}>WhatsApp</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <Text style={styles.muted}>Sin teléfono registrado.</Text>
          )}
          {order.client.email ? (
            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => Linking.openURL(`mailto:${order.client.email}`).catch(() => {})}
            >
              <Mail size={14} color={COLORS.primary} />
              <Text style={styles.linkText}>{order.client.email}</Text>
            </TouchableOpacity>
          ) : null}
        </GlassCard>

        {order.status === 'pending' ? (
          <TouchableOpacity
            style={styles.primaryBtn}
            disabled={busy}
            onPress={() => act(() => acceptOrder(order.id, me))}
          >
            {busy ? (
              <ActivityIndicator color={COLORS.onPrimary} />
            ) : (
              <Text style={styles.primaryBtnText}>Aceptar orden</Text>
            )}
          </TouchableOpacity>
        ) : null}

        {order.status === 'cancelled' ? (
          <Text style={styles.error}>El cliente canceló esta solicitud: ya no hay nada que hacer.</Text>
        ) : null}

        {order.status === 'in_progress' || order.status === 'completed' ? (
          <>
            {/* Check-in */}
            <GlassCard style={styles.card}>
              <View style={styles.iconTitle}>
                <Gauge size={16} color={COLORS.primary} />
                <Text style={styles.sectionLabel}>KILOMETRAJE DE ENTRADA</Text>
              </View>
              {editable ? (
                <>
                  <View style={styles.inlineForm}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={kmText}
                      onChangeText={text => setKmText(text.replace(/\D/g, '').slice(0, 6))}
                      keyboardType="number-pad"
                      placeholder="Km del cuentakilómetros"
                      placeholderTextColor={COLORS.outline}
                    />
                    <TouchableOpacity style={styles.smallBtn} onPress={registerCheckIn} disabled={busy}>
                      <Text style={styles.smallBtnText}>{order.checkIn ? 'Actualizar' : 'Registrar'}</Text>
                    </TouchableOpacity>
                  </View>
                  {order.checkIn ? (
                    <Text style={styles.okText}>
                      Entrada registrada: {order.checkIn.km.toLocaleString('es-ES')} km
                    </Text>
                  ) : (
                    <Text style={styles.muted}>Obligatorio para poder finalizar la orden.</Text>
                  )}
                </>
              ) : (
                <Text style={styles.value}>
                  {order.checkIn ? `${order.checkIn.km.toLocaleString('es-ES')} km` : 'Sin registrar'}
                </Text>
              )}
            </GlassCard>

            {/* Checklist */}
            <GlassCard style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.sectionLabel}>CHECKLIST DE SERVICIO</Text>
                <Text style={styles.progress}>
                  {doneSteps}/{order.checklist.length}
                </Text>
              </View>
              {order.checklist.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.stepRow}
                  disabled={!editable || busy}
                  onPress={() => act(() => toggleChecklistItem(order.id, item.id))}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: item.done }}
                >
                  <View style={[styles.box, item.done && styles.boxDone]}>
                    {item.done ? <Check size={14} color={COLORS.onPrimary} /> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.stepLabel, item.done && styles.stepDone]}>{item.label}</Text>
                    {item.detail ? <Text style={styles.stepDetail}>{item.detail}</Text> : null}
                  </View>
                </TouchableOpacity>
              ))}
            </GlassCard>

            {/* Diagnosis and recommendations */}
            <GlassCard style={styles.card}>
              <Text style={styles.sectionLabel}>DIAGNÓSTICO</Text>
              {editable ? (
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={diagnosis}
                  onChangeText={setDiagnosis}
                  onBlur={saveNotes}
                  multiline
                  placeholder="Qué has encontrado y qué has hecho"
                  placeholderTextColor={COLORS.outline}
                />
              ) : (
                <Text style={styles.value}>{order.diagnosis || 'Sin diagnóstico registrado.'}</Text>
              )}
              <Text style={[styles.sectionLabel, { marginTop: 6 }]}>RECOMENDACIONES</Text>
              {editable ? (
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={recommendations}
                  onChangeText={setRecommendations}
                  onBlur={saveNotes}
                  multiline
                  placeholder="Mantenimiento o repuestos a tener en cuenta"
                  placeholderTextColor={COLORS.outline}
                />
              ) : (
                <Text style={styles.value}>{order.recommendations || 'Sin recomendaciones.'}</Text>
              )}
            </GlassCard>

            {/* Extra parts */}
            <GlassCard style={styles.card}>
              <Text style={styles.sectionLabel}>REPUESTOS EXTRA</Text>
              {order.extraParts.length === 0 && !editable ? (
                <Text style={styles.value}>Ninguno.</Text>
              ) : null}
              {order.extraParts.map((text, index) => (
                <View key={`${text}-${index}`} style={styles.extraRow}>
                  <Text style={styles.value}>{text}</Text>
                  {editable ? (
                    <TouchableOpacity
                      onPress={() =>
                        act(() =>
                          saveOrderNotes(order.id, {
                            extraParts: order.extraParts.filter((_, i) => i !== index),
                          })
                        )
                      }
                      accessibilityLabel="Quitar repuesto"
                    >
                      <X size={16} color={COLORS.onSurfaceVariant} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))}
              {editable ? (
                <View style={styles.inlineForm}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={extraText}
                    onChangeText={setExtraText}
                    onSubmitEditing={addExtraPart}
                    placeholder="Ej. Pastillas delanteras Brembo"
                    placeholderTextColor={COLORS.outline}
                  />
                  <TouchableOpacity style={styles.smallBtn} onPress={addExtraPart} accessibilityLabel="Añadir repuesto">
                    <Plus size={16} color={COLORS.onPrimary} />
                  </TouchableOpacity>
                </View>
              ) : null}
            </GlassCard>
          </>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {editable ? (
          confirmFinish ? (
            <GlassCard style={styles.card}>
              <Text style={styles.value}>
                {doneSteps < order.checklist.length
                  ? `Quedan ${order.checklist.length - doneSteps} pasos del checklist sin marcar. `
                  : ''}
                Se cerrará la orden y el servicio quedará en la cronología del cliente
                {order.checkIn ? `, con ${order.checkIn.km.toLocaleString('es-ES')} km` : ''}.
              </Text>
              <View style={styles.inlineForm}>
                <TouchableOpacity style={[styles.secondaryBtn, { flex: 1 }]} onPress={() => setConfirmFinish(false)}>
                  <Text style={styles.secondaryBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.primaryBtn, { flex: 1.4 }]} onPress={finish} disabled={busy}>
                  {busy ? (
                    <ActivityIndicator color={COLORS.onPrimary} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Sí, finalizar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </GlassCard>
          ) : (
            <TouchableOpacity
              style={[styles.primaryBtn, !order.checkIn && styles.btnDisabled]}
              onPress={() => {
                if (!order.checkIn) {
                  setError('Registra el kilometraje de entrada antes de finalizar.');
                  return;
                }
                setError('');
                setConfirmFinish(true);
              }}
            >
              <CheckCircle2 size={18} color={COLORS.onPrimary} />
              <Text style={styles.primaryBtnText}>Finalizar orden y notificar al cliente</Text>
            </TouchableOpacity>
          )
        ) : null}

        {order.status === 'completed' ? (
          <View style={styles.doneRow}>
            <CheckCircle2 size={16} color={COLORS.primary} />
            <Text style={styles.muted}>Orden terminada: ya figura en la cronología del cliente.</Text>
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
  empty: {
    color: COLORS.onSurfaceVariant,
    fontSize: 14,
    marginBottom: SPACING.md,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  backText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  card: {
    gap: 8,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  code: {
    ...TYPE.labelMd,
    color: COLORS.primary,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    ...TYPE.headlineMd,
    color: COLORS.onSurface,
  },
  price: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  muted: {
    color: COLORS.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 17,
  },
  sectionLabel: {
    ...TYPE.labelSm,
    color: COLORS.onSurfaceVariant,
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  vehicleName: {
    flex: 1,
    color: COLORS.onSurface,
    fontSize: 16,
    fontWeight: '700',
  },
  plateChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#D0D4DC',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  plateText: {
    color: '#121212',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 12,
    letterSpacing: 1.5,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  swatch: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  iconTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  partRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
  },
  partKey: {
    color: COLORS.onSurfaceVariant,
    fontSize: 12,
  },
  partValue: {
    flex: 1,
    textAlign: 'right',
    color: COLORS.onSurface,
    fontSize: 13,
    fontWeight: '700',
  },
  phoneNumber: {
    color: COLORS.onSurface,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  contactBtn: {
    height: 44,
    borderRadius: RADIUS.DEFAULT,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  contactBtnText: {
    color: COLORS.onPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  contactBtnAlt: {
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
  contactBtnAltText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  linkText: {
    color: COLORS.primary,
    fontSize: 13,
  },
  value: {
    color: COLORS.onSurface,
    fontSize: 13,
    lineHeight: 18,
    flexShrink: 1,
  },
  inlineForm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    minHeight: 44,
    borderRadius: RADIUS.DEFAULT,
    backgroundColor: COLORS.surfaceContainerLow,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    paddingHorizontal: 12,
    color: COLORS.onSurface,
    fontSize: 14,
  },
  textArea: {
    minHeight: 76,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  smallBtn: {
    height: 44,
    minWidth: 44,
    paddingHorizontal: 14,
    borderRadius: RADIUS.DEFAULT,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallBtnText: {
    color: COLORS.onPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  okText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  progress: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.outline,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  boxDone: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  stepLabel: {
    color: COLORS.onSurface,
    fontSize: 13,
    fontWeight: '600',
  },
  stepDone: {
    color: COLORS.onSurfaceVariant,
    textDecorationLine: 'line-through',
  },
  stepDetail: {
    color: COLORS.onSurfaceVariant,
    fontSize: 11,
    marginTop: 2,
  },
  extraRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 4,
  },
  error: {
    color: COLORS.error,
    fontSize: 12,
    lineHeight: 17,
  },
  primaryBtn: {
    height: 50,
    borderRadius: RADIUS.DEFAULT,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  primaryBtnText: {
    color: COLORS.onPrimary,
    fontSize: 14,
    fontWeight: '800',
    flexShrink: 1,
    textAlign: 'center',
  },
  btnDisabled: {
    opacity: 0.55,
  },
  secondaryBtn: {
    height: 50,
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
  doneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
