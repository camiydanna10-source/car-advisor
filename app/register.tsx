import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { registerUser } from '../services/authService';

// Función auxiliar para alertas globales
const mostrarMensaje = (titulo: string, mensaje: string) => {
  if (Platform.OS === 'web') {
    alert(`${titulo}: ${mensaje}`);
  } else {
    Alert.alert(titulo, mensaje);
  }
};

export default function RegisterScreen() {
  const router = useRouter();

  // Estados del formulario
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Estados de interfaz
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Estado para la pantalla visual de éxito
  const [isSuccess, setIsSuccess] = useState(false);

  const handleRegister = async () => {
    // 1. Validar campos vacíos
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      mostrarMensaje('Campos incompletos', 'Por favor llena todos los campos obligatorios.');
      return;
    }

    // 2. Validar coincidencia de contraseñas (Doble verificación)
    if (password !== confirmPassword) {
      mostrarMensaje('Las contraseñas no coinciden', 'Asegúrate de escribir la misma contraseña en ambos campos.');
      return;
    }

    // 3. Validar longitud mínima de contraseña
    if (password.length < 6) {
      mostrarMensaje('Contraseña débil', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);

    try {
      await registerUser({ name, email, password });
      setLoading(false);
      setIsSuccess(true); // Cambia la pantalla a la vista de éxito
    } catch (error: any) {
      setLoading(false);
      mostrarMensaje('Error en el registro', error.message);
    }
  };

  // VISTA VISUAL DE ÉXITO (Respeta tu paleta de colores)
  if (isSuccess) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Ionicons name="checkmark-circle" size={80} color="#37d1ba" />
          <Text style={{ fontSize: 24, fontWeight: 'bold', marginTop: 16, color: '#fefefe' }}>
            ¡Registro Exitoso! 
          </Text>
          <Text style={{ fontSize: 16, color: '#a4a4a4', textAlign: 'center', marginTop: 8, marginBottom: 24 }}>
            Tu cuenta ha sido creada correctamente en CarAdvisor.
          </Text>
          <TouchableOpacity
            style={[styles.button, { width: '100%' }]}
            onPress={() => router.replace('/')}
          >
            <Text style={styles.buttonText}>Ir al Inicio / Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Cabecera */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fefeff" />
          </TouchableOpacity>
          <Text style={styles.title}>Crea tu cuenta</Text>
          <Text style={styles.subtitle}>Ingresa tus datos para registrarte en CarAdvisor</Text>
        </View>

        {/* Formulario */}
        <View style={styles.form}>
          
          {/* Campo Nombre */}
          <Text style={styles.label}>Nombre completo</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color="#37d1ba" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Ej. Juan Pérez"
              placeholderTextColor="#ffffff" 
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Campo Email */}
          <Text style={styles.label}>Correo electrónico</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#37d1ba" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="ejemplo@correo.com"
              placeholderTextColor="#fcfcfc" 
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* Campo Contraseña */}
          <Text style={styles.label}>Contraseña</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#37d1ba" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor="#fbfbfb" 
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="#37d1ba"
              />
            </TouchableOpacity>
          </View>

          {/* Campo Confirmar Contraseña */}
          <Text style={styles.label}>Confirmar contraseña</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#37d1ba" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Repite tu contraseña"
              placeholderTextColor="#fefefe"
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              <Ionicons
                name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="#37d1ba"
              />
            </TouchableOpacity>
          </View>

          {/* Botón Registrarse */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>Registrarse</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <TouchableOpacity style={styles.footer} onPress={() => router.replace('/')}>
          <Text style={styles.footerText}>
            ¿Ya tienes una cuenta? <Text style={styles.footerLink}>Inicia sesión</Text>
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0d131a',
  },
  scrollContent: {
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    marginTop: 10,
    marginBottom: 24,
  },
  backButton: {
    marginBottom: 16,
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fefefe',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#37d1ba',
  },
  form: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a4a4a4',
    marginBottom: 6,
    marginTop: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d131a',
    borderWidth: 1,
    borderColor: '#656565',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#ffffff',
  },
  button: {
    backgroundColor: '#37d1ba',
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
    shadowColor: '#37d1ba',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#37d1ba',
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#ffffff',
  },
  footerLink: {
    color: '#37d1ba',
    fontWeight: 'bold',
  },
});