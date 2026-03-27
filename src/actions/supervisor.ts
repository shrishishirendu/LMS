'use server'

import { db, supervisorQueue } from '@/db'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function resolveQueueItem(id: string) {
  await db.update(supervisorQueue)
    .set({ resolved: true, resolvedAt: new Date() })
    .where(eq(supervisorQueue.id, id))
  revalidatePath('/supervisor/queue')
}
