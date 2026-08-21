import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/services/http';

export interface User {
  id: string;
  email: string | null;
  isAnonymous: boolean;
  preferredName: string | null;
  hasBirthDate: boolean;
  plan: 'free' | 'pro';
  /** Acceso pro regalado por el admin. */
  isVip?: boolean;
  legalUpToDate: boolean;
  emailPrefs?: { reengagement: boolean; achievements: boolean };
  whatsappWaitlist?: boolean;
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('alfii_token'));
  const user = ref<User | null>(null);
  const loading = ref(false);

  function setToken(newToken: string) {
    token.value = newToken;
    localStorage.setItem('alfii_token', newToken);
  }

  async function initAnonymous() {
    if (token.value) {
      try {
        await fetchMe();
        return;
      } catch {
        // Token expirado o invalido
      }
    }
    loading.value = true;
    try {
      const res: any = await api.post('/auth/anonymous');
      setToken(res.token);
      user.value = res.user;
    } finally {
      loading.value = false;
    }
  }

  async function fetchMe() {
    if (!token.value) return;
    const res: any = await api.get('/auth/me');
    user.value = res.user;
  }

  async function register(payload: { email: string; password: string; confirm18: boolean; legalVersion: string }) {
    loading.value = true;
    try {
      const res: any = await api.post('/auth/register', payload);
      setToken(res.token);
      user.value = res.user;
      return res;
    } finally {
      loading.value = false;
    }
  }

  async function login(email: string, password: string) {
    loading.value = true;
    try {
      const res: any = await api.post('/auth/login', { email, password });
      setToken(res.token);
      user.value = res.user;
      return res;
    } finally {
      loading.value = false;
    }
  }

  function logout() {
    token.value = null;
    user.value = null;
    localStorage.removeItem('alfii_token');
  }

  // setToken se expone porque los flujos de contrasena (restablecer y cambiar)
  // reciben un token nuevo del backend y deben guardarlo igual que el login.
  // Sin exportarlo, cada vista acababa duplicando el acceso a localStorage.
  return { token, user, setToken, loading, initAnonymous, fetchMe, register, login, logout };
});
