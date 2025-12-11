'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import Alert from "@/components/ui/alert/Alert";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import Link from "next/link";

export default function SignIn() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isChecked, setIsChecked] = useState(false)
  const [error, setError] = useState<string>('')
  const [checkingAuth, setCheckingAuth] = useState(true)

  // Перевіряємо, чи користувач вже авторизований
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token')
      if (token) {
        // Перевіряємо валідність токену через API
        try {
          let apiUrl = 'http://localhost:4000/api'
          if (typeof window !== 'undefined') {
            const origin = window.location.origin
            if (origin.includes('admin.foryou-realestate.com') || origin.includes('foryou-realestate.com')) {
              apiUrl = origin + '/api'
            } else {
              const envUrl = process.env.NEXT_PUBLIC_API_URL
              if (envUrl) {
                apiUrl = envUrl
              }
            }
          }
          
          await axios.get(`${apiUrl}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          
          // Якщо токен валідний, перенаправляємо на dashboard
          router.push('/dashboard')
        } catch (err) {
          // Токен невалідний, видаляємо його
          localStorage.removeItem('token')
        }
      }
      setCheckingAuth(false)
    }
    
    checkAuth()
  }, [router])

  // Показуємо loading під час перевірки авторизації
  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="text-gray-500 dark:text-gray-400">Перевірка...</p>
        </div>
      </div>
    )
  }

  const onFinish = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    setLoading(true)
    setError('')
    
    try {
      // Визначаємо API URL на основі домену
      let apiUrl = 'http://localhost:4000/api'
      
      // ПЕРШИМ ділом перевіряємо поточний домен (найнадійніше)
      if (typeof window !== 'undefined') {
        const origin = window.location.origin
        console.log('[Login] Current origin:', origin)
        
        // Якщо це foryou домен, ВИКОРИСТОВУЄМО ЙОГО (незалежно від env змінних)
        if (origin.includes('admin.foryou-realestate.com') || origin.includes('foryou-realestate.com')) {
          apiUrl = origin + '/api'
          console.log('[Login] Detected foryou domain, using:', apiUrl)
        } else {
          // Якщо не визначено домен, перевіряємо змінну оточення
          const envUrl = process.env.NEXT_PUBLIC_API_URL
          if (envUrl) {
            apiUrl = envUrl
            console.log('[Login] Using env variable:', apiUrl)
          }
        }
      } else {
        // Server-side: перевіряємо змінну оточення
        const envUrl = process.env.NEXT_PUBLIC_API_URL
        if (envUrl) {
          apiUrl = envUrl
        }
      }
      
      console.log('[Login] Final API URL:', apiUrl)
      
      const { data } = await axios.post(`${apiUrl}/auth/login`, {
        email,
        password,
      })

      console.log('[Login] Response:', data)

      if (data.success && data.data?.token) {
        // Зберігаємо токен
        localStorage.setItem('token', data.data.token)
        
        // Перевіряємо, чи токен дійсно зберігся
        const savedToken = localStorage.getItem('token')
        if (!savedToken) {
          throw new Error('Failed to save token')
        }
        
        console.log('[Login] Token saved successfully')
        
        // Невелика затримка перед перенаправленням, щоб дати час зберегти токен
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Перенаправляємо на dashboard
        router.push('/dashboard')
        // Також використовуємо window.location для надійності
        setTimeout(() => {
          if (window.location.pathname === '/login') {
            window.location.href = '/dashboard'
          }
        }, 200)
      } else {
        throw new Error(data.message || 'Invalid response from server')
      }
    } catch (err: any) {
      console.error('Login error:', err)
      
      // Обробка різних типів помилок
      const status = err.response?.status
      const errorMessage = err.response?.data?.message || err.message || 'Invalid email or password'
      
      if (status === 502) {
        setError('Сервер тимчасово недоступний (502 Bad Gateway). Будь ласка, спробуйте пізніше або зверніться до адміністратора.')
      } else if (status === 503) {
        setError('Сервер перевантажений (503 Service Unavailable). Будь ласка, спробуйте пізніше.')
      } else if (status === 500) {
        setError('Внутрішня помилка сервера (500). Будь ласка, спробуйте пізніше або зверніться до адміністратора.')
      } else if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
        setError('Помилка підключення до сервера. Перевірте підключення до інтернету.')
      } else if (status === 401 || status === 403) {
        setError('Невірний email або пароль. Перевірте введені дані.')
      } else {
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto pt-10">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Sign In
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enter your email and password to sign in!
            </p>
          </div>
          <div>
            {error && (
              <Alert 
                variant="error" 
                title="Login Error" 
                message={error}
                className="mb-6"
              />
            )}
            <form onSubmit={onFinish}>
              <div className="space-y-6">
                <div>
                  <Label>
                    Email <span className="text-error-500">*</span>{" "}
                  </Label>
                  <Input name="email" placeholder="info@gmail.com" type="email" required />
                </div>
                <div>
                  <Label>
                    Password <span className="text-error-500">*</span>{" "}
                  </Label>
                  <div className="relative">
                    <Input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={isChecked} onChange={setIsChecked} />
                    <span className="block font-normal text-gray-700 text-theme-sm dark:text-gray-400">
                      Keep me logged in
                    </span>
                  </div>
                  <Link
                    href="/reset-password"
                    className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div>
                  <Button type="submit" className="w-full" size="sm" disabled={loading}>
                    {loading ? 'Signing in...' : 'Sign in'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
