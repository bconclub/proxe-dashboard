'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

const ACCENT_THEMES = [
  { id: 'proxe', name: 'PROXe Purple', color: '#8B5CF6', darkColor: '#8B5CF6' },
  { id: 'gold', name: 'Electric Lime', color: '#afd510', darkColor: '#afd510' },
  { id: 'orange', name: 'Sunset Orange', color: '#fc7301', darkColor: '#fc7301' },
  { id: 'grey', name: 'Neutral Grey', color: '#6B7280', darkColor: '#9CA3AF' },
];

export default function SettingsPage() {
  const [selectedTheme, setSelectedTheme] = useState('proxe');
  const [saved, setSaved] = useState(false);

  // Load saved theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('proxe-accent-theme');
    if (savedTheme) {
      setSelectedTheme(savedTheme);
      applyTheme(savedTheme);
    }
  }, []);

  // Apply theme to CSS variables
  function applyTheme(themeId: string) {
    const theme = ACCENT_THEMES.find(t => t.id === themeId);
    if (theme) {
      document.documentElement.style.setProperty('--accent-primary', theme.color);
      document.documentElement.style.setProperty('--accent-light', theme.color);
      document.documentElement.style.setProperty('--accent-subtle', `${theme.color}20`);
    }
  }

  // Handle theme selection
  function handleThemeSelect(themeId: string) {
    setSelectedTheme(themeId);
    applyTheme(themeId);
    localStorage.setItem('proxe-accent-theme', themeId);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl">
        <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
          Settings
        </h1>

        {/* Theme Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Theme
          </h2>
          
          <div className="p-6 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
            <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--text-secondary)' }}>
              Accent Color
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {ACCENT_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => handleThemeSelect(theme.id)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedTheme === theme.id ? 'border-current' : 'border-transparent'
                  }`}
                  style={{
                    background: 'var(--bg-tertiary)',
                    borderColor: selectedTheme === theme.id ? theme.color : 'transparent',
                  }}
                >
                  {/* Color Preview Circle */}
                  <div
                    className="w-12 h-12 rounded-full mx-auto mb-3"
                    style={{ background: theme.color }}
                  />
                  
                  {/* Theme Name */}
                  <p 
                    className="text-sm font-medium text-center"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {theme.name}
                  </p>
                  
                  {/* Color Code */}
                  <p 
                    className="text-xs text-center mt-1"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {theme.color}
                  </p>
                  
                  {/* Selected Indicator */}
                  {selectedTheme === theme.id && (
                    <div 
                      className="mt-2 text-xs text-center font-medium"
                      style={{ color: theme.color }}
                    >
                      ✓ Active
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Saved Notification */}
            {saved && (
              <div 
                className="mt-4 p-3 rounded-lg text-sm text-center"
                style={{ background: 'var(--accent-subtle)', color: 'var(--accent-primary)' }}
              >
                Theme saved successfully!
              </div>
            )}
          </div>
        </div>

        {/* Preview Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Preview
          </h2>
          
          <div className="p-6 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
            <div className="flex flex-wrap gap-4">
              {/* Button Preview */}
              <button
                className="px-4 py-2 rounded-lg font-medium text-white"
                style={{ background: 'var(--accent-primary)' }}
              >
                Primary Button
              </button>
              
              {/* Secondary Button Preview */}
              <button
                className="px-4 py-2 rounded-lg font-medium border"
                style={{ 
                  borderColor: 'var(--accent-primary)', 
                  color: 'var(--accent-primary)',
                  background: 'transparent'
                }}
              >
                Secondary Button
              </button>
              
              {/* Badge Preview */}
              <span
                className="px-3 py-1 rounded-full text-sm font-medium"
                style={{ 
                  background: 'var(--accent-subtle)', 
                  color: 'var(--accent-primary)' 
                }}
              >
                Badge
              </span>
              
              {/* Link Preview */}
              <a
                href="#"
                className="font-medium hover:underline"
                style={{ color: 'var(--accent-primary)' }}
              >
                Link Text
              </a>
            </div>
            
            {/* Card Preview */}
            <div 
              className="mt-4 p-4 rounded-lg border-l-4"
              style={{ 
                background: 'var(--bg-tertiary)', 
                borderColor: 'var(--accent-primary)' 
              }}
            >
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                This is how accent colors appear in cards and highlights.
              </p>
            </div>
          </div>
        </div>

        {/* Other Settings Placeholder */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Other Settings
          </h2>
          
          <div className="p-6 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              More settings coming soon...
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
