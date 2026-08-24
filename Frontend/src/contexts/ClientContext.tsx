'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import Cookies from 'js-cookie'
import { getUserFromCookies } from '@/lib/auth'
import { organisationsApi, usersApi } from '@/lib/api'

interface Client {
  id: string
  name: string
  organisation_name?: string
  description?: string
  wazuhHost?: string
  status: 'active' | 'inactive'
  lastSeen?: string
}

interface ClientContextType {
  selectedClient: Client | null
  setSelectedClient: (client: Client | null) => void
  isClientMode: boolean
  clients: Client[]
  setClients: (clients: Client[]) => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

const ClientContext = createContext<ClientContextType | undefined>(undefined)

export function ClientProvider({ children }: { children: React.ReactNode }) {
  const [selectedClient, setSelectedClientState] = useState<Client | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isClientMode, setIsClientMode] = useState<boolean>(false)
  const [authToken, setAuthToken] = useState<string | null>(null)

  // Wrapper function to persist selected client
  const setSelectedClient = (client: Client | null) => {
    setSelectedClientState(client)
    if (typeof window !== 'undefined') {
      if (client) {
        localStorage.setItem('selectedClient', JSON.stringify(client))
      } else {
        localStorage.removeItem('selectedClient')
      }
    }
  }

  // Watch for auth token changes (for initial login)
  useEffect(() => {
    const checkAuth = () => {
      if (typeof window !== 'undefined') {
        const token = Cookies.get('auth_token')
        setAuthToken(token || null)
      }
    }

    // Check immediately
    checkAuth()

    // Poll for auth changes (in case of login)
    const interval = setInterval(checkAuth, 500)

    // Cleanup
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    console.log('🟡 ClientContext useEffect triggered')
    console.log('🔍 Auth token state:', authToken ? 'Present' : 'Missing')

    const user = getUserFromCookies()
    console.log('🔍 ClientContext debug - user from cookies:', user)
    console.log('🔍 ClientContext debug - typeof user:', typeof user)
    console.log('🔍 ClientContext debug - user keys:', user ? Object.keys(user) : 'null')

    if (!user) {
      console.warn('⚠️ No user found in cookies')
      return
    }

    if (!user.role) {
      console.warn('⚠️ User has no role')
      console.log('🔍 User object structure:', JSON.stringify(user, null, 2))
      return
    }

    console.log('🔍 User role:', user.role)
    console.log('🔍 User permissions:', user.permissions)
    console.log('🔍 User organisation_id:', user.organisation_id)
    console.log('🔍 User user_type:', user.user_type)

    if (user?.role) {
      // FLOW 1: Check if user has organisation_id - auto-set selectedClient
      // FLOW 2: No organisation_id but has overview:read - manual selection from overview page

      // Check both user.organisation (from user_info) and user.organisation_id (from JWT)
      const orgId = (user as any).organisation?.id || user.organisation_id
      const hasOverviewPermission = user.permissions?.overview?.read

      console.log('🔍 ClientContext debug - orgId:', orgId)
      console.log('🔍 ClientContext debug - hasOverviewPermission:', hasOverviewPermission)

      // FLOW 1: User has associated organisation → Auto-set selectedClient
      if (orgId) {
        console.log('🟢 FLOW 1: User has organisation - auto-setting selectedClient')
        console.log('🔵 organisation:', (user as any).organisation)
        console.log('🔵 organisation_id:', user.organisation_id)
        console.log('🔵 user_type:', user.user_type)

        // A user pinned to a single organisation is never in client-selection mode,
        // regardless of overview permission. Leaving this true traps them on the
        // minimal "Client Overview" sidebar, because selectedClient can never be
        // populated without the organisation:read permission.
        setIsClientMode(false)

        console.log('🚀 Calling fetchClientOrganization with:', orgId)
        fetchClientOrganization(orgId)
      }
      // FLOW 2: User has no organisation but has overview permission → Manual selection
      else if (hasOverviewPermission) {
        console.log('🟡 FLOW 2: User has no organisation but has overview permission - manual selection required')
        setIsClientMode(true)

        // Try to restore selected client from localStorage
        if (typeof window !== 'undefined') {
          const savedClient = localStorage.getItem('selectedClient')
          console.log('🔍 Saved client from localStorage:', savedClient)
          if (savedClient) {
            try {
              const parsedClient = JSON.parse(savedClient)
              console.log('🔍 Parsed saved client:', parsedClient)
              setSelectedClientState(parsedClient)
            } catch (error) {
              console.error('Failed to parse saved client:', error)
              localStorage.removeItem('selectedClient')
            }
          }
        }
      }
      // Edge case: No organisation and no overview permission
      else {
        console.log('⚠️ User has no organisation and no overview permission')
        if (user.user_type === 'external') {
          // External users MUST have an organization
          console.error('❌ External user without organisation_id - this should not happen!')
          console.log('🔍 Complete user object:', JSON.stringify(user, null, 2))
        } else {
          // Internal users without organization and without overview permission
          console.log('✅ Internal user without organization (valid for some roles)')
        }
        setIsClientMode(false)
      }
    }
  }, [authToken]) // Re-run when auth token changes (for initial login)

  // Function to fetch client's organization details
  // Fallback for users pinned to a single organisation (e.g. the Client role) who
  // lack the organisation:read permission that GET /organisations/:id requires.
  // GET /users/me is open to any authenticated user and returns only the caller's
  // own organisation id/name - no Wazuh credentials.
  const setClientFromCurrentUser = async (orgId: string): Promise<boolean> => {
    try {
      const me: any = await usersApi.getMe()
      const org = me?.data?.organisation
      if (org) {
        setSelectedClient({
          id: org.id || orgId,
          name: org.client_name || org.name || 'Current Client',
          status: 'active',
        })
        console.log('[FALLBACK] Organisation loaded from /users/me')
        return true
      }
      console.warn('[FALLBACK] /users/me returned no organisation')
    } catch (e) {
      console.error('[FALLBACK] /users/me failed:', e)
    }
    return false
  }

  const fetchClientOrganization = async (orgId: string) => {
    try {
      console.log(`🚀 [FETCH START] Fetching organization details for client user: ${orgId}`)
      console.log(`🚀 [FETCH START] orgId type: ${typeof orgId}`)
      console.log(`🚀 [FETCH START] orgId value: ${JSON.stringify(orgId)}`)

      setIsLoading(true)
      const response = await organisationsApi.getOrganisationById(orgId)

      console.log('📡 [API RESPONSE] Full response:', response)
      console.log('📡 [API RESPONSE] Response type:', typeof response)
      console.log('📡 [API RESPONSE] Response keys:', response ? Object.keys(response) : 'null')

      if (response && response.success && response.data) {
        const org = response.data
        console.log('✅ [ORG DATA] Organization data received:', org)
        console.log('✅ [ORG DATA] org._id:', org._id)
        console.log('✅ [ORG DATA] org.client_name:', org.client_name)
        console.log('✅ [ORG DATA] org.organisation_name:', org.organisation_name)
        console.log('✅ [ORG DATA] org.status:', org.status)

        const userClient: Client = {
          id: org._id || orgId,
          name: org.client_name || org.organisation_name || 'Current Client',
          description: org.organisation_name !== org.client_name ? org.organisation_name : org.industry,
          status: org.status === 'active' ? 'active' : 'inactive'
        }

        console.log('🎯 [CLIENT CREATION] Created client object:', userClient)
        setSelectedClient(userClient)
        console.log(`✅ [SUCCESS] Client organization loaded: ${userClient.name}`)
      } else {
        console.warn('[API] Org endpoint returned no data - falling back to /users/me')
        await setClientFromCurrentUser(orgId)
      }
    } catch (error) {
      console.error('❌ [ERROR] Failed to fetch client organization:', error)
      console.error('❌ [ERROR] Error details:', {
        message: (error as Error).message,
        stack: (error as Error).stack,
        name: (error as Error).name
      })
      console.log('[API] Org endpoint failed - falling back to /users/me')
      await setClientFromCurrentUser(orgId)
    } finally {
      setIsLoading(false)
      console.log('🏁 [FETCH END] fetchClientOrganization completed')
    }
  }

  // Clear selected client when logging out or switching users
  useEffect(() => {
    const user = getUserFromCookies()
    if (!user) {
      setSelectedClient(null)
      setClients([])
      setIsClientMode(false)
    }
  }, [])

  const contextValue: ClientContextType = {
    selectedClient,
    setSelectedClient,
    isClientMode,
    clients,
    setClients,
    isLoading,
    setIsLoading
  }

  return (
    <ClientContext.Provider value={contextValue}>
      {children}
    </ClientContext.Provider>
  )
}

export function useClient() {
  const context = useContext(ClientContext)
  if (context === undefined) {
    throw new Error('useClient must be used within a ClientProvider')
  }
  return context
}