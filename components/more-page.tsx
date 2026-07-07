'use client'

import { motion } from 'framer-motion'
import {
  Baby,
  FileText,
  Ruler,
  Syringe,
  ListChecks,
  Trophy,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import { PageHeader } from './page-header'
import { AppIcon } from './app-icon'

export type SubPage =
  | 'notes'
  | 'growth'
  | 'immunizations'
  | 'development'
  | 'profile'
  | 'milestones'
  | 'settings'

interface MorePageProps {
  onNavigate: (page: SubPage) => void
}

const MENU_ITEMS: {
  id: SubPage
  icon: LucideIcon
  label: string
  desc: string
}[] = [
  { id: 'profile', icon: Baby, label: 'Profile', desc: 'Nama, lahir, foto' },
  { id: 'notes', icon: FileText, label: 'Notes', desc: 'Tummy time, dll' },
  { id: 'growth', icon: Ruler, label: 'Pertumbuhan', desc: 'Berat, panjang, grafik KMS' },
  { id: 'immunizations', icon: Syringe, label: 'Imunisasi', desc: 'Jadwal vaksin' },
  { id: 'development', icon: ListChecks, label: 'Perkembangan', desc: 'Checklist skill' },
  { id: 'milestones', icon: Trophy, label: 'Milestone', desc: 'Pencapaian bayi' },
  { id: 'settings', icon: Settings, label: 'Settings', desc: 'Notifikasi & export' },
]

export function MorePage({ onNavigate }: MorePageProps) {
  return (
    <div className="px-4 pt-6 pb-8">
      <PageHeader title="More" subtitle="Profile, notes, pertumbuhan & lainnya" />

      <div className="grid grid-cols-2 gap-3">
        {MENU_ITEMS.map((item, i) => (
          <motion.button
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onNavigate(item.id)}
            className="rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-colors hover:bg-secondary/50"
          >
            <AppIcon icon={item.icon} size={26} className="text-primary" />
            <p className="font-heading mt-2 text-[15px] font-semibold text-foreground">
              {item.label}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{item.desc}</p>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
