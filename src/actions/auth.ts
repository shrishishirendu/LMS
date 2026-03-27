'use server'

import { auth } from '@clerk/nextjs/server'
import { db, parents, children } from '@/db'
import { eq } from 'drizzle-orm'

export async function getCurrentParent() {
  const { userId } = await auth()
  if (!userId) return null
  const [parent] = await db.select().from(parents).where(eq(parents.clerkId, userId))
  return parent ?? null
}

export async function getChildrenForParent() {
  const parent = await getCurrentParent()
  if (!parent) return []
  return db.select().from(children).where(eq(children.parentId, parent.id))
}
