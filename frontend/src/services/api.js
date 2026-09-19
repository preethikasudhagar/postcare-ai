import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor — attach access token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('postcare_access')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response interceptor — refresh on 401 (excluding auth endpoints)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const isAuthEndpoint = original?.url?.includes('/auth/login') || 
                           original?.url?.includes('/auth/register') || 
                           original?.url?.includes('/auth/google') || 
                           original?.url?.includes('/auth/refresh')

    if (error.response?.status === 401 && !original?._retry && !isAuthEndpoint) {
      original._retry = true
      try {
        const refresh = localStorage.getItem('postcare_refresh')
        if (!refresh) throw new Error('No refresh token')
        const res = await axios.post('/api/auth/refresh/', { refresh })
        const newAccess = res.data.access
        localStorage.setItem('postcare_access', newAccess)
        original.headers.Authorization = `Bearer ${newAccess}`
        return api(original)
      } catch {
        localStorage.removeItem('postcare_access')
        localStorage.removeItem('postcare_refresh')
        localStorage.removeItem('postcare_user')
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api
