import Stripe from 'stripe'
import { CREDIT_PACKAGES, MIN_CUSTOM_AMOUNT_EUR } from '@/constants'

let _stripe: Stripe | null = null
function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')
  }
  return _stripe
}

export { CREDIT_PACKAGES, MIN_CUSTOM_AMOUNT_EUR }

export function calculateCredits(amountEur: number): number {
  return Math.floor(amountEur * 2)
}

export async function createCheckoutSession(opts: {
  userId: string
  amountEur: number
  credits: number
  purchaseId: string
  origin: string
}): Promise<Stripe.Checkout.Session> {
  return getStripe().checkout.sessions.create({
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'eur',
        unit_amount: Math.round(opts.amountEur * 100),
        product_data: {
          name: `${opts.credits} Hypastack Credits`,
          description: `${opts.credits} credits for Hypastack operations`,
        },
      },
      quantity: 1,
    }],
    metadata: {
      userId: opts.userId,
      credits: opts.credits.toString(),
      amountEur: opts.amountEur.toString(),
      purchaseId: opts.purchaseId,
    },
    success_url: `${opts.origin}/manage?credits=success`,
    cancel_url: `${opts.origin}/manage?credits=cancelled`,
  })
}

export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  return getStripe().webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET || ''
  )
}
