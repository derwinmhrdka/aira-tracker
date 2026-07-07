import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-helpers'

export const BACKUP_VERSION = 1

export async function GET() {
  return withAuth(async () => {
    const [
      profile,
      diaperLogs,
      feedingLogs,
      sleepLogs,
      growthLogs,
      notes,
      milestones,
      immunizations,
      development,
    ] = await Promise.all([
      prisma.babyProfile.findFirst(),
      prisma.diaperLog.findMany({ orderBy: { timestamp: 'asc' } }),
      prisma.feedingLog.findMany({ orderBy: { timestampStart: 'asc' } }),
      prisma.sleepLog.findMany({ orderBy: { timestampStart: 'asc' } }),
      prisma.growthLog.findMany({ orderBy: { date: 'asc' } }),
      prisma.dailyNote.findMany({ orderBy: { timestamp: 'asc' } }),
      prisma.milestone.findMany({ orderBy: { date: 'asc' } }),
      prisma.immunization.findMany({ orderBy: { scheduledAgeMonths: 'asc' } }),
      prisma.developmentChecklist.findMany({ orderBy: { ageGroupMonths: 'asc' } }),
    ])

    return NextResponse.json({
      version: BACKUP_VERSION,
      exported_at: new Date().toISOString(),
      profile: profile
        ? {
            name: profile.name,
            birth_date: profile.birthDate.toISOString().split('T')[0],
            birth_weight_kg: profile.birthWeightKg,
            birth_height_cm: profile.birthHeightCm,
            blood_type: profile.bloodType,
            parent_names: profile.parentNames,
            photo_url: profile.photoUrl,
            gender: profile.gender,
          }
        : null,
      diaper_logs: diaperLogs.map((l) => ({
        timestamp: l.timestamp.toISOString(),
        type: l.type,
        notes: l.notes,
        logged_by: l.loggedBy,
      })),
      feeding_logs: feedingLogs.map((l) => ({
        timestamp_start: l.timestampStart.toISOString(),
        timestamp_end: l.timestampEnd?.toISOString() ?? null,
        side: l.side,
        amount_ml: l.amountMl,
        notes: l.notes,
        logged_by: l.loggedBy,
      })),
      sleep_logs: sleepLogs.map((l) => ({
        timestamp_start: l.timestampStart.toISOString(),
        timestamp_end: l.timestampEnd?.toISOString() ?? null,
        notes: l.notes,
        logged_by: l.loggedBy,
      })),
      growth_logs: growthLogs.map((l) => ({
        date: l.date.toISOString().split('T')[0],
        weight_kg: l.weightKg,
        height_cm: l.heightCm,
        is_jaundice: l.isJaundice,
        bilirubin_level: l.bilirubinLevel,
        notes: l.notes,
      })),
      daily_notes: notes.map((n) => ({
        timestamp: n.timestamp.toISOString(),
        content: n.content,
        photo_url: n.photoUrl,
        logged_by: n.loggedBy,
      })),
      milestones: milestones.map((m) => ({
        date: m.date.toISOString().split('T')[0],
        title: m.title,
        description: m.description,
        photo_url: m.photoUrl,
      })),
      immunizations: immunizations.map((i) => ({
        vaccine_name: i.vaccineName,
        scheduled_age_months: i.scheduledAgeMonths,
        is_done: i.isDone,
        date_given: i.dateGiven?.toISOString().split('T')[0] ?? null,
        notes: i.notes,
      })),
      development: development.map((d) => ({
        age_group_months: d.ageGroupMonths,
        question: d.question,
        is_checked: d.isChecked,
        date_checked: d.dateChecked?.toISOString().split('T')[0] ?? null,
      })),
    })
  })
}
