import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  // Skip auth check for API routes to prevent loops
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return await updateSession(request)
  }
  
  // Skip auth check for static assets
  if (request.nextUrl.pathname.startsWith('/_next/') || 
      request.nextUrl.pathname.startsWith('/favicon.ico')) {
    return await updateSession(request)
  }
  
  // Skip auth check for auth pages to prevent redirect loops
  if (request.nextUrl.pathname.startsWith('/auth/')) {
    return await updateSession(request)
  }
  
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}


