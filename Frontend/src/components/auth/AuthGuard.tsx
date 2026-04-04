'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated, clearAuthSession } from '@/lib/auth'
import Cookies from 'js-cookie'
import { jwtDecode } from 'jwt-decode'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    // Initial auth check
    const valid = isAuthenticated()
    if (!valid) {
      router.replace('/login?reason=session_expired')
      return
    }
    setChecked(true)

    // Schedule automatic logout exactly when the JWT expires
    const token = Cookies.get('auth_token')
    if (!token) return

    try {
      const { exp } = jwtDecode<{ exp: number }>(token)
      const msUntilExpiry = exp * 1000 - Date.now()

      if (msUntilExpiry <= 0) {
        clearAuthSession()
        router.replace('/login?reason=session_expired')
        return
      }

      const timer = setTimeout(() => {
        clearAuthSession()
        router.replace('/login?reason=session_expired')
      }, msUntilExpiry)

      return () => clearTimeout(timer)
    } catch {
      // Malformed token — clear and redirect
      clearAuthSession()
      router.replace('/login?reason=session_expired')
    }
  }, [router])

  if (!checked) return null

  return <>{children}</>
}

