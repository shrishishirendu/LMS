'use server'

import { stripe, PLANS } from '@/lib/stripe'
import { getCurrentParent } from './auth'
import { redirect } from 'next/navigation'

export async function createCheckoutSession(plan: keyof typeof PLANS) {
  const parent = await getCurrentParent()
  if (!parent) redirect('/sign-in')

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: PLANS[plan].priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/parent/dashboard?upgraded=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/parent/billing`,
    metadata: { parentId: parent.id, plan },
  })

  redirect(session.url!)
}

export async function createPortalSession() {
  const parent = await getCurrentParent()
  if (!parent?.stripeCustomerId) redirect('/parent/billing')

  const session = await stripe.billingPortal.sessions.create({
    customer: parent.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/parent/billing`,
  })

  redirect(session.url)
}
