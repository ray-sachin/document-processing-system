/**
 * API Client
 */
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/auth-store';
import { resolveApiBaseUrl } from '@/lib/runtime-config';

export const api = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    config.baseURL = resolveApiBaseUrl();

    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = useAuthStore.getState().refreshToken;
      
      if (refreshToken) {
        try {
          const response = await axios.post(`${resolveApiBaseUrl()}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          
          const { access_token, refresh_token } = response.data;
          useAuthStore.getState().setTokens(access_token, refresh_token);
          
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        } catch (refreshError) {
          useAuthStore.getState().logout();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  
  register: async (email: string, password: string, fullName?: string) => {
    const response = await api.post('/auth/register', {
      email,
      password,
      full_name: fullName,
    });
    return response.data;
  },
  
  logout: async () => {
    await api.post('/auth/logout');
  },
  
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// Documents API
export const documentsApi = {
  list: async (params?: Record<string, string | number | boolean | undefined>) => {
    const response = await api.get('/documents', { params });
    return response.data;
  },
  
  get: async (id: string) => {
    const response = await api.get(`/documents/${id}`);
    return response.data;
  },
  
  upload: async (files: File[], onProgress?: (progress: number) => void) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    
    const response = await api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          onProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
        }
      },
    });
    return response.data;
  },
  
  delete: async (id: string) => {
    await api.delete(`/documents/${id}`);
  },
};

// Jobs API
export const jobsApi = {
  list: async (params?: Record<string, string | number | boolean | undefined>) => {
    const response = await api.get('/jobs', { params });
    return response.data;
  },
  
  get: async (id: string) => {
    const response = await api.get(`/jobs/${id}`);
    return response.data;
  },
  
  retry: async (id: string, resetRetryCount = false) => {
    const response = await api.post(`/jobs/${id}/retry`, {
      reset_retry_count: resetRetryCount,
    });
    return response.data;
  },
  
  cancel: async (id: string) => {
    const response = await api.post(`/jobs/${id}/cancel`);
    return response.data;
  },
};

// Results API
export const resultsApi = {
  get: async (jobId: string) => {
    const response = await api.get(`/results/${jobId}`);
    return response.data;
  },
  
  update: async (jobId: string, data: Record<string, unknown>) => {
    const response = await api.put(`/results/${jobId}`, data);
    return response.data;
  },
  
  finalize: async (jobId: string) => {
    const response = await api.post(`/results/${jobId}/finalize`, {
      confirm: true,
    });
    return response.data;
  },
};

// Export API
export const exportApi = {
  exportAllJson: async (finalizedOnly = true) => {
    const response = await api.get('/export/json', {
      params: { finalized_only: finalizedOnly },
      responseType: 'blob',
    });
    return response.data;
  },
  
  exportAllCsv: async (finalizedOnly = true) => {
    const response = await api.get('/export/csv', {
      params: { finalized_only: finalizedOnly },
      responseType: 'blob',
    });
    return response.data;
  },
  
  exportSingleJson: async (jobId: string) => {
    const response = await api.get(`/export/${jobId}/json`, {
      responseType: 'blob',
    });
    return response.data;
  },
  
  exportSingleCsv: async (jobId: string) => {
    const response = await api.get(`/export/${jobId}/csv`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export default api;
