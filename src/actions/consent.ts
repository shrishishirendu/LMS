'use server'

import { headers } from 'next/headers'
import { db, consents } from '@/db'
import { getCurrentParent, getChildrenForParent } from './auth'

export async function recordConsent() {
  const parent = await getCurrentParent()
  const children = await getChildrenForParent()
  const child = children[0]
  if (!parent || !child) throw new Error('Missing parent or child')

  const headersList = await headers()
  const ipAddress = headersList.get('x-forwarded-for') ?? 'unknown'
  const userAgent = headersList.get('user-agent') ?? 'unknown'

  const consentTypes = ['platform_use', 'data_processing', 'ai_interaction'] as const

  await db.insert(consents).values(
    consentTypes.map((consentType) => ({
      parentId: parent.id,
      childId: child.id,
      consentType,
      agreed: true,
      ipAddress,
      userAgent,
      termsVersion: 'v1.0',
    }))
  )
}
