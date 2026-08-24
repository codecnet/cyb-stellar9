'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { isAuthenticated, setAuthSession } from '@/lib/auth'
import { SignInPage } from '@/components/ui/sign-in'

const BASE_URL = process.env.NEXT_PUBLIC_RBAC_BASE_IP || 'http://localhost:5000/api'

export default function LoginPage() {
  const router = useRouter()

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace('/')
      return
    }
    const params = new URLSearchParams(window.location.search)
    const reason = params.get('reason')
    if (reason) {
      toast(decodeURIComponent(reason), { icon: '⚠️', duration: 5000 })
    }
  }, [router])

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const email = ((formData.get('email') as string) || '').trim()
    const password = (formData.get('password') as string) || ''

    if (!email || !password) {
      toast.error('Email and password are required.')
      return
    }

    const loadingId = toast.loading('Authenticating...')
    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: email, password }),
      })
      const data = await res.json()
      toast.dismiss(loadingId)

      if (res.ok && data?.data?.user && data?.data?.access_token) {
        setAuthSession(data.data.user, data.data.access_token)
        toast.success(data.message || 'Welcome back')
        router.replace('/')
      } else {
        toast.error(data?.message || 'Login failed')
      }
    } catch (err) {
      toast.dismiss(loadingId)
      console.error(err)
      toast.error('Something went wrong. Please try again.')
    }
  }

  return (
    <div className="bg-background text-foreground">
      <SignInPage
        title={
          <span className="block text-center">
            <img
              src="/cyb-logo.png"
              alt="CYB — Check Your Breach by Stellar9"
              className="mx-auto h-24 w-auto"
            />
          </span>
        }
        description={
          <span className="block text-center text-muted-foreground">
            Sign in to your Security Operations Center
          </span>
        }
        heroImageSrc="https://images.unsplash.com/photo-1642615835477-d303d7dc9ee9?w=2160&q=80"
        onSignIn={handleSignIn}
      />
    </div>
  )
}
