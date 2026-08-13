'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { MILK_BOTTLE_MAX_ML, type MilkExpiryStatus } from '@/lib/milk-storage'

const SCALE_MARKS = [60, 120, 180] as const

const FILL_BOTTOM_Y = 68
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

type MilkBubbleSpec = {
  cx: number
  startY: number
  r: number
  delay: number
  drift: number
  rise: number
}

function makePourBubbles(fillTop: number, count = 7): MilkBubbleSpec[] {
  const bottom = FILL_BOTTOM_Y - 3
  const top = Math.max(fillTop + 2, bottom - 18)
  return Array.from({ length: count }, (_, i) => ({
    cx: 12.5 + ((i * 5.7) % 15),
    startY: top + ((i * 3.1) % Math.max(4, bottom - top)),
    r: 0.32 + (i % 3) * 0.18,
    delay: i * 0.07,
    drift: ((i % 4) - 1.5) * 0.9,
    rise: 8 + (i % 3) * 3,
  }))
}

function MilkPourBubbles({
  burstKey,
  bubbles,
}: {
  burstKey: number
  bubbles: MilkBubbleSpec[]
}) {
  if (burstKey === 0 || bubbles.length === 0) return null

  return (
    <>
      {bubbles.map((b, i) => (
        <motion.circle
          key={`${burstKey}-${i}`}
          cx={b.cx}
          r={b.r}
          fill="rgba(255,255,255,0.82)"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth={0.12}
          initial={{ cy: b.startY, opacity: 0, scale: 0.4 }}
          animate={{
            cy: [b.startY, b.startY - b.rise * 0.45, b.startY - b.rise],
            opacity: [0, 0.75, 0.55, 0],
            scale: [0.4, 1, 1.05, 0.7],
            cx: [b.cx, b.cx + b.drift, b.cx + b.drift * 0.6],
          }}
          transition={{
            duration: 1.35,
            ease: 'easeOut',
            delay: b.delay,
          }}
        />
      ))}
    </>
  )
}

export function FrostVapor() {
  const puffs = [
    { left: '6%', delay: 0, w: 32, drift: -4 },
    { left: '28%', delay: 1.4, w: 24, drift: 5 },
    { left: '52%', delay: 0.7, w: 28, drift: -3 },
    { left: '74%', delay: 2.1, w: 22, drift: 4 },
    { left: '40%', delay: 2.8, w: 20, drift: -5 },
    { left: '88%', delay: 1.1, w: 18, drift: 3 },
  ]

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {puffs.map((p, i) => (
        <motion.div
          key={i}
          className="absolute bottom-1 rounded-full bg-white/35 blur-lg dark:bg-sky-200/10"
          style={{ left: p.left, width: p.w, height: p.w * 0.5 }}
          initial={{ opacity: 0, y: 6, scale: 0.8, x: 0 }}
          animate={{
            opacity: [0, 0.35, 0.22, 0],
            y: [6, -14, -32, -48],
            x: [0, p.drift, p.drift * 0.6, p.drift * 1.2],
            scale: [0.8, 1, 1.12, 1.28],
          }}
          transition={{
            duration: 6.5,
            repeat: Infinity,
            ease: 'easeOut',
            delay: p.delay,
          }}
        />
      ))}
    </div>
  )
}

function BottleColdVapor({ size = 'sm' }: { size?: keyof typeof SIZE_CLASS }) {
  const scale = size === 'lg' ? 1.35 : 1
  const puffs = [
    { left: '8%', bottom: '28%', delay: 0, w: 11, drift: 2.5, dur: 5.2 },
    { left: '62%', bottom: '32%', delay: 0.9, w: 10, drift: -3, dur: 5.8 },
    { left: '22%', bottom: '48%', delay: 1.6, w: 12, drift: 2, dur: 6.1 },
    { left: '72%', bottom: '52%', delay: 0.4, w: 9, drift: -2.5, dur: 5.5 },
    { left: '38%', bottom: '68%', delay: 2.2, w: 10, drift: 1.5, dur: 6.4 },
    { left: '52%', bottom: '78%', delay: 1.2, w: 8, drift: -1.5, dur: 5.9 },
  ]

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-visible"
      style={{ zIndex: 0 }}
    >
      {puffs.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white/55 blur-[2.5px] dark:bg-sky-100/25"
          style={{
            left: p.left,
            bottom: p.bottom,
            width: p.w * scale,
            height: p.w * scale * 0.62,
          }}
          initial={{ opacity: 0, y: 0, x: 0, scale: 0.75 }}
          animate={{
            opacity: [0, 0.42, 0.28, 0],
            y: [0, -6 * scale, -14 * scale, -24 * scale],
            x: [0, p.drift, p.drift * 1.4, p.drift * 0.8],
            scale: [0.75, 1, 1.08, 1.18],
          }}
          transition={{
            duration: p.dur,
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
  const targetMl = filled && amountMl != null ? amountMl : 0
  const prevTargetRef = useRef(targetMl)
  const [sloshKey, setSloshKey] = useState(0)
  const [bubbleBurstKey, setBubbleBurstKey] = useState(0)
  const [pourBubbles, setPourBubbles] = useState<MilkBubbleSpec[]>([])

  const animatedMl = useMotionValue(targetMl)
  const fillTopMotion = useTransform(animatedMl, (v) => mlToFillSurfaceY(v))
  const [fillTop, setFillTop] = useState(() => mlToFillSurfaceY(targetMl))

  useEffect(() => {
    const prevMl = prevTargetRef.current
    const increasing = targetMl > prevMl
    prevTargetRef.current = targetMl
    if (increasing && targetMl > 0) {
      setSloshKey((k) => k + 1)
      const added = targetMl - prevMl
      const count = Math.min(10, 4 + Math.floor(added / 10))
      setPourBubbles(makePourBubbles(mlToFillSurfaceY(targetMl), count))
      setBubbleBurstKey((k) => k + 1)
    }

    const controls = animate(animatedMl, targetMl, {
      type: 'spring',
      stiffness: 160,
      damping: 22,
      mass: 0.8,
    })

    const unsub = fillTopMotion.on('change', (v) => setFillTop(v))
    return () => {
      controls.stop()
      unsub()
    }
  }, [targetMl, animatedMl, fillTopMotion])

  const glassStroke =
    expiryStatus === 'expired'
      ? '#dc2626'
      : expiryStatus === 'soon'
        ? '#d97706'
        : '#0369a1'

  const glassFillId = `glassGrad-${clipId}`
  const milkFillId = `milkGrad-${clipId}`
  const showMilk = filled && targetMl > 0

  return (
    <div className={`relative mx-auto ${SIZE_CLASS[size]}`}>
      {showMilk && <BottleColdVapor size={size} />}
      <motion.div
        className="relative z-[1] h-full w-full"
        animate={showMilk ? { y: [0, -1.5, 0] } : { y: 0 }}
        transition={
          showMilk
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
            <rect x={8} y={fillTop} width={24} height={76 - fillTop} />
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

        {showMilk && (
          <g clipPath={`url(#bottle-clip-${clipId})`}>
            <path d={BOTTLE_BODY} fill={`url(#${milkFillId})`} stroke="none" />
            <motion.ellipse
              key={`wave-${sloshKey}`}
              cx={20}
              cy={fillTop}
              rx={9}
              ry={2}
              fill="rgba(255,255,255,0.92)"
              initial={{ ry: 1.2 }}
              animate={{
                cx: [20, 21.5, 18.5, 20.3, 20],
                ry: [1.2, 3.4, 2.9, 2.2, 2],
              }}
              transition={{ duration: 0.65, ease: 'easeOut' }}
            />
            <MilkPourBubbles burstKey={bubbleBurstKey} bubbles={pourBubbles} />
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

        {SCALE_MARKS.map((mark) => {
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
              <text
                x="10"
                y={y + 2.5}
                fontSize="4.5"
                fill="#475569"
                fontWeight="700"
              >
                {mark}
              </text>
            </g>
          )
        })}
        </svg>
      </motion.div>
    </div>
  )
}
