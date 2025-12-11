'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      setIsChecking(true)
      
      // Невелика затримка, щоб дати час зберегти токен після логіну
      await new Promise(resolve => setTimeout(resolve, 150))
      
      const token = localStorage.getItem('token')
      
      // Якщо ми на сторінці логіну, не перевіряємо авторизацію
      if (pathname === '/login') {
        setIsChecking(false)
        setIsAuthenticated(false)
        return
      }
      
      if (!token) {
        // Якщо токен відсутній і ми не на сторінці логіну, перенаправляємо
        router.push('/login')
        setIsAuthenticated(false)
      } else {
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
          
          const response = await fetch(`${apiUrl}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          
          if (response.ok) {
            setIsAuthenticated(true)
          } else {
            // Токен невалідний, видаляємо його
            localStorage.removeItem('token')
            router.push('/login')
            setIsAuthenticated(false)
          }
        } catch (error) {
          console.error('Auth check error:', error)
          // При помилці мережі все одно дозволяємо доступ (може бути тимчасовий збій)
          setIsAuthenticated(true)
        }
      }
      
      setIsChecking(false)
    }

    checkAuth()
  }, [router, pathname])

  // Показуємо loading стан під час перевірки (тільки для захищених сторінок)
  if (isChecking && pathname !== '/login') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="text-gray-500 dark:text-gray-400">Перевірка авторизації...</p>
        </div>
      </div>
    )
  }

  // Якщо не авторизований і не на сторінці логіну, не показуємо контент
  if (!isAuthenticated && pathname !== '/login') {
    return null
  }

  return <>{children}</>
}

