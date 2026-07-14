import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-helpers'
import { BACKUP_VERSION } from '../route'
import type { DiaperType, FeedSide, FeedType, LoggedBy, Gender } from '@prisma/client'

function parseDiaperType(v: string): DiaperType {
  if (v === 'PUP' || v === 'pup') return 'PUP'
  if (v === 'KEDUANYA' || v === 'both') return 'KEDUANYA'
  if (v === 'GANTI' || v === 'change' || v === 'ganti') return 'GANTI'
  return 'PIPIS'
}

function parseLoggedBy(v: unknown): LoggedBy | null {
  if (v === 'AYAH' || v === 'IBU' || v === 'PENGASUH') return v
  return null
}

function parseFeedSide(v: unknown): FeedSide | null {
  if (v === 'LEFT' || v === 'RIGHT' || v === 'BOTH') return v
  return null
}

function parseFeedType(v: unknown): FeedType | null {
  if (v === 'DIRECT' || v === 'PUMPED' || v === 'FORMULA') return v
  return null
}

export async function POST(request: NextRequest) {
  return withAuth(async () => {
    const backup = await request.json()

    if (backup.version !== BACKUP_VERSION && backup.version !== 1) {
      return NextResponse.json(
        { error: `Versi backup tidak didukung (v${backup.version})` },
        { status: 400 }
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.diaperLog.deleteMany()
      await tx.feedingLog.deleteMany()
      await tx.sleepLog.deleteMany()
      await tx.growthLog.deleteMany()
      await tx.dailyNote.deleteMany()
      await tx.milestone.deleteMany()

      if (backup.profile) {
        const p = backup.profile
        const existing = await tx.babyProfile.findFirst()
        const data = {
          name: p.name,
          birthDate: new Date(p.birth_date),
          birthWeightKg: Number(p.birth_weight_kg),
          birthHeightCm: Number(p.birth_height_cm),
          bloodType: p.blood_type ?? null,
          parentNames: p.parent_names ?? null,
          photoUrl: p.photo_url ?? null,
          gender: (p.gender as Gender) ?? 'MALE',
        }
        if (existing) {
          await tx.babyProfile.update({ where: { id: existing.id }, data })
        } else {
          await tx.babyProfile.create({ data })
        }
      }

      for (const l of backup.diaper_logs ?? []) {
        await tx.diaperLog.create({
          data: {
            timestamp: new Date(l.timestamp),
            type: parseDiaperType(l.type),
            notes: l.notes ?? null,
            loggedBy: parseLoggedBy(l.logged_by),
          },
        })
      }

      for (const l of backup.feeding_logs ?? []) {
        await tx.feedingLog.create({
          data: {
            timestampStart: new Date(l.timestamp_start),
            timestampEnd: l.timestamp_end ? new Date(l.timestamp_end) : null,
            side: parseFeedSide(l.side),
            feedType: parseFeedType(l.feed_type) ?? 'DIRECT',
            amountMl: l.amount_ml ?? null,
            notes: l.notes ?? null,
            loggedBy: parseLoggedBy(l.logged_by),
          },
        })
      }

      for (const l of backup.sleep_logs ?? []) {
        await tx.sleepLog.create({
          data: {
            timestampStart: new Date(l.timestamp_start),
            timestampEnd: l.timestamp_end ? new Date(l.timestamp_end) : null,
            notes: l.notes ?? null,
            loggedBy: parseLoggedBy(l.logged_by),
          },
        })
      }

      for (const l of backup.growth_logs ?? []) {
        await tx.growthLog.create({
          data: {
            date: new Date(l.date),
            weightKg: Number(l.weight_kg),
            heightCm: Number(l.height_cm),
            headCircumferenceCm: l.head_circumference_cm ?? null,
            isJaundice: l.is_jaundice ?? false,
            bilirubinLevel: l.bilirubin_level ?? null,
            notes: l.notes ?? null,
          },
        })
      }

      for (const n of backup.daily_notes ?? []) {
        await tx.dailyNote.create({
          data: {
            timestamp: new Date(n.timestamp),
            content: n.content,
            photoUrl: n.photo_url ?? null,
            audioUrl: n.audio_url ?? null,
            loggedBy: parseLoggedBy(n.logged_by),
          },
        })
      }

      for (const m of backup.milestones ?? []) {
        await tx.milestone.create({
          data: {
            date: new Date(m.date),
            title: m.title,
            description: m.description ?? null,
            photoUrl: m.photo_url ?? null,
          },
        })
      }

      for (const i of backup.immunizations ?? []) {
        const seedKey = i.seed_key as string | undefined
        const existing = seedKey
          ? await tx.immunization.findFirst({ where: { seedKey } })
          : await tx.immunization.findFirst({
              where: { vaccineName: i.vaccine_name },
            })
        if (existing) {
          await tx.immunization.update({
            where: { id: existing.id },
            data: {
              isDone: i.is_done ?? false,
              dateGiven: i.date_given ? new Date(i.date_given) : null,
              notes: i.notes ?? null,
            },
          })
        } else {
          await tx.immunization.create({
            data: {
              vaccineName: i.vaccine_name,
              scheduledAgeMonths: i.scheduled_age_months ?? 0,
              scheduledAgeWeeks: i.scheduled_age_weeks ?? null,
              doseLabel: i.dose_label ?? null,
              isNationalProgram: i.is_national_program ?? true,
              scheduleNotes: i.schedule_notes ?? null,
              minWeeks: i.min_weeks ?? null,
              maxWeeks: i.max_weeks ?? null,
              seedKey: seedKey ?? null,
              isDone: i.is_done ?? false,
              dateGiven: i.date_given ? new Date(i.date_given) : null,
              notes: i.notes ?? null,
              isCustom: i.is_custom ?? true,
            },
          })
        }
      }

      for (const d of backup.development ?? []) {
        const seedKey = d.seed_key as string | undefined
        const existing = seedKey
          ? await tx.developmentChecklist.findFirst({ where: { seedKey } })
          : await tx.developmentChecklist.findFirst({
              where: { question: d.question },
            })
        if (existing) {
          await tx.developmentChecklist.update({
            where: { id: existing.id },
            data: {
              isChecked: d.is_checked ?? false,
              dateChecked: d.date_checked ? new Date(d.date_checked) : null,
              category: d.category ?? existing.category,
            },
          })
        } else {
          await tx.developmentChecklist.create({
            data: {
              ageGroupMonths: d.age_group_months ?? 0,
              category: d.category ?? null,
              question: d.question,
              seedKey: seedKey ?? null,
              isChecked: d.is_checked ?? false,
              dateChecked: d.date_checked ? new Date(d.date_checked) : null,
            },
          })
        }
      }
    })

    return NextResponse.json({
      success: true,
      restored: {
        diaper: backup.diaper_logs?.length ?? 0,
        feeding: backup.feeding_logs?.length ?? 0,
        sleep: backup.sleep_logs?.length ?? 0,
        growth: backup.growth_logs?.length ?? 0,
        notes: backup.daily_notes?.length ?? 0,
        milestones: backup.milestones?.length ?? 0,
      },
    })
  })
}
