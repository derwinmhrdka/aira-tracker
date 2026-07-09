'use client'

import { useState } from 'react'
import {
  Baby,
  FileText,
  Syringe,
  ListChecks,
  Trophy,
  CalendarDays,
  Settings,
  Heart,
  Images,
  type LucideIcon,
} from 'lucide-react'
import { PageHeader } from './page-header'
import { AppIcon } from './app-icon'
import { AboutSheet } from './about-sheet'
import type { SubPage } from '@/lib/navigation'

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
    id: 'gallery',
    icon: Images,
    label: 'Gallery',
    desc: 'Foto & audio catatan',
    color: 'bg-fuchsia-100 border-fuchsia-200/80 dark:bg-fuchsia-950/60 dark:border-fuchsia-800/60',
    iconColor: 'text-fuchsia-600 dark:text-fuchsia-300',
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
    id: 'events',
    icon: CalendarDays,
    label: 'Event',
    desc: 'Jadwal & pertemuan',
    color: 'bg-indigo-100 border-indigo-200/80 dark:bg-indigo-950/60 dark:border-indigo-800/60',
    iconColor: 'text-indigo-600 dark:text-indigo-300',
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
  const [aboutOpen, setAboutOpen] = useState(false)

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
        <button
          type="button"
          onClick={() => setAboutOpen(true)}
          className="rounded-2xl border border-pink-200/80 bg-pink-100 p-4 text-left shadow-sm transition-opacity hover:opacity-90 active:scale-[0.98] dark:border-pink-800/60 dark:bg-pink-950/60"
        >
          <AppIcon icon={Heart} size={26} className="text-pink-600 dark:text-pink-300" />
          <p className="font-heading mt-2 text-[15px] font-semibold text-foreground">About</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Tentang app</p>
        </button>
      </div>

      <AboutSheet open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  )
}
