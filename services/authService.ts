import { API_BASE } from './config';

const API_URL = `${API_BASE}/auth`;

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export const loginUser = async (data: LoginData) => {
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

    return await response.json(); // AuthResponse (token, email, name)
  } catch (error: any) {
    throw new Error(error.message || 'Error de conexión con el servidor');
  }
};

export const registerUser = async (data: RegisterData) => {
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

    return await response.json(); // Devuelve AuthResponse (token, email, name)
  } catch (error: any) {
    throw new Error(error.message || 'Error de conexión con el servidor');
  }
};