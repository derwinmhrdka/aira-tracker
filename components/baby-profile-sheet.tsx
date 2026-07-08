'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api, type BabyProfile } from '@/lib/api-client'
import { formatAge } from '@/lib/baby-utils'

const SHIO_EMOJI: Record<string, string> = {
  Tikus: '🐭',
  Kerbau: '🐂',
  Harimau: '🐯',
  Kelinci: '🐰',
  Naga: '🐉',
  Ular: '🐍',
  Kuda: '🐴',
  Kambing: '🐐',
  Monyet: '🐒',
  Ayam: '🐓',
  Anjing: '🐕',
  Babi: '🐷',
}

const ELEMENT_EMOJI: Record<string, string> = {
  Kayu: '🌳',
  Api: '🔥',
  Tanah: '🪨',
  Logam: '⚙️',
  Air: '💧',
}

interface BabyProfileSheetProps {
  open: boolean
  onClose: () => void
}

function ProfileTile({
  icon,
  label,
  value,
  className = '',
}: {
  icon: string
  label: string
  value: string
  className?: string
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl bg-secondary/60 px-2 py-3 text-center ${className}`}
    >
      <span className="text-2xl leading-none">{icon}</span>
      <span className="mt-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="mt-0.5 text-xs font-semibold text-foreground">{value}</span>
    </div>
  )
}

function formatBirthDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function BabyProfileSheet({ open, onClose }: BabyProfileSheetProps) {
  const [profile, setProfile] = useState<BabyProfile | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    api
      .getBabyProfile()
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false))
  }, [open])

  const tiles: { icon: string; label: string; value: string; className?: string }[] = []

  if (profile) {
    tiles.push({
      icon: profile.gender === 'FEMALE' ? '👧' : '👦',
      label: 'Gender',
      value: profile.gender === 'FEMALE' ? 'Wanita' : 'Laki',
    })
    tiles.push({
      icon: '📅',
      label: 'Lahir',
      value: formatBirthDate(profile.birth_date),
    })
    const weightKg = profile.latest_weight_kg ?? profile.birth_weight_kg
    if (weightKg != null) {
      tiles.push({
        icon: '⚖️',
        label: 'Berat',
        value: `${weightKg} kg`,
      })
    }
    const heightCm = profile.latest_height_cm ?? profile.birth_height_cm
    if (heightCm != null) {
      tiles.push({
        icon: '📏',
        label: 'Panjang',
        value: `${heightCm} cm`,
      })
    }
    if (profile.blood_type) {
      tiles.push({
        icon: '🩸',
        label: 'Darah',
        value: profile.blood_type,
      })
    }
    if (profile.horoscope) {
      tiles.push({
        icon: profile.horoscope_emoji ?? '✨',
        label: 'Zodiak',
        value: profile.horoscope,
      })
    }
    if (profile.shio_animal) {
      tiles.push({
        icon: SHIO_EMOJI[profile.shio_animal] ?? '🐾',
        label: 'Shio',
        value: profile.shio_animal,
      })
    }
    if (profile.shio_element) {
      tiles.push({
        icon: ELEMENT_EMOJI[profile.shio_element] ?? '☯️',
        label: 'Elemen',
        value: profile.shio_element,
      })
    }
    if (profile.parent_names) {
      tiles.push({
        icon: '👨‍👩‍👧',
        label: 'Ortu',
        value: profile.parent_names,
        className: 'col-span-2',
      })
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-border bg-card p-4 pb-8 shadow-2xl"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted" />

            {loading ? (
              <div className="space-y-3">
                <div className="mx-auto h-20 w-20 animate-pulse rounded-full bg-secondary" />
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-20 animate-pulse rounded-2xl bg-secondary" />
                  ))}
                </div>
              </div>
            ) : profile ? (
              <>
                <div className="mb-4 flex flex-col items-center text-center">
                  {profile.photo_url ? (
                    <img
                      src={profile.photo_url}
                      alt={profile.name}
                      className="h-20 w-20 rounded-full object-cover ring-4 ring-primary/25"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary text-4xl">
                      👶
                    </div>
                  )}
                  <h2 className="font-heading mt-3 text-xl font-bold text-foreground">
                    {profile.name}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {formatAge(profile.birth_date)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {tiles.map((tile) => (
                    <ProfileTile key={`${tile.label}-${tile.value}`} {...tile} />
                  ))}
                </div>
              </>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Gagal memuat profil
              </p>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
