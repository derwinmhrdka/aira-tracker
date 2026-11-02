'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { KmsBabyStatus } from '@/lib/kms-baby'

const ART: Record<'kurang' | 'normal' | 'lebih' | 'obesitas', { open: string; shut: string; react: string }> = {
  kurang: {
    open: '/kms-baby/baby-kurang.jpg',
    shut: '/kms-baby/baby-kurang-shut.jpg',
    react: '/kms-baby/react-kurang.mp4',
  },
  normal: {
    open: '/kms-baby/baby-normal.jpg',
    shut: '/kms-baby/baby-normal-shut.jpg',
    react: '/kms-baby/react-normal.mp4',
  },
  lebih: {
    open: '/kms-baby/baby-lebih.jpg',
    shut: '/kms-baby/baby-lebih-shut.jpg',
    react: '/kms-baby/react-lebih.mp4',
  },
  obesitas: {
    open: '/kms-baby/baby-obesitas.jpg',
    shut: '/kms-baby/baby-obesitas-shut.jpg',
    react: '/kms-baby/react-obesitas.mp4',
  },
}

function artKey(status: KmsBabyStatus): keyof typeof ART {
  if (status === 'sangat-kurang') return 'kurang'
  return status
}

export type GrowthStageHandle = { react: () => void }

export const GrowthStage = forwardRef<GrowthStageHandle, { status: KmsBabyStatus }>(
  function GrowthStage({ status }, ref) {
    const active = artKey(status)
    const activeRef = useRef(active)
    activeRef.current = active
    const videos = useRef<Partial<Record<keyof typeof ART, HTMLVideoElement | null>>>({})
    const [shut, setShut] = useState(false)
    const [waving, setWaving] = useState(false)

    useImperativeHandle(ref, () => ({
      react() {
        const key = activeRef.current
        const video = videos.current[key]
        setShut(false)
        setWaving(true)
        if (!video) return
        video.currentTime = 0
        void video.play().catch(() => setWaving(false))
      },
    }))

    useEffect(() => {
      if (waving) return
      const blink = () => {
        setShut(true)
        window.setTimeout(() => setShut(false), 1200)
      }
      const first = window.setTimeout(blink, 700)
      const id = window.setInterval(blink, 3400)
      return () => {
        window.clearTimeout(first)
        window.clearInterval(id)
      }
    }, [waving, active])

    return (
      <div className="kms-stage" aria-hidden="true">
        {(Object.keys(ART) as Array<keyof typeof ART>).map((key) => {
          const item = ART[key]
          const on = key === active
          return (
            <div key={key} className={`kms-baby-frame ${on ? 'on' : ''}`}>
              <div className="kms-baby-motion">
                <img
                  src={item.open}
                  alt=""
                  className={`kms-baby-shot kms-baby-base ${on ? 'on' : ''}`}
                  draggable={false}
                />
                <img
                  src={item.shut}
                  alt=""
                  className={`kms-baby-shot kms-baby-shut ${on && shut && !waving ? 'on' : ''}`}
                  draggable={false}
                />
                <video
                  ref={(node) => {
                    videos.current[key] = node
                  }}
                  className={`kms-baby-shot kms-react-clip ${on && waving ? 'on' : ''}`}
                  src={item.react}
                  muted
                  playsInline
                  preload="auto"
                  onEnded={() => {
                    if (activeRef.current === key) setWaving(false)
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    )
  }
)
