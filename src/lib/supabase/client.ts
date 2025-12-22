import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database.types'

// Singleton pattern to prevent multiple client instances
let supabaseClient: ReturnType<typeof createBrowserClient<Database>> | null = null

// Rate limit tracking
let lastRefreshAttempt = 0
let refreshRetryCount = 0
let isRefreshing = false
const MAX_RETRIES = 3
const MIN_RETRY_DELAY = 30000 // 30 seconds
const RATE_LIMIT_COOLDOWN = 600000 // 10 minutes

export function createClient() {
  // Return existing client if already created
  if (supabaseClient) {
    return supabaseClient
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn('⚠️  Supabase environment variables are not set. Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file')
  }
  
  // Check if we're in rate limit cooldown - disable auto-refresh if so
  let shouldAutoRefresh = true
  if (typeof window !== 'undefined') {
    const rateLimitUntil = localStorage.getItem('authRateLimitUntil')
    if (rateLimitUntil && Date.now() < parseInt(rateLimitUntil)) {
      shouldAutoRefresh = false
      console.warn('🚫 Auto-refresh disabled due to rate limit')
    }
  }

  supabaseClient = createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: shouldAutoRefresh, // Disable if rate limited
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        flowType: 'pkce',
      },
      global: {
        // Intercept fetch to handle rate limits and prevent infinite loops
        fetch: async (url, options = {}) => {
          const now = Date.now()
          const urlString = url.toString()
          const isAuthRequest = urlString.includes('/auth/v1/token')
          
          // Check if we're in rate limit cooldown
          if (typeof window !== 'undefined') {
            const rateLimitUntil = localStorage.getItem('authRateLimitUntil')
            if (rateLimitUntil && now < parseInt(rateLimitUntil)) {
              console.warn('🚫 Auth rate limit active, skipping request')
              throw new Error('Rate limit active. Please wait before retrying.')
            }
          }

          // Prevent concurrent refresh attempts
          if (isRefreshing && isAuthRequest) {
            console.warn('🚫 Refresh already in progress, skipping')
            throw new Error('Refresh already in progress')
          }

          // Check minimum delay between refresh attempts
          if (isAuthRequest && lastRefreshAttempt > 0) {
            const timeSinceLastAttempt = now - lastRefreshAttempt
            if (timeSinceLastAttempt < MIN_RETRY_DELAY) {
              console.warn(`🚫 Too soon to refresh (${timeSinceLastAttempt}ms < ${MIN_RETRY_DELAY}ms)`)
              throw new Error('Too soon to refresh token')
            }
          }

          try {
            if (isAuthRequest) {
              isRefreshing = true
              lastRefreshAttempt = now
            }

            const response = await fetch(url, options)

            // Handle rate limit (429) - STOP retrying
            if (response.status === 429) {
              const retryAfter = response.headers.get('retry-after')
              const cooldownUntil = now + (retryAfter ? parseInt(retryAfter) * 1000 : RATE_LIMIT_COOLDOWN)
              if (typeof window !== 'undefined') {
                localStorage.setItem('authRateLimitUntil', cooldownUntil.toString())
              }
              refreshRetryCount = 0
              isRefreshing = false
              console.error('🚫 Rate limited (429), setting cooldown until', new Date(cooldownUntil).toISOString())
              throw new Error('Rate limit reached. Please wait before retrying.')
            }

            // Handle bad request (400) - invalid session, clear it
            if (response.status === 400 && isAuthRequest) {
              refreshRetryCount = 0
              isRefreshing = false
              // Clear invalid session
              if (typeof window !== 'undefined') {
                const projectRef = supabaseUrl.split('//')[1].split('.')[0]
                localStorage.removeItem(`sb-${projectRef}-auth-token`)
                sessionStorage.clear()
              }
              console.error('🚫 Bad request (400), cleared invalid session')
              throw new Error('Invalid session. Please log in again.')
            }

            // Reset retry count on success
            if (response.ok && isAuthRequest) {
              refreshRetryCount = 0
            }

            isRefreshing = false
            return response
          } catch (error) {
            isRefreshing = false
            
            // Increment retry count on error
            if (isAuthRequest) {
              refreshRetryCount++
              if (refreshRetryCount >= MAX_RETRIES) {
                console.error(`🚫 Max retries (${MAX_RETRIES}) reached, stopping refresh attempts`)
                refreshRetryCount = 0
                throw new Error('Max retry attempts reached. Please log in again.')
              }
            }

            throw error
          }
        },
      },
    }
  )
  
  return supabaseClient
}

