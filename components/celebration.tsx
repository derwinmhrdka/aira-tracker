'use client'

import { motion } from 'framer-motion'

interface CelebrationProps {
  message?: string
}

export function Celebration({ message = 'Milestone tercapai! 🎊' }: CelebrationProps) {
  const flakes = Array.from({ length: 20 }, (_, i) => i)

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center">
      {flakes.map((i) => (
        <motion.span
          key={i}
          initial={{
            opacity: 1,
            x: `${Math.random() * 100}vw`,
            y: '50vh',
            scale: 0,
          }}
          animate={{
            opacity: [1, 1, 0],
            y: `${Math.random() * 100}vh`,
            scale: [0, 1.5, 0.5],
            rotate: Math.random() * 360,
          }}
          transition={{ duration: 2 + Math.random(), ease: 'easeOut' }}
          className="absolute text-2xl"
        >
          {i % 3 === 0 ? '❄️' : i % 3 === 1 ? '⭐' : '🎉'}
        </motion.span>
      ))}
      <motion.div
        initial={{ scale: 0, y: 50 }}
        animate={{ scale: [0, 1.3, 1], y: [50, -20, 0] }}
        transition={{ type: 'spring', stiffness: 200, damping: 12 }}
        className="text-6xl"
      >
        ⛄
      </motion.div>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="absolute mt-32 max-w-xs px-4 text-center font-heading text-xl font-bold text-primary"
      >
        {message}
      </motion.p>
    </div>
  )
}
