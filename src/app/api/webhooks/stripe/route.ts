import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { db, parents } from '@/db'
import { eq } from 'drizzle-orm'
import Stripe from 'stripe'

export async function POST(req: Request) {
  const body = await req.text()
  const headerPayload = await headers()
  const signature = headerPayload.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return new Response('Invalid signature', { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const parentId = session.metadata?.parentId
      if (!parentId) break
      await db.update(parents)
        .set({
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string,
          plan: session.metadata?.plan as 'explorer' | 'scholar' | 'family' ?? 'scholar',
          planStatus: 'active',
          updatedAt: new Date(),
        })
        .where(eq(parents.id, parentId))
      break
    }
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      await db.update(parents)
        .set({ planStatus: sub.status === 'active' ? 'active' : 'past_due', updatedAt: new Date() })
        .where(eq(parents.stripeSubscriptionId, sub.id))
      break
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await db.update(parents)
        .set({ planStatus: 'cancelled', updatedAt: new Date() })
        .where(eq(parents.stripeSubscriptionId, sub.id))
      break
    }
  }

  return new Response('OK', { status: 200 })
}
