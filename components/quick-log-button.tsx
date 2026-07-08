'use client'

import { motion } from 'framer-motion'
import { useState, type ReactNode } from 'react'
import { playSoundEffect } from '@/lib/sounds'

interface QuickLogButtonProps {
  type: string
  emoji?: string
  icon?: ReactNode
  label: string
  color: string
  onClick: () => void
  compact?: boolean
}

export function QuickLogButton({
  type,
  emoji,
  icon,
  label,
  color,
  onClick,
  compact = false,
}: QuickLogButtonProps) {
  const [isPressed, setIsPressed] = useState(false)

  const getAnimationVariants = () => {
    switch (type) {
      case 'pup':
        return {
          initial: { scale: 1 },
          tap: { scale: 0.95, rotate: 5 },
          hover: { scale: 1.05 },
        }
      case 'pee':
        return {
          initial: { scale: 1 },
          tap: { scale: 0.92, y: 4 },
          hover: { scale: 1.08 },
        }
      case 'both':
        return {
          initial: { scale: 1 },
          tap: { scale: 0.95 },
          hover: { scale: 1.05 },
        }
      case 'feed':
        return {
          initial: { scale: 1 },
          tap: { scale: 0.93 },
          hover: { scale: 1.07 },
        }
      case 'sleep':
        return {
          initial: { scale: 1 },
          tap: { scale: 0.94, opacity: 0.8 },
          hover: { scale: 1.06 },
        }
      case 'sleep-end':
        return {
          initial: { scale: 1 },
          tap: { scale: 0.93 },
          hover: { scale: 1.07 },
        }
      case 'feed-end':
        return {
          initial: { scale: 1 },
          tap: { scale: 0.95 },
          hover: { scale: 1.05 },
        }
      default:
        return {
          initial: { scale: 1 },
          tap: { scale: 0.95 },
          hover: { scale: 1.05 },
        }
    }
  }

  const variants = getAnimationVariants()

  return (
    <motion.button
      onClick={() => {
        setIsPressed(true)
        playSoundEffect('click')
        onClick()
        setTimeout(() => setIsPressed(false), 200)
      }}
      whileHover={variants.hover}
      whileTap={variants.tap}
      aria-label={label}
      className={`relative w-full overflow-hidden rounded-2xl font-heading font-semibold text-foreground shadow-md transition-all duration-200 ${color} ${
        compact ? 'px-2 py-3' : 'px-4 py-6'
      }`}
      style={{
        minHeight: compact ? '72px' : '88px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: compact ? '0.25rem' : '0.5rem',
      }}
    >
      {/* Ripple effect on tap */}
      {isPressed && (
        <motion.div
          initial={{ scale: 0, opacity: 0.7 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0 rounded-full bg-white"
          style={{
            width: '20px',
            height: '20px',
            left: '50%',
            top: '50%',
            marginLeft: '-10px',
            marginTop: '-10px',
          }}
        />
      )}

      {/* Emoji with animation */}
      <motion.div
        animate={
          isPressed
            ? { scale: type === 'both' ? 1.1 : 1.3, rotate: type === 'both' ? 0 : 10 }
            : { scale: 1, rotate: 0 }
        }
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className={`flex shrink-0 items-center justify-center leading-none ${
          icon ? 'h-6' : compact ? 'h-6 w-6 text-xl' : 'h-8 w-8 text-2xl'
        }`}
      >
        {icon ?? emoji}
      </motion.div>

      {/* Label */}
      <span className="text-[11px] font-semibold leading-tight">{label}</span>

      {/* Shine effect on hover */}
      <div
        className="absolute inset-0 -right-full bg-gradient-to-l from-white/30 to-transparent transition-all duration-500 hover:right-0"
        style={{ width: '100%' }}
      />
    </motion.button>
  )
}
