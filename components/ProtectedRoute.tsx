'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/login')
        return
      }
      
      setAuthenticated(true)
      setLoading(false)
    }

    checkAuth()
  }, [router])

  if (loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>
  }

  return authenticated ? <>{children}</> : null
}