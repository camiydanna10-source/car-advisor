import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { API_BASE } from './config';

const API_URL = `${API_BASE}/auth`;

export const TOKEN_KEY = 'user_jwt_token';
export const USER_KEY = 'user_info';

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  email: string;
  name?: string;
}

// Helpers para compatibilidad entre Web (localStorage) y Móvil (SecureStore)
const setStorageItem = async (key: string, value: string): Promise<void> => {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
};

const getStorageItem = async (key: string): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }
  return await SecureStore.getItemAsync(key);
};

const removeStorageItem = async (key: string): Promise<void> => {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
};

// Iniciar Sesión
export const loginUser = async (data: LoginData): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Credenciales incorrectas');
    }

    const result: AuthResponse = await response.json();

    // Guardar el token en el almacenamiento seguro/web
    if (result.token) {
      await setStorageItem(TOKEN_KEY, result.token);
      await setStorageItem(USER_KEY, JSON.stringify({ name: result.name, email: result.email }));
    }

    return result;
  } catch (error: any) {
    throw new Error(error.message || 'Error de conexión con el servidor');
  }
};

// Registrar Usuario
export const registerUser = async (data: RegisterData): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Error al registrar el usuario');
    }

    const result: AuthResponse = await response.json();

    // Guardar el token si el registro inicia sesión automáticamente
    if (result.token) {
      await setStorageItem(TOKEN_KEY, result.token);
      await setStorageItem(USER_KEY, JSON.stringify({ name: result.name, email: result.email }));
    }

    return result;
  } catch (error: any) {
    throw new Error(error.message || 'Error de conexión con el servidor');
  }
};

// Obtener el JWT para realizar peticiones autenticadas
export const getToken = async (): Promise<string | null> => {
  return await getStorageItem(TOKEN_KEY);
};

// Obtener los datos del usuario logueado
export const getUserInfo = async () => {
  const userStr = await getStorageItem(USER_KEY);
  return userStr ? JSON.parse(userStr) : null;
};

// Cerrar Sesión
export const logoutUser = async (): Promise<void> => {
  await removeStorageItem(TOKEN_KEY);
  await removeStorageItem(USER_KEY);
};