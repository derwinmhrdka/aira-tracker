'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api-client'

interface OnboardingSheetProps {
  open: boolean
  onComplete: () => void
}

export function OnboardingSheet({ open, onComplete }: OnboardingSheetProps) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [gender, setGender] = useState<'MALE' | 'FEMALE'>('MALE')
  const [weight, setWeight] = useState('3.0')
  const [height, setHeight] = useState('50')
  const [saving, setSaving] = useState(false)

  const handleFinish = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await api.updateBabyProfile({
        name: name.trim(),
        birth_date: birthDate,
        birth_weight_kg: parseFloat(weight),
        birth_height_cm: parseFloat(height),
        gender,
      })
      localStorage.setItem('onboarding_done', '1')
      onComplete()
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center"
        >
          <motion.div
            initial={{ y: 40 }}
            animate={{ y: 0 }}
            className="w-full max-w-md rounded-t-3xl bg-card p-6 pb-10 shadow-2xl sm:rounded-3xl"
          >
            <div className="mb-6 text-center">
              <span className="text-4xl">👶</span>
              <h2 className="font-heading mt-2 text-xl font-bold text-foreground">
                {step === 0 ? 'Selamat datang!' : 'Data bayi'}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {step === 0
                  ? 'Mari setup profil bayi dulu'
                  : 'Isi data lahir untuk grafik KMS'}
              </p>
            </div>

            {step === 0 ? (
              <div className="space-y-4">
                <p className="text-center text-sm text-muted-foreground">
                  App ini membantu mencatat pup, pee, pupee, menyusui, tidur, dan
                  pertumbuhan bayi. Satu PIN untuk semua pengasuh.
                </p>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground"
                >
                  Start →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Nama bayi"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-3 text-base"
                  autoFocus
                />
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-3 text-base"
                />
                <div className="flex gap-2">
                  {(['MALE', 'FEMALE'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={`flex-1 rounded-xl py-3 text-sm font-medium ${
                        gender === g
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-foreground'
                      }`}
                    >
                      {g === 'MALE' ? '👦 Laki' : '👧 Wanita'}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Berat lahir (kg)"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="rounded-xl border border-input bg-background px-3 py-3 text-base"
                  />
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Panjang (cm)"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="rounded-xl border border-input bg-background px-3 py-3 text-base"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={!name.trim() || saving}
                  className="w-full rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {saving ? '...' : 'Save'}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
