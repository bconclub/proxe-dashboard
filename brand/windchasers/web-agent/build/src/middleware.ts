import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const origin = request.headers.get('origin') || request.headers.get('referer')
  const isLocalhost = origin?.includes('localhost') || origin?.includes('127.0.0.1')
  const isDev = process.env.NODE_ENV !== 'production'
  
  // Add CORS headers for widget page and API routes
  if (request.nextUrl.pathname === '/widget' || request.nextUrl.pathname.startsWith('/api/')) {
    // In development, allow the requesting origin (for localhost)
    // In production, allow all origins
    if (isDev && origin) {
      response.headers.set('Access-Control-Allow-Origin', origin)
    } else {
      response.headers.set('Access-Control-Allow-Origin', '*')
    }
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    
    // Handle OPTIONS preflight
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers: response.headers })
    }
  }
  
  // For widget page, remove or relax CSP in development
  // CSP frame-ancestors doesn't support wildcards, so we need to either:
  // 1. Remove it in dev (less secure but works)
  // 2. List specific localhost ports (not practical)
  // 3. Use a different approach
  if (request.nextUrl.pathname === '/widget') {
    if (isDev) {
      // Remove CSP restriction in development to allow any localhost origin
      // This is safe because it's only in development
      response.headers.delete('Content-Security-Policy')
      // Also remove X-Frame-Options to allow iframe embedding from any localhost
      response.headers.delete('X-Frame-Options')
    }
  }
  
  return response
}

export const config = {
  matcher: ['/widget', '/api/:path*'],
}
