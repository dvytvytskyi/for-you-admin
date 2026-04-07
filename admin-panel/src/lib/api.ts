import axios from 'axios'
const getApiUrl = () => {
  // Завжди використовуємо URL з .env, якщо ми в браузері або на сервері
  return process.env.NEXT_PUBLIC_API_URL || 'http://135.181.201.185/api'
}
export const api = axios.create({
  baseURL: getApiUrl(),
})
api.interceptors.request.use(
  (config) => {
    config.baseURL = getApiUrl();
    
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    if (status === 401 || status === 403) {
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        localStorage.removeItem('token')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)
