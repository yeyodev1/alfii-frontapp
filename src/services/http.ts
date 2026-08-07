import axios from 'axios';
import { useToastStore } from '@/stores/toast';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100/api',
  timeout: 60000, // Aumentado a 60s para IA pesada / analisis de vision
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('alfii_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg = err.response?.data?.message || err.message || 'Error de conexión';
    try {
      const toastStore = useToastStore();
      toastStore.show(msg, 'error');
    } catch {
      // Si Pinia aun no esta montado
      console.error('[API Error]', msg);
    }
    return Promise.reject(new Error(msg));
  }
);

export default api;
