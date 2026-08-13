'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { Snowflake } from 'lucide-react'
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

type SnowflakeSpec = {
  left: string
  size: number
  delay: number
  duration: number
  drift: number
  startTop: number
}

const AMBIENT_SNOWFLAKES: SnowflakeSpec[] = [
  { left: '6%', size: 9, delay: 0, duration: 16, drift: 10, startTop: -4 },
  { left: '18%', size: 7, delay: 2.4, duration: 19, drift: -8, startTop: -8 },
  { left: '31%', size: 10, delay: 0.8, duration: 17, drift: 12, startTop: -6 },
  { left: '44%', size: 6, delay: 4.1, duration: 21, drift: -6, startTop: -10 },
  { left: '57%', size: 8, delay: 1.5, duration: 18, drift: 9, startTop: -5 },
  { left: '69%', size: 11, delay: 3.2, duration: 20, drift: -11, startTop: -7 },
  { left: '81%', size: 7, delay: 5.0, duration: 22, drift: 7, startTop: -9 },
  { left: '92%', size: 8, delay: 1.1, duration: 19, drift: -9, startTop: -4 },
  { left: '25%', size: 6, delay: 6.2, duration: 23, drift: 5, startTop: -12 },
  { left: '50%', size: 9, delay: 2.9, duration: 17, drift: -7, startTop: -6 },
  { left: '74%', size: 7, delay: 4.8, duration: 20, drift: 8, startTop: -8 },
  { left: '38%', size: 8, delay: 7.1, duration: 18, drift: -10, startTop: -5 },
]

const BOTTLE_SNOWFLAKES: SnowflakeSpec[] = [
  { left: '10%', size: 7, delay: 0, duration: 7.5, drift: 4, startTop: 2 },
  { left: '72%', size: 6, delay: 1.2, duration: 8.2, drift: -5, startTop: 0 },
  { left: '38%', size: 8, delay: 0.5, duration: 7.8, drift: 3, startTop: -4 },
  { left: '58%', size: 6, delay: 2.0, duration: 8.6, drift: -3, startTop: 4 },
  { left: '24%', size: 5, delay: 1.7, duration: 9.1, drift: 5, startTop: -2 },
]

function SoftSnowflakes({
  variant = 'ambient',
  scale = 1,
}: {
  variant?: 'ambient' | 'bottle'
  scale?: number
}) {
  const flakes = variant === 'bottle' ? BOTTLE_SNOWFLAKES : AMBIENT_SNOWFLAKES
  const maxOpacity = variant === 'bottle' ? 0.62 : 0.48

  return (
    <>
      {flakes.map((f, i) => (
        <motion.div
          key={`${variant}-${i}`}
          className="pointer-events-none absolute text-sky-300/70 dark:text-sky-200/45"
          style={{ left: f.left, top: `${f.startTop}%` }}
          initial={{ opacity: 0, y: 0, x: 0, rotate: 0 }}
          animate={{
            opacity: [0, maxOpacity, maxOpacity * 0.7, 0],
            y:
              variant === 'bottle'
                ? [0, -10 * scale, -22 * scale, -34 * scale]
                : [0, 48, 96, 140],
            x: [0, f.drift, f.drift * 0.6, f.drift * 1.1],
            rotate: [0, 45, 90, 140],
          }}
          transition={{
            duration: f.duration,
            repeat: Infinity,
            ease: 'linear',
            delay: f.delay,
          }}
        >
          <Snowflake
            strokeWidth={1.35}
            style={{ width: f.size * scale, height: f.size * scale }}
            aria-hidden
          />
        </motion.div>
      ))}
    </>
  )
}

export function FrostVapor() {
  const puffs = [
    { left: '4%', delay: 0, w: 40, drift: -5, h: 0.55 },
    { left: '22%', delay: 1.2, w: 32, drift: 6, h: 0.5 },
    { left: '38%', delay: 0.5, w: 36, drift: -4, h: 0.58 },
    { left: '55%', delay: 1.8, w: 30, drift: 5, h: 0.52 },
    { left: '68%', delay: 0.9, w: 34, drift: -6, h: 0.54 },
    { left: '82%', delay: 2.3, w: 28, drift: 4, h: 0.48 },
    { left: '12%', delay: 2.6, w: 26, drift: 3, h: 0.46 },
    { left: '48%', delay: 3.1, w: 24, drift: -3, h: 0.44 },
    { left: '90%', delay: 1.5, w: 22, drift: -4, h: 0.42 },
  ]

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-sky-200/30 via-sky-100/12 to-transparent dark:from-sky-400/15 dark:via-sky-500/5" />
      {puffs.map((p, i) => (
        <motion.div
          key={i}
          className="pointer-events-none absolute bottom-0 rounded-full bg-gradient-to-t from-sky-100/80 via-white/70 to-white/30 blur-[10px] shadow-[0_0_18px_rgba(186,230,253,0.45)] dark:from-sky-200/35 dark:via-sky-100/20 dark:to-transparent dark:shadow-[0_0_14px_rgba(125,211,252,0.25)]"
          style={{ left: p.left, width: p.w, height: p.w * p.h }}
          initial={{ opacity: 0, y: 8, scale: 0.75, x: 0 }}
          animate={{
            opacity: [0, 0.72, 0.48, 0],
            y: [8, -18, -40, -62],
            x: [0, p.drift, p.drift * 0.7, p.drift * 1.3],
            scale: [0.75, 1.05, 1.18, 1.35],
          }}
          transition={{
            duration: 5.8,
            repeat: Infinity,
            ease: 'easeOut',
            delay: p.delay,
          }}
        />
      ))}
      <SoftSnowflakes variant="ambient" />
    </div>
  )
}

function BottleColdVapor({ size = 'sm' }: { size?: keyof typeof SIZE_CLASS }) {
  const scale = size === 'lg' ? 1.45 : 1.15
  const puffs = [
    { left: '18%', top: '8%', delay: 0, w: 14, drift: 3, dur: 4.8 },
    { left: '52%', top: '4%', delay: 0.7, w: 13, drift: -3.5, dur: 5.2 },
    { left: '32%', top: '0%', delay: 1.3, w: 16, drift: 2.5, dur: 5.5 },
    { left: '68%', top: '6%', delay: 0.3, w: 12, drift: -2.5, dur: 4.9 },
    { left: '8%', top: '14%', delay: 1.9, w: 11, drift: 4, dur: 5.8 },
    { left: '78%', top: '12%', delay: 1.1, w: 10, drift: -3, dur: 5.4 },
    { left: '42%', top: '-6%', delay: 2.4, w: 15, drift: 1.5, dur: 6.1 },
    { left: '58%', top: '-4%', delay: 0.5, w: 13, drift: -2, dur: 5.6 },
  ]

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -inset-x-3 -top-4 bottom-[38%] overflow-visible [&_*]:pointer-events-none"
      style={{ zIndex: 2 }}
    >
      {puffs.map((p, i) => (
        <motion.div
          key={i}
          className="pointer-events-none absolute rounded-full bg-gradient-to-t from-sky-50/90 via-white/75 to-white/20 blur-[3px] shadow-[0_0_10px_rgba(186,230,253,0.55)] dark:from-sky-100/40 dark:via-sky-50/25 dark:to-transparent dark:shadow-[0_0_8px_rgba(125,211,252,0.35)]"
          style={{
            left: p.left,
            top: p.top,
            width: p.w * scale,
            height: p.w * scale * 0.72,
          }}
          initial={{ opacity: 0, y: 4, x: 0, scale: 0.7 }}
          animate={{
            opacity: [0, 0.78, 0.52, 0],
            y: [4, -8 * scale, -18 * scale, -32 * scale],
            x: [0, p.drift, p.drift * 1.5, p.drift * 0.9],
            scale: [0.7, 1.05, 1.15, 1.28],
          }}
          transition={{
            duration: p.dur,
            repeat: Infinity,
            ease: 'easeOut',
            delay: p.delay,
          }}
        />
      ))}
      <SoftSnowflakes variant="bottle" scale={scale} />
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

    const unsub = fillTopMotion.on('change', (v) => {
      if (Number.isFinite(v)) setFillTop(v)
    })
    setFillTop(fillTopMotion.get())
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
  const safeFillTop = Number.isFinite(fillTop)
    ? fillTop
    : mlToFillSurfaceY(targetMl)

  return (
    <div className={`relative mx-auto overflow-visible ${SIZE_CLASS[size]}`}>
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
            <rect x={8} y={safeFillTop} width={24} height={Math.max(0, 76 - safeFillTop)} />
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
            <motion.g
              key={`wave-${sloshKey}`}
              initial={{ x: 0 }}
              animate={{ x: [0, 1.5, -1.5, 0.3, 0] }}
              transition={{ duration: 0.65, ease: 'easeOut' }}
            >
              <motion.ellipse
                cx={20}
                cy={safeFillTop}
                rx={9}
                ry={2}
                fill="rgba(255,255,255,0.92)"
                initial={{ ry: 1.2 }}
                animate={{ ry: [1.2, 3.4, 2.9, 2.2, 2] }}
                transition={{ duration: 0.65, ease: 'easeOut' }}
              />
            </motion.g>
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
      {showMilk && <BottleColdVapor size={size} />}
    </div>
  )
}
