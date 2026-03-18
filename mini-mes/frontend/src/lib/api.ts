import axios from 'axios'

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  timeout: 15_000,
})

// Injetar token JWT automaticamente
api.interceptors.request.use(config => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('mes_token') : null
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Redirecionar para login em caso de 401
api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('mes_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)
