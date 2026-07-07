import { getKmsZone, KMS_ZONE_LABEL, KMS_ZONE_STYLE } from '@/lib/kms-status'
import type { Gender } from '@/lib/who-growth'

interface KmsStatusBadgeProps {
  value: number
  birthDate: string
  measureDate: string
  metric: 'weight' | 'height'
  gender?: Gender
  prefix?: string
}

export function KmsStatusBadge({
  value,
  birthDate,
  measureDate,
  metric,
  gender = 'MALE',
  prefix,
}: KmsStatusBadgeProps) {
  const zone = getKmsZone(value, birthDate, measureDate, metric, gender)
  const label = prefix ? `${prefix} ${KMS_ZONE_LABEL[zone]}` : KMS_ZONE_LABEL[zone]

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${KMS_ZONE_STYLE[zone]}`}
    >
      {label}
    </span>
  )
}
