'use client'

import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AppIconProps {
  icon: LucideIcon
  className?: string
  size?: number
  strokeWidth?: number
}

/** iOS-style outline icons (SF Symbols–like via Lucide). */
export function AppIcon({
  icon: Icon,
  className,
  size = 22,
  strokeWidth = 1.75,
}: AppIconProps) {
  return (
    <Icon
      size={size}
      strokeWidth={strokeWidth}
      className={cn('shrink-0', className)}
      aria-hidden
    />
  )
}
