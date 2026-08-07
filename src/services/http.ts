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

/** Error de API con el detalle que manda el backend en los 4xx. */
export interface ApiError extends Error {
  status?: number;
  details?: any;
}

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg = err.response?.data?.message || err.message || 'Error de conexión';
    const status = err.response?.status;
    const details = err.response?.data?.details;

    // Algunos 4xx no son fallos sino bifurcaciones del flujo (por ejemplo, un
    // nombre repetido que el usuario tiene que resolver). Ahi el toast rojo
    // sobra: la vista abre la hoja que corresponde y explica que pasa.
    const handledByCaller = !!details?.reason;

    if (!handledByCaller) {
      try {
        const toastStore = useToastStore();
        toastStore.show(msg, 'error');
      } catch {
        // Si Pinia aun no esta montado
        console.error('[API Error]', msg);
      }
    }

    const error: ApiError = new Error(msg);
    error.status = status;
    error.details = details;
    return Promise.reject(error);
  }
);

export default api;
