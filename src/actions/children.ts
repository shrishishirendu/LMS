'use server'

import { db, children } from '@/db'
import { getCurrentParent } from './auth'

export async function createChildProfile(firstName: string, yearLevel: number) {
  const parent = await getCurrentParent()
  if (!parent) throw new Error('Not authenticated')

  const [child] = await db.insert(children).values({
    parentId: parent.id,
    firstName,
    yearLevel,
    curriculum: 'ACARA',
  }).returning()

  return child
}
