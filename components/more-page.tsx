'use client'

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
  color: string
  iconColor: string
}[] = [
  {
    id: 'profile',
    icon: Baby,
    label: 'Profile',
    desc: 'Nama, lahir, foto',
    color: 'bg-rose-100 border-rose-200/80 dark:bg-rose-950/60 dark:border-rose-800/60',
    iconColor: 'text-rose-600 dark:text-rose-300',
  },
  {
    id: 'notes',
    icon: FileText,
    label: 'Notes',
    desc: 'Tummy time, dll',
    color: 'bg-sky-100 border-sky-200/80 dark:bg-sky-950/60 dark:border-sky-800/60',
    iconColor: 'text-sky-600 dark:text-sky-300',
  },
  {
    id: 'growth',
    icon: Ruler,
    label: 'Pertumbuhan',
    desc: 'Berat, panjang, grafik KMS',
    color: 'bg-emerald-100 border-emerald-200/80 dark:bg-emerald-950/60 dark:border-emerald-800/60',
    iconColor: 'text-emerald-600 dark:text-emerald-300',
  },
  {
    id: 'immunizations',
    icon: Syringe,
    label: 'Imunisasi',
    desc: 'Jadwal vaksin',
    color: 'bg-orange-100 border-orange-200/80 dark:bg-orange-950/60 dark:border-orange-800/60',
    iconColor: 'text-orange-600 dark:text-orange-300',
  },
  {
    id: 'development',
    icon: ListChecks,
    label: 'Perkembangan',
    desc: 'Checklist skill',
    color: 'bg-violet-100 border-violet-200/80 dark:bg-violet-950/60 dark:border-violet-800/60',
    iconColor: 'text-violet-600 dark:text-violet-300',
  },
  {
    id: 'milestones',
    icon: Trophy,
    label: 'Milestone',
    desc: 'Pencapaian bayi',
    color: 'bg-amber-100 border-amber-200/80 dark:bg-amber-950/60 dark:border-amber-800/60',
    iconColor: 'text-amber-600 dark:text-amber-300',
  },
  {
    id: 'settings',
    icon: Settings,
    label: 'Settings',
    desc: 'Notifikasi & export',
    color: 'bg-teal-100 border-teal-200/80 dark:bg-teal-950/60 dark:border-teal-800/60',
    iconColor: 'text-teal-600 dark:text-teal-300',
  },
]

export function MorePage({ onNavigate }: MorePageProps) {
  return (
    <div className="px-4 pt-6 pb-8">
      <PageHeader title="More" subtitle="Profile, notes, pertumbuhan & lainnya" />

      <div className="grid grid-cols-2 gap-3">
        {MENU_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
            className={`rounded-2xl border p-4 text-left shadow-sm transition-opacity hover:opacity-90 active:scale-[0.98] ${item.color}`}
          >
            <AppIcon icon={item.icon} size={26} className={item.iconColor} />
            <p className="font-heading mt-2 text-[15px] font-semibold text-foreground">
              {item.label}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{item.desc}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
