import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe() {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-03-25.dahlia',
    })
  }
  return _stripe
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

export const PLANS = {
  explorer: {
    priceId: process.env.STRIPE_EXPLORER_PRICE_ID!,
    name: 'Explorer',
    price: 19,
    maxChildren: 1,
  },
  scholar: {
    priceId: process.env.STRIPE_SCHOLAR_PRICE_ID!,
    name: 'Scholar',
    price: 39,
    maxChildren: 1,
  },
  family: {
    priceId: process.env.STRIPE_FAMILY_PRICE_ID!,
    name: 'Family',
    price: 59,
    maxChildren: 4,
  },
}
