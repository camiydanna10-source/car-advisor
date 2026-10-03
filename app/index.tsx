import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, Lock, Key, ArrowRight, ShieldAlert, Fingerprint, Eye, EyeOff } from 'lucide-react-native';
import { COLORS } from '../constants/theme';
import { loginUser } from '../services/authService';
import { GlassCard } from '../components/GlassCard';
import { AuthHeader } from '../components/AuthHeader';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg('Por favor ingresa tu correo y contraseña.');
      return;
    }
    setErrorMsg('');
    setIsLoading(true);
    try {
      await loginUser({ email, password });
      Alert.alert('¡Bienvenido, piloto!', 'Sesión iniciada correctamente.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestSOS = () => {
    router.push('/sos');
  };

  return (
    <>
      <AuthHeader label="Sign In" showBack={false} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Header Badge */}
        <View style={styles.topHeader}>
          <View style={styles.badgeRow}>
            <Key size={16} color={COLORS.primary} />
            <Text style={styles.badgeText}>ACCESO SEGURO COCKPIT</Text>
          </View>
          <Text style={styles.title}>
            ¡Hola de nuevo, <Text style={styles.titleAccent}>piloto!</Text>
          </Text>
          <Text style={styles.subtitle}>
            Ingresa a tu garaje digital y monitorea la salud de tu vehículo en tiempo real.
          </Text>
        </View>

        {/* Main Glass Form Card */}
        <GlassCard variant="primaryGlow" style={styles.formCard}>
          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Email Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Correo electrónico o ID de usuario</Text>
            <View style={styles.inputWrapper}>
              <Mail size={18} color={COLORS.onSurfaceVariant} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="tu@correo.com"
                placeholderTextColor={COLORS.outline}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Password Field */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Contraseña</Text>
              <TouchableOpacity
                onPress={() =>
                  Alert.alert('Próximamente', 'La recuperación de contraseña estará disponible pronto.')
                }
              >
                <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputWrapper}>
              <Lock size={18} color={COLORS.onSurfaceVariant} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="••••••••••••"
                placeholderTextColor={COLORS.outline}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? (
                  <EyeOff size={18} color={COLORS.onSurfaceVariant} />
                ) : (
                  <Eye size={18} color={COLORS.onSurfaceVariant} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.onPrimary} />
            ) : (
              <>
                <Text style={styles.submitBtnText}>Iniciar Sesión</Text>
                <ArrowRight size={18} color={COLORS.onPrimary} />
              </>
            )}
          </TouchableOpacity>

          {/* Biometric Quick Button */}
          <TouchableOpacity style={styles.bioBtn} onPress={handleLogin}>
            <Fingerprint size={20} color={COLORS.primary} />
            <Text style={styles.bioBtnText}>Acceso Rápido Biométrico</Text>
          </TouchableOpacity>

          {/* Guest SOS Express Card */}
          <TouchableOpacity style={styles.guestSosCard} onPress={handleGuestSOS}>
            <View style={styles.guestIconBox}>
              <ShieldAlert size={22} color={COLORS.tertiary} />
            </View>
            <View style={styles.guestContent}>
              <View style={styles.guestTitleRow}>
                <Text style={styles.guestTitle}>Modo Invitado / SOS Vial</Text>
                <Text style={styles.guestBadge}>Sin registro</Text>
              </View>
              <Text style={styles.guestSub}>
                Asistencia urgente, auxilio mecánico y grúa en carretera
              </Text>
            </View>
            <ArrowRight size={18} color={COLORS.primary} />
          </TouchableOpacity>
        </GlassCard>

        {/* Footer Register Link */}
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>¿Aún no tienes cuenta?</Text>
          <TouchableOpacity onPress={() => router.push('/register')}>
            <Text style={styles.registerLink}>Regístrate gratis</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  topHeader: {
    marginBottom: 24,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  badgeText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  title: {
    color: COLORS.onSurface,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  titleAccent: {
    color: COLORS.primary,
  },
  subtitle: {
    color: COLORS.onSurfaceVariant,
    fontSize: 14,
    marginTop: 6,
    lineHeight: 20,
  },
  formCard: {
    gap: 16,
  },
  errorBox: {
    backgroundColor: 'rgba(255, 180, 171, 0.15)',
    borderWidth: 1,
    borderColor: COLORS.error,
    padding: 10,
    borderRadius: 8,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    fontWeight: '600',
  },
  inputGroup: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: COLORS.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '600',
  },
  forgotText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  inputWrapper: {
    height: 48,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: COLORS.onSurface,
    fontSize: 14,
  },
  submitBtn: {
    height: 48,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  submitBtnText: {
    color: COLORS.onPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  bioBtn: {
    height: 44,
    backgroundColor: 'rgba(107, 216, 203, 0.1)',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(107, 216, 203, 0.3)',
  },
  bioBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  guestSosCard: {
    marginTop: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(39, 42, 44, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(236, 106, 6, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  guestIconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: 'rgba(236, 106, 6, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestContent: {
    flex: 1,
  },
  guestTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  guestTitle: {
    color: COLORS.onSurface,
    fontSize: 13,
    fontWeight: '700',
  },
  guestBadge: {
    color: COLORS.tertiary,
    fontSize: 9,
    fontWeight: '700',
    backgroundColor: 'rgba(236, 106, 6, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  guestSub: {
    color: COLORS.onSurfaceVariant,
    fontSize: 11,
    marginTop: 2,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 24,
  },
  footerText: {
    color: COLORS.onSurfaceVariant,
    fontSize: 13,
  },
  registerLink: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
});
