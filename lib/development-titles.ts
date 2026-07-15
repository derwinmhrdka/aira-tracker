import { prisma } from '@/lib/prisma'

export type TitleProgress = {
  checked: number
  total: number
}

export type FormattedTitle = {
  id: string
  category: string
  name: string
  emoji: string
  description: string
  age_group_months: number
  is_unlocked: boolean
  unlocked_at: string | null
  progress_checked: number
  progress_total: number
  unlock_at: number
}

function progressKey(age: number, category: string) {
  return `${age}|${category}`
}

function formatTitle(
  t: {
    id: string
    category: string
    name: string
    emoji: string
    description: string
    ageGroupMonths: number
    isUnlocked: boolean
    unlockedAt: Date | null
  },
  progress: TitleProgress
): FormattedTitle {
  return {
    id: t.id,
    category: t.category,
    name: t.name,
    emoji: t.emoji,
    description: t.description,
    age_group_months: t.ageGroupMonths,
    is_unlocked: t.isUnlocked,
    unlocked_at: t.unlockedAt?.toISOString() ?? null,
    progress_checked: progress.checked,
    progress_total: progress.total,
    unlock_at: progress.total,
  }
}

export async function getDevelopmentProgressByAgeCategory(): Promise<
  Record<string, TitleProgress>
> {
  const items = await prisma.developmentChecklist.findMany({
    select: { ageGroupMonths: true, category: true, isChecked: true },
  })

  const progress: Record<string, TitleProgress> = {}
  for (const item of items) {
    const cat = item.category || 'other'
    const key = progressKey(item.ageGroupMonths, cat)
    if (!progress[key]) progress[key] = { checked: 0, total: 0 }
    progress[key].total++
    if (item.isChecked) progress[key].checked++
  }
  return progress
}

/**
 * Unlock title jika semua checklist di usia+kategori itu sudah dicentang.
 * Sticky: tidak mengunci ulang.
 */
export async function syncTitlesFromDevelopment(): Promise<{
  newlyUnlocked: FormattedTitle[]
  progressByKey: Record<string, TitleProgress>
}> {
  const [progressByKey, titles] = await Promise.all([
    getDevelopmentProgressByAgeCategory(),
    prisma.title.findMany(),
  ])

  const newlyUnlocked: FormattedTitle[] = []

  for (const title of titles) {
    const key = progressKey(title.ageGroupMonths, title.category)
    const progress = progressByKey[key] ?? { checked: 0, total: 0 }
    const shouldUnlock =
      progress.total > 0 && progress.checked >= progress.total

    if (shouldUnlock && !title.isUnlocked) {
      const updated = await prisma.title.update({
        where: { id: title.id },
        data: {
          isUnlocked: true,
          unlockedAt: new Date(),
        },
      })
      newlyUnlocked.push(formatTitle(updated, progress))
    }
  }

  return { newlyUnlocked, progressByKey }
}

export async function listTitlesWithProgress(): Promise<FormattedTitle[]> {
  const { progressByKey } = await syncTitlesFromDevelopment()
  const titles = await prisma.title.findMany({
    orderBy: [{ ageGroupMonths: 'asc' }, { category: 'asc' }],
  })

  return titles.map((t) =>
    formatTitle(
      t,
      progressByKey[progressKey(t.ageGroupMonths, t.category)] ?? {
        checked: 0,
        total: 0,
      }
    )
  )
}

export async function formatTitleWithProgress(title: {
  id: string
  category: string
  name: string
  emoji: string
  description: string
  ageGroupMonths: number
  isUnlocked: boolean
  unlockedAt: Date | null
}): Promise<FormattedTitle> {
  const progressByKey = await getDevelopmentProgressByAgeCategory()
  const progress =
    progressByKey[progressKey(title.ageGroupMonths, title.category)] ?? {
      checked: 0,
      total: 0,
    }
  return formatTitle(title, progress)
}
