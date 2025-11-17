'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { 
  MdDashboard,
  MdPeople,
  MdCalendarToday,
  MdAnalytics,
  MdLanguage,
  MdWhatsapp,
  MdPhone,
  MdVideoLibrary,
  MdSettings,
  MdMenu,
  MdClose,
  MdApps,
  MdChevronRight,
  MdExpandMore,
} from 'react-icons/md'

interface DashboardLayoutProps {
  children: React.ReactNode
}

interface NavItem {
  name: string
  href?: string
  icon: React.ComponentType<{ className?: string }>
  children?: NavItem[]
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: MdDashboard },
  { name: 'Leads', href: '/dashboard/leads', icon: MdPeople },
  { name: 'Bookings', href: '/dashboard/bookings', icon: MdCalendarToday },
  { name: 'Metrics', href: '/dashboard/metrics', icon: MdAnalytics },
  { name: 'Channels', icon: MdApps, children: [
    { name: 'Web PROXe', href: '/dashboard/channels/web', icon: MdLanguage },
    { name: 'WhatsApp PROXe', href: '/dashboard/channels/whatsapp', icon: MdWhatsapp },
    { name: 'Voice PROXe', href: '/dashboard/channels/voice', icon: MdPhone },
    { name: 'Social PROXe', href: '/dashboard/channels/social', icon: MdVideoLibrary },
  ]},
  { name: 'Settings', href: '/dashboard/settings', icon: MdSettings },
]

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set())


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

  useEffect(() => {
    // Auto-expand menu if a child is active
    navigation.forEach((item) => {
      if (item.children) {
        const isChildActive = item.children.some((child) => pathname === child.href)
        if (isChildActive) {
          setExpandedMenus((prev) => new Set(prev).add(item.name))
        }
      }
    })
  }, [pathname])

  const toggleMenu = (menuName: string) => {
    setExpandedMenus((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(menuName)) {
        newSet.delete(menuName)
      } else {
        newSet.add(menuName)
      }
      return newSet
    })
  }

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

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0D0D0D]">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300 ease-in-out',
        'bg-white dark:bg-[#1A1A1A] border-r border-gray-200 dark:border-[#262626]',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between flex-shrink-0 px-4 py-4 border-b border-gray-200 dark:border-[#262626]">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">PROXe HQ</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#262626]"
              aria-label="Close sidebar"
            >
              <MdClose className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <nav className="mt-5 flex-1 px-2 space-y-1">
              {navigation.map((item) => {
                if (item.children) {
                  // Render parent with children
                  const isParentActive = item.children.some((child) => pathname === child.href)
                  const isExpanded = expandedMenus.has(item.name)
                  return (
                    <div key={item.name} className="space-y-1">
                      <button
                        onClick={() => toggleMenu(item.name)}
                        className={cn(
                          'w-full px-2 py-2 text-xs font-semibold uppercase tracking-wider flex items-center justify-between',
                          'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white',
                          'hover:bg-gray-50 dark:hover:bg-[#262626] rounded-md transition-colors'
                        )}
                      >
                        <div className="flex items-center">
                          <item.icon className="mr-2 w-5 h-5 text-gray-600 dark:text-gray-300" />
                          {item.name}
                        </div>
                        {isExpanded ? (
                          <MdExpandMore className="w-4 h-4 transition-transform text-gray-600 dark:text-gray-300" />
                        ) : (
                          <MdChevronRight className="w-4 h-4 transition-transform text-gray-600 dark:text-gray-300" />
                        )}
                      </button>
                      {isExpanded && (
                        <div className="space-y-1">
                          {item.children.map((child) => {
                            if (!child.href) return null
                            const isActive = pathname === child.href
                            return (
                              <Link
                                key={child.name}
                                href={child.href}
                                onClick={() => setSidebarOpen(false)}
                                className={cn(
                                  'group flex items-center px-2 py-2 text-sm font-medium rounded-md ml-4',
                                  isActive
                                    ? 'bg-primary-100 dark:bg-[#262626] text-primary-900 dark:text-white'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#262626] hover:text-gray-900 dark:hover:text-white'
                                )}
                              >
                                <child.icon className="mr-3 w-5 h-5" />
                                {child.name}
                              </Link>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                }
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href!}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'group flex items-center px-2 py-2 text-sm font-medium rounded-md',
                      isActive
                        ? 'bg-primary-100 dark:bg-[#262626] text-primary-900 dark:text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#262626] hover:text-gray-900 dark:hover:text-white'
                    )}
                  >
                    <item.icon className="mr-3 w-5 h-5" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={cn(
        'flex flex-col flex-1 transition-all duration-300',
        sidebarOpen ? 'md:pl-64' : 'md:pl-0'
      )}>
        {/* Top bar */}
        <div className="sticky top-0 z-10 flex-shrink-0 flex h-16 bg-white dark:bg-[#1A1A1A] border-b border-gray-200 dark:border-[#262626] shadow">
          <div className="flex-1 px-4 flex justify-between">
            <div className="flex-1 flex items-center gap-4">
              {/* Menu toggle button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#262626] focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label="Toggle sidebar"
              >
                {sidebarOpen ? <MdClose className="w-6 h-6" /> : <MdMenu className="w-6 h-6" />}
              </button>
              <div className="w-full flex md:ml-0">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white self-center">
                  {navigation.find((item) => item.href === pathname)?.name || 
                   navigation.flatMap((item) => item.children || []).find((child) => child.href === pathname)?.name ||
                   'Dashboard'}
                </h2>
              </div>
            </div>
            <div className="ml-4 flex items-center md:ml-6 gap-3">
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-full transition-colors ${
                  darkMode 
                    ? 'bg-[#0D0D0D] text-white hover:bg-[#262626] border border-[#262626]' 
                    : 'bg-[#ececec] text-black hover:bg-[#d0d0d0]'
                }`}
                aria-label="Toggle dark mode"
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
              <div className="relative ml-3">
                <div>
                  <button
                    type="button"
                    className="bg-white dark:bg-[#0D0D0D] rounded-full flex items-center text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                  >
                    <span className="sr-only">Open user menu</span>
                    <div className="h-8 w-8 rounded-full flex items-center justify-center text-white font-medium" style={{ backgroundColor: '#5B1A8C' }}>
                      U
                    </div>
                  </button>
                </div>
                {userMenuOpen && (
                  <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#262626] ring-1 ring-black dark:ring-[#262626] ring-opacity-5">
                    <button
                      onClick={handleLogout}
                      className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#262626] w-full text-left"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

