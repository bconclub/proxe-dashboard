'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'

export default function PageTransitionLoader() {
  const [isLoading, setIsLoading] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    // Show loader when pathname changes
    setIsLoading(true)
    
    // Hide loader after a short delay (simulating page load)
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [pathname])

  if (!isLoading) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      }}
    >
      <div className="flex flex-col items-center">
        {/* PROXe Icon with Animation */}
        <div className="relative">
          {/* Pulse effect with transparent accent color */}
          <div
            className="absolute inset-0 rounded-full animate-ping opacity-30"
            style={{
              backgroundColor: 'var(--accent-primary)',
              width: '100px',
              height: '100px',
              margin: '-10px',
            }}
          />
          <div className="relative animate-pulse">
            <Image
              src="/PROXE Icon.svg"
              alt="PROXe"
              width={80}
              height={80}
              className="drop-shadow-lg"
              priority
            />
          </div>
        </div>
      </div>
    </div>
  )
}

