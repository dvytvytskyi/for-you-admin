import axios from 'axios'

// Використовуємо window.location.origin як fallback для production
const getApiUrl = () => {
  // ПЕРШИМ ділом перевіряємо поточний домен (найнадійніше)
  // Це працює в runtime, тому env змінні не можуть перевизначити
  if (typeof window !== 'undefined') {
    const origin = window.location.origin
    console.log('[getApiUrl] Current origin:', origin)
    
    // Якщо це foryou домен, ВИКОРИСТОВУЄМО ЙОГО (незалежно від env змінних)
    if (origin.includes('admin.foryou-realestate.com') || origin.includes('foryou-realestate.com')) {
      const url = origin + '/api'
      console.log('[getApiUrl] Using foryou domain:', url)
      return url
    }
    // Якщо це pro-part домен, використовуємо його
    if (origin.includes('pro-part.online')) {
      const url = origin + '/api'
      console.log('[getApiUrl] Using pro-part domain:', url)
      return url
    }
    console.log('[getApiUrl] Domain not recognized, checking env...')
  }
  
  // Якщо не в браузері або домен не визначено, перевіряємо змінну оточення
  const envUrl = process.env.NEXT_PUBLIC_API_URL
  console.log('[getApiUrl] Env URL:', envUrl)
  
  if (envUrl && !envUrl.includes('pro-part.online')) {
    console.log('[getApiUrl] Using env URL:', envUrl)
    return envUrl
  }
  
  // Fallback для локальної розробки
  const fallback = 'http://localhost:4000/api'
  console.log('[getApiUrl] Using fallback:', fallback)
  return fallback
}

// Створюємо axios instance
export const api = axios.create({
  baseURL: getApiUrl(), // Початкове значення
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor для оновлення baseURL та додавання JWT токену
api.interceptors.request.use(
  (config) => {
    // Оновлюємо baseURL перед кожним запитом (динамічно)
    const apiUrl = getApiUrl()
    config.baseURL = apiUrl
    
    // Логування для діагностики (завжди в браузері)
    if (typeof window !== 'undefined') {
      console.log('[API] Request to:', apiUrl + (config.url || ''), '| Origin:', window.location.origin)
    }
    
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor для обробки помилок
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Redirect to login for both 401 and 403 (unauthorized/forbidden)
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Don't redirect if we're already on login page
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        console.warn('Authentication required, redirecting to login...');
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

