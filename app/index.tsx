import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Switch,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { Link } from 'expo-router';

const API_URL = 'http://10.0.2.2:8080/api/auth';

export default function LoginScreen() {
  const [email, setEmail] = useState('carlos.sainz@paddock.com');
  const [password, setPassword] = useState('123456789012');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor ingresa tu correo y contraseña');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('¡Bienvenido, piloto!', `Token JWT obtenido exitosamente.`);
      } else {
        const errorMsg = typeof data === 'string' ? data : 'Credenciales incorrectas';
        Alert.alert('Error de acceso', errorMsg);
      }
    } catch (error) {
      Alert.alert('Error de conexión', 'No se pudo conectar con el servidor Spring Boot.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* NAVBAR */}
        <View style={styles.navbar}>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.brandContainer}>
            <Ionicons name="car-sport" size={20} color="#37d1ba" />
            <Text style={styles.brandText}>CarAdvisor</Text>
          </View>

          <View style={styles.navRight}>
            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="help-circle-outline" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={styles.avatarBadge}>
              <Text style={styles.avatarText}>Advi</Text>
            </View>
          </View>
        </View>

        {/* TITULOS */}
        <View style={styles.headerTitles}>
          <View style={styles.badgeCockpit}>
            <MaterialCommunityIcons name="key-wireless" size={14} color="#37d1ba"  />
            <Text style={styles.badgeText}> ACCESO SEGURO COCKPIT</Text>
          </View>
          <Text style={styles.mainTitle}>
            ¡Hola de nuevo, <Text style={styles.highlightTitle}>piloto!</Text>
          </Text>
          <Text style={styles.subtitle}>
            Ingresa a tu garaje digital y monitorea la salud de tu vehículo en tiempo real.
          </Text>
        </View>

        {/* FORMULARIO */}
        <View style={styles.card}>
          
          <Text style={styles.inputLabel}>Correo electrónico o ID de usuario</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#37d1ba"  style={styles.inputIconLeft} />
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="tu@correo.com"
              placeholderTextColor="#666"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {email.length > 0 && (
              <Ionicons name="checkmark-circle-outline" size={20} color="#37d1ba" />
            )}
          </View>

          <View style={styles.passwordHeader}>
            <Text style={styles.inputLabel}>Contraseña</Text>
            <TouchableOpacity>
              <Text style={styles.forgotPassword}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#37d1ba"  style={styles.inputIconLeft} />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholder="••••••••••••"
              placeholderTextColor="#666"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color="#37d1ba" 
              />
            </TouchableOpacity>
          </View>

          <View style={styles.optionsRow}>
            <View style={styles.rememberContainer}>
              <Switch
                value={rememberDevice}
                onValueChange={setRememberDevice}
                trackColor={{ false: '#333', true: "#37d1ba"  }}
                thumbColor="#fff"
              />
              <Text style={styles.rememberText}>Recordar este dispositivo</Text>
            </View>
            <View style={styles.securityBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#37d1ba"  />
              <Text style={styles.securityText}>256-bit</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#0d1b1e" />
            ) : (
              <View style={styles.btnContent}>
                <Text style={styles.submitBtnText}>Iniciar Sesión </Text>
                <Ionicons name="arrow-forward" size={18} color="#0d1b1e" />
              </View>
            )}
          </TouchableOpacity>

          {/* TARJETA SOS */}
          <TouchableOpacity style={styles.sosCard}>
            <View style={styles.sosIconBox}>
              <FontAwesome5 name="asterisk" size={16} color="#fff" />
            </View>
            <View style={styles.sosTextContainer}>
              <View style={styles.sosTitleRow}>
                <Text style={styles.sosTitle}>Modo Invitado / SOS ...</Text>
                <View style={styles.noRegisterBadge}>
                  <Text style={styles.noRegisterText}>SIN REGISTRO</Text>
                </View>
              </View>
              <Text style={styles.sosSubtitle}>Asistencia de emergencia, auxilio mecá...</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color="#37d1ba"  />
          </TouchableOpacity>

        </View>

        {/* LOGIN SOCIAL */}
        <Text style={styles.dividerText}>O CONTINÚA CON</Text>
        <View style={styles.socialRow}>
          <TouchableOpacity style={styles.socialBtn}>
            <FontAwesome5 name="apple" size={20} color="#fff" />
            <Text style={styles.socialText}>Apple</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.socialBtn}>
            <FontAwesome5 name="google" size={18} color="#fff" />
            <Text style={styles.socialText}>Google</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.socialBtn}>
            <MaterialCommunityIcons name="fingerprint" size={22} color="#37d1ba"  />
            <Text style={styles.socialText}>Face/Touch</Text>
          </TouchableOpacity>
        </View>

        {/* TARJETA OBD-II */}
        <View style={styles.obdCard}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?q=80&w=200&auto=format&fit=crop' }}
            style={styles.carImage}
          />
          <View style={styles.obdInfo}>
            <View style={styles.obdStatusRow}>
              <View style={styles.greenDot} />
              <Text style={styles.obdHeader}>ÚLTIMO ENLACE OBD-II</Text>
            </View>
            <Text style={styles.carModel}>Porsche Taycan 4S</Text>
            <Text style={styles.carStats}>Batería 88%  •  Sin códigos DTC activos</Text>
          </View>
        </View>

        {/* FOOTER */}
        <TouchableOpacity style={styles.footer}>
  <Text style={styles.footerText}>
    ¿Aún no tienes cuenta?{' '}
    <Link href="/register" style={styles.footerLink}>
      Regístrate gratis
    </Link>
  </Text>
</TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0d131a' },
  scrollContent: { paddingHorizontal: 18, paddingVertical: 10 },
  navbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 10 },
  brandContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brandText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBtn: { padding: 4 },
  avatarBadge: { backgroundColor: '#38ada9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  avatarText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  headerTitles: { marginVertical: 15 },
  badgeCockpit: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  badgeText: { color: "#37d1ba" , fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
  mainTitle: { color: '#fff', fontSize: 26, fontWeight: 'bold' },
  highlightTitle: { color: "#37d1ba"  },
  subtitle: { color: '#8a99ad', fontSize: 13, marginTop: 6, lineHeight: 18 },
  card: { backgroundColor: '#151d27', padding: 18, borderRadius: 16, marginBottom: 20 },
  inputLabel: { color: '#bcc8d8', fontSize: 12, fontWeight: '600', marginBottom: 6 },
  passwordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  forgotPassword: { color: "#37d1ba" , fontSize: 11 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d131a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#212d3b',
    marginBottom: 8,
  },
  inputIconLeft: { marginRight: 8 },
  input: { flex: 1, color: '#fff', fontSize: 14 },
  optionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 12 },
  rememberContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rememberText: { color: '#8a99ad', fontSize: 12 },
  securityBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#0d131a', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  securityText: { color: '#8a99ad', fontSize: 11 },
  submitBtn: { backgroundColor: "#37d1ba" , paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 5 },
  btnContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  submitBtnText: { color: '#0d1b1e', fontWeight: 'bold', fontSize: 15 },
  sosCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1d2734',
    padding: 12,
    borderRadius: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#2c3a4e',
  },
  sosIconBox: { backgroundColor: '#b33921', padding: 10, borderRadius: 8, marginRight: 10 },
  sosTextContainer: { flex: 1 },
  sosTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sosTitle: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  noRegisterBadge: { backgroundColor: '#843b18', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  noRegisterText: { color: '#ff793f', fontSize: 8, fontWeight: 'bold' },
  sosSubtitle: { color: '#8a99ad', fontSize: 11, marginTop: 2 },
  dividerText: { color: '#52637a', fontSize: 11, fontWeight: 'bold', textAlign: 'center', letterSpacing: 1, marginVertical: 15 },
  socialRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 20 },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#151d27',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#212d3b',
  },
  socialText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  obdCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151d27',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#212d3b',
    marginBottom: 20,
  },
  carImage: { width: 55, height: 45, borderRadius: 8, marginRight: 12 },
  obdInfo: { flex: 1 },
  obdStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  greenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#37d1ba"  },
  obdHeader: { color: "#37d1ba" , fontSize: 9, fontWeight: 'bold', letterSpacing: 0.5 },
  carModel: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  carStats: { color: '#8a99ad', fontSize: 11, marginTop: 2 },
  footer: { alignItems: 'center', paddingVertical: 10 },
  footerText: { color: '#8a99ad', fontSize: 13 },
  footerLink: { color: "#37d1ba" , fontWeight: 'bold' },
});