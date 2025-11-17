'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [darkMode, setDarkMode] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    // Check system preference or saved preference
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldBeDark = savedTheme ? savedTheme === 'dark' : prefersDark
    setDarkMode(shouldBeDark)
    if (shouldBeDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  const toggleDarkMode = () => {
    const newMode = !darkMode
    setDarkMode(newMode)
    localStorage.setItem('theme', newMode ? 'dark' : 'light')
    if (newMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  const handleGoogleLogin = async () => {
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setError(error.message)
    }
  }

  return (
    <div className={`min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 ${
      darkMode ? 'bg-[#0D0D0D]' : 'bg-[#f6f6f6]'
    }`}>
      {/* Dark Mode Toggle */}
      <button
        onClick={toggleDarkMode}
        className={`fixed top-4 right-4 p-2 rounded-full transition-colors ${
          darkMode 
            ? 'bg-[#1A1A1A] text-white hover:bg-[#262626] border border-[#262626]' 
            : 'bg-[#ececec] text-black hover:bg-[#d0d0d0]'
        }`}
        aria-label="Toggle dark mode"
      >
        {darkMode ? '☀️' : '🌙'}
      </button>

      <div className={`max-w-md w-full rounded-2xl shadow-xl p-8 ${
        darkMode ? 'bg-[#1A1A1A] border border-[#262626]' : 'bg-[#ffffff] border-2 border-[#d0d0d0]'
      }`}>
        <div className="space-y-8">
          {/* Logo and Title */}
          <div className="text-center">
            <div className="mx-auto w-16 h-16 mb-4 flex items-center justify-center">
              {!imageError ? (
                <img 
                  src={darkMode ? "/PROXE Icon.svg" : "/PROXE Icon Black.svg"}
                  alt="PROXe HQ" 
                  className="w-full h-full object-contain"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 ${
                  darkMode ? 'bg-[#0D0D0D] border-[#262626]' : 'bg-gray-900 border-gray-700'
                }`}>
                  <span className="text-2xl font-bold text-white">P</span>
                </div>
              )}
            </div>
            <h2 className={`text-3xl font-normal font-exo-2 ${
              darkMode ? 'text-white' : 'text-black'
            }`}>
              Sign in
            </h2>
            <p className={`mt-2 text-sm font-zen-dots ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              PROXe HQ
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className={`rounded-lg p-4 border ${
              darkMode ? 'bg-[#0D0D0D] border-[#262626]' : 'bg-[#f6f6f6] border-[#d0d0d0]'
            }`}>
              <div className={`text-sm ${
                darkMode ? 'text-gray-300' : 'text-gray-800'
              }`}>{error}</div>
            </div>
          )}

          {/* Login Form */}
          <form className="space-y-5" onSubmit={handleLogin}>
            {/* Email Field */}
            <div>
              <label htmlFor="email" className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 transition-colors ${
                  darkMode
                    ? 'bg-[#0D0D0D] border-[#262626] text-white placeholder-gray-500 focus:ring-[#333333] focus:border-[#333333]'
                    : 'bg-[#ffffff] border-[#d0d0d0] text-black placeholder-gray-500 focus:ring-[#d0d0d0] focus:border-[#d0d0d0]'
                }`}
                placeholder="demo@test.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className={`w-full px-4 py-3 pr-12 rounded-lg border focus:outline-none focus:ring-2 transition-colors ${
                    darkMode
                      ? 'bg-[#0D0D0D] border-[#262626] text-white placeholder-gray-500 focus:ring-[#333333] focus:border-[#333333]'
                      : 'bg-[#ffffff] border-[#d0d0d0] text-black placeholder-gray-500 focus:ring-[#d0d0d0] focus:border-[#d0d0d0]'
                  }`}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${
                    darkMode ? 'text-gray-500 hover:text-gray-400' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 ${
                darkMode
                  ? 'bg-white text-black hover:bg-gray-100 focus:ring-gray-700'
                  : 'bg-black text-white hover:bg-gray-900 focus:ring-gray-400'
              }`}
            >
              {loading ? 'Signing in...' : 'Log in'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className={`w-full border-t ${
                darkMode ? 'border-[#262626]' : 'border-[#d0d0d0]'
              }`}></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className={`px-2 ${
                darkMode ? 'bg-[#1A1A1A] text-gray-500' : 'bg-[#ffffff] text-gray-500'
              }`}>
                Or continue with
              </span>
            </div>
          </div>

          {/* Google Login Button */}
          <button
            onClick={handleGoogleLogin}
            className={`w-full py-3 px-4 rounded-lg border font-medium transition-colors flex items-center justify-center gap-3 ${
              darkMode
                ? 'bg-[#0D0D0D] border-[#262626] text-white hover:bg-[#1A1A1A]'
                : 'bg-[#ffffff] border-[#d0d0d0] text-black hover:bg-[#f6f6f6]'
            }`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          {/* Access Info */}
          <div className="text-center">
            <p className={`text-xs font-exo-2 ${
              darkMode ? 'text-gray-500' : 'text-gray-500'
            }`}>
              New? Deploy{' '}
              <a
                href="https://goproxe.com"
                target="_blank"
                rel="noopener noreferrer"
                className={`hover:underline ${
                  darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-black'
                }`}
              >
                PROXe
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

