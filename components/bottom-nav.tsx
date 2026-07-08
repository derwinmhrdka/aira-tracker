'use client'

import { motion } from 'framer-motion'
import {
  House,
  Clock3,
  ChartColumn,
  Ellipsis,
  type LucideIcon,
} from 'lucide-react'
import type { MainPage } from '@/lib/navigation'
import { AppIcon } from './app-icon'

interface BottomNavProps {
  currentPage: MainPage
  onPageChange: (page: MainPage) => void
}

const navItems: Array<{
  id: MainPage
  label: string
  icon: LucideIcon
}> = [
  { id: 'home', label: 'Beranda', icon: House },
  { id: 'history', label: 'Riwayat', icon: Clock3 },
  { id: 'stats', label: 'Statistik', icon: ChartColumn },
  { id: 'more', label: 'Lainnya', icon: Ellipsis },
]

export function BottomNav({ currentPage, onPageChange }: BottomNavProps) {
  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 border-t border-border bg-card shadow-xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="mx-auto flex max-w-screen-sm justify-around px-2 py-2">
        {navItems.map((item) => {
          const active = currentPage === item.id
          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.92 }}
              onClick={() => onPageChange(item.id)}
              className={`flex min-w-[64px] flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 transition-colors ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <AppIcon
                icon={item.icon}
                size={active ? 24 : 22}
                strokeWidth={active ? 2.25 : 1.75}
                className={active ? 'text-primary' : 'text-muted-foreground'}
              />
              <span className="text-[10px] font-medium">{item.label}</span>
            </motion.button>
          )
        })}
      </div>
    </motion.nav>
  )
}
