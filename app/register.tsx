import { useRouter } from 'expo-router';
import { ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck, User } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AuthHeader } from '../components/AuthHeader';
import { GlassCard } from '../components/GlassCard';
import { COLORS } from '../constants/theme';
import { PhoneField } from '../components/PhoneField';
import { registerUser } from '../services/authService';
import { PHONE_ERROR, normalizePhone } from '../services/phone';
import { setPhone as savePhone } from '../services/profileStorage';

export default function RegisterScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Reglas de seguridad idénticas a las del backend
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[@#$%^&+=!._-]/.test(password);

  const isPasswordSecure = hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !phone.trim() || !password.trim() || !confirmPassword.trim()) {
      setErrorMsg('Por favor completa todos los campos.');
      return;
    }
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      setErrorMsg(PHONE_ERROR);
      return;
    }
    if (!isPasswordSecure) {
      setErrorMsg('La contraseña no cumple con todos los requisitos de seguridad.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }

    setErrorMsg('');
    setIsLoading(true);
    try {
      await registerUser({ name, email, password });
      // The register endpoint does not take the phone yet: keep it on the device (see the commit notes).
      await savePhone(email, normalizedPhone);
      router.replace({ pathname: '/register-vehicle', params: { name: name.trim() } });
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al registrar usuario');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AuthHeader label="Sign Up" />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.topHeader}>
          <View style={styles.badgeRow}>
            <ShieldCheck size={16} color={COLORS.primary} />
            <Text style={styles.badgeText}>REGISTRO DE PILOTO</Text>
          </View>
          <Text style={styles.title}>
            Crea tu <Text style={styles.titleAccent}>cuenta</Text>
          </Text>
          <Text style={styles.subtitle}>
            Únete a la plataforma de monitoreo mecánico y auxilio vial en tiempo real.
          </Text>
        </View>

        <GlassCard variant="primaryGlow" style={styles.formCard}>
          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Name Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nombre Completo</Text>
            <View style={styles.inputWrapper}>
              <User size={18} color={COLORS.onSurfaceVariant} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Carlos Sainz"
                placeholderTextColor={COLORS.outline}
                value={name}
                onChangeText={setName}
              />
            </View>
          </View>

          {/* Email Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Correo Electrónico</Text>
            <View style={styles.inputWrapper}>
              <Mail size={18} color={COLORS.onSurfaceVariant} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="piloto@caradvisor.app"
                placeholderTextColor={COLORS.outline}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <PhoneField
            value={phone}
            onChangeText={setPhone}
            hint="Para que el mecánico pueda llamarte o escribirte por WhatsApp."
          />

          {/* Password Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.inputWrapper}>
              <Lock size={18} color={COLORS.onSurfaceVariant} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Mínimo 8 caracteres"
                placeholderTextColor={COLORS.outline}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? (
                  <EyeOff size={18} color={COLORS.onSurfaceVariant} />
                ) : (
                  <Eye size={18} color={COLORS.onSurfaceVariant} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Requisitos visuales de la contraseña en tiempo real */}
          <View style={styles.requirementsContainer}>
            <Text style={[styles.reqText, hasMinLength ? styles.valid : styles.invalid]}>
              {hasMinLength ? '✓' : '•'} Mínimo 8 caracteres
            </Text>
            <Text style={[styles.reqText, hasUpperCase ? styles.valid : styles.invalid]}>
              {hasUpperCase ? '✓' : '•'} Al menos una letra mayúscula
            </Text>
            <Text style={[styles.reqText, hasLowerCase ? styles.valid : styles.invalid]}>
              {hasLowerCase ? '✓' : '•'} Al menos una letra minúscula
            </Text>
            <Text style={[styles.reqText, hasNumber ? styles.valid : styles.invalid]}>
              {hasNumber ? '✓' : '•'} Al menos un número
            </Text>
            <Text style={[styles.reqText, hasSpecialChar ? styles.valid : styles.invalid]}>
              {hasSpecialChar ? '✓' : '•'} Un carácter especial (@#$%^&+=!._-)
            </Text>
          </View>

          {/* Confirm Password Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirmar Contraseña</Text>
            <View style={styles.inputWrapper}>
              <ShieldCheck size={18} color={COLORS.onSurfaceVariant} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Repite tu contraseña"
                placeholderTextColor={COLORS.outline}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                {showConfirmPassword ? (
                  <EyeOff size={18} color={COLORS.onSurfaceVariant} />
                ) : (
                  <Eye size={18} color={COLORS.onSurfaceVariant} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, !isPasswordSecure && styles.submitBtnDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.onPrimary} />
            ) : (
              <>
                <Text style={styles.submitBtnText}>Crear Cuenta y Garaje</Text>
                <ArrowRight size={18} color={COLORS.onPrimary} />
              </>
            )}
          </TouchableOpacity>
        </GlassCard>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>¿Ya tienes cuenta?</Text>
          <TouchableOpacity onPress={() => router.push('/')}>
            <Text style={styles.loginLink}>Iniciar Sesión</Text>
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
  label: {
    color: COLORS.onSurfaceVariant,
    fontSize: 12,
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
  requirementsContainer: {
    paddingHorizontal: 4,
    gap: 4,
    marginVertical: -4,
  },
  reqText: {
    fontSize: 12,
  },
  valid: {
    color: '#4ADE80', // Verde brillante
    fontWeight: '600',
  },
  invalid: {
    color: COLORS.onSurfaceVariant,
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
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: COLORS.onPrimary,
    fontSize: 15,
    fontWeight: '700',
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
  loginLink: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
});