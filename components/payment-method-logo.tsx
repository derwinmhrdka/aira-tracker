import Image from 'next/image'
import type { VaccinePaymentMethod } from '@/lib/api-client'
import { PAYMENT_METHOD_LABEL } from '@/lib/vaccine-strategy'
import { cn } from '@/lib/utils'

const PAYMENT_LOGO: Record<
  VaccinePaymentMethod,
  { src: string; width: number; height: number }
> = {
  INHEALTH: { src: '/logos/inhealth.png', width: 2143, height: 776 },
  FULLERTON: { src: '/logos/logo-fullerton-health.png', width: 500, height: 142 },
  PUSKESMAS: { src: '/logos/puskesmas.png', width: 120, height: 32 },
  CASH: { src: '/logos/cash.png', width: 80, height: 32 },
}

const SIZE_CLASS = {
  sm: 'h-[11px] max-w-[52px]',
  md: 'h-[15px] max-w-[80px]',
} as const

type PaymentMethodLogoProps = {
  method: VaccinePaymentMethod
  className?: string
  size?: keyof typeof SIZE_CLASS
}

export function PaymentMethodLogo({
  method,
  className,
  size = 'md',
}: PaymentMethodLogoProps) {
  const logo = PAYMENT_LOGO[method]

  return (
    <Image
      src={logo.src}
      alt={PAYMENT_METHOD_LABEL[method]}
      width={logo.width}
      height={logo.height}
      className={cn('w-auto object-contain object-left', SIZE_CLASS[size], className)}
      unoptimized
    />
  )
}
