'use client'

import { motion } from 'framer-motion'
import {
  House,
  Clock3,
  ChartColumn,
  Ellipsis,
  Plus,
  type LucideIcon,
} from 'lucide-react'
import type { MainPage } from '@/lib/navigation'
import { AppIcon } from './app-icon'

interface BottomNavProps {
  currentPage: MainPage
  onPageChange: (page: MainPage) => void
  quickOpen?: boolean
  onQuickToggle?: () => void
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

function NavButton({
  item,
  active,
  onClick,
}: {
  item: (typeof navItems)[number]
  active: boolean
  onClick: () => void
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      className={`flex min-w-[58px] flex-col items-center gap-0.5 rounded-lg px-1.5 py-1.5 transition-colors ${
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
}

export function BottomNav({
  currentPage,
  onPageChange,
  quickOpen = false,
  onQuickToggle,
}: BottomNavProps) {
  const left = navItems.slice(0, 2)
  const right = navItems.slice(2)
  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card shadow-xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="mx-auto flex max-w-screen-sm items-end justify-around px-2 py-2">
        {left.map((item) => (
          <NavButton key={item.id} item={item} active={currentPage === item.id} onClick={() => onPageChange(item.id)} />
        ))}
        <button
          type="button"
          aria-label={quickOpen ? 'Tutup aksi cepat' : 'Aksi cepat'}
          aria-expanded={quickOpen}
          onClick={onQuickToggle}
          className="mb-1 flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
        >
          <Plus className={`size-7 transition-transform ${quickOpen ? 'rotate-45' : ''}`} strokeWidth={2.25} />
        </button>
        {right.map((item) => (
          <NavButton key={item.id} item={item} active={currentPage === item.id} onClick={() => onPageChange(item.id)} />
        ))}
      </div>
    </motion.nav>
  )
}
