import axios, {
  type InternalAxiosRequestConfig,
  type AxiosResponse,
} from 'axios'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { type ApiError, type ApiResult } from './api-types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add auth token if available
    const token = useAuthStore.getState()?.auth?.accessToken
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // Log request in development
    if (import.meta.env.DEV) {
      console.log(
        `🚀 ${config.method?.toUpperCase()} ${config.url}`,
        config.data
      )
    }

    return config
  },
  (error) => {
    if (import.meta.env.DEV) {
      console.error('Request error:', error)
    }
    return Promise.reject(error)
  }
)

// Response interceptor
apiClient.interceptors.response.use(
  (response: AxiosResponse<ApiResult>) => {
    // Log response in development
    if (import.meta.env.DEV) {
      console.log(`✅ ${response.status} ${response.config.url}`, response.data)
    }

    return response
  },
  (error: {
    response?: AxiosResponse<ApiError> & {
      config: { url?: string }
    }
  }) => {
    if (import.meta.env.DEV) {
      console.error('Response error:', error)
    }

    const { response } = error

    // Handle different error status codes
    switch (response?.status) {
      case 400:
        // Don't show toast for auth endpoints as they handle their own errors
        if (!response.config.url?.includes('/auth/')) {
          toast.error('Bad request. Please check your input.')
        }
        break
      case 401:
        toast.error('Session expired. Please sign in again.')
        useAuthStore.getState().auth.reset()
        // Redirect will be handled by TanStack Query error handling in main.tsx
        break
      case 403:
        toast.error("Access denied. You don't have permission.")
        break
      case 404:
        toast.error('Resource not found.')
        break
      case 422:
        // Validation errors - let the component handle these for auth endpoints
        if (!response.config.url?.includes('/auth/')) {
          toast.error('Validation failed. Please check your input.')
        }
        break
      case 429:
        toast.error('Too many requests. Please try again later.')
        break
      case 500:
        toast.error('Server error. Please try again later.')
        break
      default:
        if (
          response?.data?.message &&
          !response.config.url?.includes('/auth/')
        ) {
          toast.error(response.data.message)
        } else if (!response?.config?.url?.includes('/auth/')) {
          toast.error('Something went wrong. Please try again.')
        }
    }

    return Promise.reject(error)
  }
)

export default apiClient
