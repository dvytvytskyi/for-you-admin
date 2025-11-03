'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    router.push('/dashboard')
  }, [router])

  return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h1>Перенаправлення...</h1>
    </div>
  )
}

