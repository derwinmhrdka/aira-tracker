'use client'

import { motion } from 'framer-motion'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/lib/theme-context'
import { playSoundEffect } from '@/lib/sounds'
import { AppIcon } from './app-icon'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  const handleToggle = () => {
    toggleTheme()
    playSoundEffect('click')
  }

  return (
    <motion.button
      onClick={handleToggle}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground transition-colors active:scale-95"
      whileTap={{ scale: 0.92 }}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <AppIcon
        icon={theme === 'light' ? Moon : Sun}
        size={20}
        strokeWidth={1.75}
      />
    </motion.button>
  )
}
