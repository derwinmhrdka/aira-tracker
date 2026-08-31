import Image from 'next/image'
import type { VaccinePaymentMethod } from '@/lib/api-client'
import { PAYMENT_METHOD_LABEL } from '@/lib/vaccine-strategy'
import { cn } from '@/lib/utils'

const PAYMENT_LOGO: Partial<Record<VaccinePaymentMethod, { src: string; width: number; height: number }>> = {
  INHEALTH: { src: '/logos/inhealth.png', width: 36, height: 10 },
  FULLERTON: { src: '/logos/fullerton.png', width: 40, height: 10 },
}

type PaymentMethodLogoProps = {
  method: VaccinePaymentMethod
  className?: string
}

export function PaymentMethodLogo({ method, className }: PaymentMethodLogoProps) {
  const logo = PAYMENT_LOGO[method]
  if (!logo) return null

  return (
    <Image
      src={logo.src}
      alt={PAYMENT_METHOD_LABEL[method]}
      width={logo.width}
      height={logo.height}
      className={cn('h-[10px] w-auto max-w-[52px] object-contain object-left', className)}
      unoptimized
    />
  )
}
