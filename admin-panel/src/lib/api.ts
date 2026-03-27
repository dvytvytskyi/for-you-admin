import axios from 'axios'

// Використовуємо window.location.origin як fallback для production
const getApiUrl = () => {
  // If we are in the browser, check if we should use the local proxy
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    
    // If the user wants to use the local proxy for all requests (avoids CORS)
    if (process.env.NEXT_PUBLIC_USE_PROXY === 'true') {
        return `${origin}/api/proxy?path=`;
    }
    
    // Default logic: use the current origin if it's the foryou domain
    if (origin.includes('admin.foryou-realestate.com') || origin.includes('foryou-realestate.com')) {
      return origin + '/api'
    }
  }
  
  // Server-side or other domains
  return process.env.NEXT_PUBLIC_API_URL || 'https://admin.foryou-realestate.com/api'
}

// Створюємо axios instance
export const api = axios.create({
  baseURL: getApiUrl(), // Початкове значення
})

// Request interceptor для оновлення baseURL та додавання JWT токену
api.interceptors.request.use(
  (config) => {
    const apiUrl = getApiUrl()
    
    // If using proxy, append the requested path to the 'path' parameter
    if (apiUrl.includes('/api/proxy?path=')) {
        const fullUrl = config.url || '';
        config.url = ''; // baseURL already has /api/proxy?path=
        config.params = { ...config.params, path: fullUrl };
    } else {
        config.baseURL = apiUrl;
    }
    
    // Add token
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor для обробки помилок
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    
    // Redirect to login for both 401 and 403 (unauthorized/forbidden)
    if (status === 401 || status === 403) {
      // Don't redirect if we're already on login page
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        console.warn('Authentication required, redirecting to login...');
        localStorage.removeItem('token')
        window.location.href = '/login'
      }
    }
    
    // Логування помилок сервера
    if (status === 502) {
      console.error('502 Bad Gateway: Backend server is not responding. Check if backend is running.')
    } else if (status === 503) {
      console.error('503 Service Unavailable: Backend server is overloaded or unavailable.')
    } else if (status === 500) {
      console.error('500 Internal Server Error: Backend server error.')
    }
    
    return Promise.reject(error)
  }
)

