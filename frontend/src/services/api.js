import axios from 'axios'

// ─── Public endpoints that must NEVER receive an Authorization header ─────────
// Sending a stale/expired token to these endpoints causes DRF's JWTAuthentication
// to reject the request with 401 BEFORE the view logic even runs.
const PUBLIC_PATHS = [
  '/auth/login/',
  '/auth/register/',
  '/auth/google/',
  '/auth/refresh/',
  '/auth/forgot-password/',
  '/auth/reset-password/',
]

const isPublicEndpoint = (url = '') =>
  PUBLIC_PATHS.some((path) => url.includes(path))

// ─── Axios instance ────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// ─── REQUEST interceptor ──────────────────────────────────────────────────────
// Only attach Authorization header for PROTECTED endpoints.
// Public endpoints (login, register, google, refresh) never get the token.
api.interceptors.request.use(
  (config) => {
    // If sending FormData, remove Content-Type so browser/Axios sets multipart/form-data with boundary
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      if (config.headers) {
        if (typeof config.headers.delete === 'function') {
          config.headers.delete('Content-Type')
          config.headers.delete('content-type')
        } else {
          delete config.headers['Content-Type']
          delete config.headers['content-type']
        }
      }
    }
    if (!isPublicEndpoint(config.url)) {
      const token = localStorage.getItem('postcare_access')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ─── Track if a refresh is already in progress to prevent parallel refreshes ──
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

// ─── RESPONSE interceptor ─────────────────────────────────────────────────────
// On 401 for PROTECTED endpoints:
//   1. Try refreshing the access token once.
//   2. If refresh succeeds → retry original request.
//   3. If refresh fails (expired/invalid refresh token) → clear auth and redirect.
// Public endpoints 401s are passed straight through to the caller.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Pass through errors from public endpoints — let the caller handle them.
    if (isPublicEndpoint(originalRequest?.url)) {
      return Promise.reject(error)
    }

    // Only attempt refresh on 401 and only once per request.
    if (
      error.response?.status === 401 &&
      !originalRequest?._retry
    ) {
      if (isRefreshing) {
        // Queue this request until the ongoing refresh resolves.
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = localStorage.getItem('postcare_refresh')

      if (!refreshToken) {
        // No refresh token — clear auth and redirect.
        clearAuthAndRedirect()
        isRefreshing = false
        return Promise.reject(error)
      }

      try {
        // Use a plain axios call (not the intercepted `api`) to avoid loops.
        const res = await axios.post('/api/auth/refresh/', { refresh: refreshToken })
        const newAccess = res.data.access
        localStorage.setItem('postcare_access', newAccess)
        // If the server also rotates the refresh token, persist it.
        if (res.data.refresh) {
          localStorage.setItem('postcare_refresh', res.data.refresh)
        }
        originalRequest.headers.Authorization = `Bearer ${newAccess}`
        processQueue(null, newAccess)
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        clearAuthAndRedirect()
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

function clearAuthAndRedirect() {
  localStorage.removeItem('postcare_access')
  localStorage.removeItem('postcare_refresh')
  localStorage.removeItem('postcare_user')
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

export default api
