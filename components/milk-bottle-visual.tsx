'use client'

import { useId } from 'react'
import { motion } from 'framer-motion'
import { MILK_BOTTLE_MAX_ML, type MilkExpiryStatus } from '@/lib/milk-storage'

const SCALE_MARKS = [60, 120, 180, 240] as const

/** Bottom of measurable fill (matches scale mark baseline). */
const FILL_BOTTOM_Y = 68
/** Vertical span from empty to full — same factor as scale marks. */
const FILL_SPAN = 52

export function mlToFillSurfaceY(ml: number): number {
  const clamped = Math.min(MILK_BOTTLE_MAX_ML, Math.max(0, ml))
  return FILL_BOTTOM_Y - (clamped / MILK_BOTTLE_MAX_ML) * FILL_SPAN
}

function scaleMarkY(markMl: number): number {
  return FILL_BOTTOM_Y - (markMl / MILK_BOTTLE_MAX_ML) * FILL_SPAN
}

const BOTTLE_BODY =
  'M13 10 L13 8 L15 4 L25 4 L27 8 L27 10 L31 13 L31 64 C31 71 26 76 20 76 C14 76 9 71 9 64 L9 13 Z'

export function FrostVapor() {
  const puffs = [
    { left: '8%', delay: 0, w: 28 },
    { left: '32%', delay: 1.2, w: 22 },
    { left: '58%', delay: 0.6, w: 26 },
    { left: '78%', delay: 1.8, w: 20 },
    { left: '45%', delay: 2.4, w: 18 },
  ]

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {puffs.map((p, i) => (
        <motion.div
          key={i}
          className="absolute bottom-2 rounded-full bg-sky-200/40 blur-md dark:bg-sky-400/10"
          style={{ left: p.left, width: p.w, height: p.w * 0.55 }}
          initial={{ opacity: 0, y: 8, scale: 0.85 }}
          animate={{
            opacity: [0, 0.45, 0.25, 0],
            y: [8, -18, -36, -52],
            scale: [0.85, 1, 1.15, 1.25],
          }}
          transition={{
            duration: 5.5,
            repeat: Infinity,
            ease: 'easeOut',
            delay: p.delay,
          }}
        />
      ))}
    </div>
  )
}

const SIZE_CLASS = {
  sm: 'h-[5rem] w-[2.75rem] sm:h-[5.75rem] sm:w-[3.1rem]',
  lg: 'h-[10rem] w-[5rem] sm:h-[11rem] sm:w-[5.5rem]',
} as const

export function BottleVisual({
  filled,
  amountMl,
  active,
  expiryStatus,
  size = 'sm',
}: {
  filled: boolean
  amountMl: number | null
  active?: boolean
  expiryStatus: MilkExpiryStatus
  size?: keyof typeof SIZE_CLASS
}) {
  const clipId = useId().replace(/:/g, '')
  const ml = filled && amountMl != null ? amountMl : 0
  const fillTop = ml > 0 ? mlToFillSurfaceY(ml) : FILL_BOTTOM_Y

  const glassStroke =
    expiryStatus === 'expired'
      ? '#dc2626'
      : expiryStatus === 'soon'
        ? '#d97706'
        : '#0369a1'

  const glassFillId = `glassGrad-${clipId}`
  const milkFillId = `milkGrad-${clipId}`

  return (
    <motion.div
      className={`relative mx-auto ${SIZE_CLASS[size]}`}
      animate={filled ? { y: [0, -1.5, 0] } : { y: 0 }}
      transition={
        filled
          ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
          : { duration: 0.2 }
      }
      whileHover={{ scale: 1.04 }}
      style={active ? { scale: 1.06 } : undefined}
    >
      <svg
        viewBox="0 0 40 80"
        className="h-full w-full"
        shapeRendering="geometricPrecision"
        aria-hidden
      >
        <defs>
          <clipPath id={`bottle-clip-${clipId}`}>
            <rect x="8" y={fillTop} width="24" height={76 - fillTop} />
          </clipPath>
          <linearGradient id={glassFillId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(186, 230, 253, 0.95)" />
            <stop offset="45%" stopColor="rgba(224, 242, 254, 0.65)" />
            <stop offset="100%" stopColor="rgba(125, 211, 252, 0.45)" />
          </linearGradient>
          <linearGradient id={milkFillId} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="55%" stopColor="#fffbeb" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
        </defs>

        <rect
          x="15"
          y="0"
          width="10"
          height="4"
          rx="0.5"
          fill="#7dd3fc"
          stroke={glassStroke}
          strokeWidth="1.5"
        />

        <path d={BOTTLE_BODY} fill={`url(#${glassFillId})`} stroke="none" />

        {filled && ml > 0 && (
          <g clipPath={`url(#bottle-clip-${clipId})`}>
            <path d={BOTTLE_BODY} fill={`url(#${milkFillId})`} stroke="none" />
            <ellipse
              cx="20"
              cy={fillTop}
              rx="9"
              ry="2"
              fill="rgba(255,255,255,0.92)"
            />
          </g>
        )}

        <path
          d="M14 14 L14 62"
          stroke="rgba(255,255,255,0.75)"
          strokeWidth="1.2"
          strokeLinecap="round"
        />

        <path
          d={BOTTLE_BODY}
          fill="none"
          stroke={glassStroke}
          strokeWidth="2.25"
          strokeLinejoin="miter"
          strokeLinecap="square"
        />

        {SCALE_MARKS.map((mark, i) => {
          const y = scaleMarkY(mark)
          return (
            <g key={mark}>
              <line
                x1="27"
                y1={y}
                x2="30"
                y2={y}
                stroke="#64748b"
                strokeWidth="1.2"
                strokeLinecap="square"
              />
              {i % 2 === 0 && (
                <text
                  x="10"
                  y={y + 2.5}
                  fontSize="4.5"
                  fill="#475569"
                  fontWeight="700"
                >
                  {mark}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </motion.div>
  )
}
