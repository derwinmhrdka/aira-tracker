'use client'

import { motion } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'
import { AppIcon } from './app-icon'

interface PageHeaderProps {
  title: string
  subtitle?: string
  onBack?: () => void
}

export function PageHeader({ title, subtitle, onBack }: PageHeaderProps) {
  return (
    <div className="mb-6 flex items-start gap-3">
      {onBack && (
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onBack}
          className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-primary"
          aria-label="Kembali"
        >
          <AppIcon icon={ChevronLeft} size={22} strokeWidth={2.25} />
        </motion.button>
      )}
      <div className="flex-1">
        <h1 className="font-heading text-[28px] font-bold leading-tight tracking-tight text-foreground">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 text-[15px] text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </div>
  )
}
