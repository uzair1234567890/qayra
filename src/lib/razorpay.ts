// The razorpay npm package is CommonJS. Vercel's adapter emits ES module
// serverless functions where `require` is not defined, so use Node's official
// ESM->CJS bridge instead of a bare `require(...)`.
import { createRequire } from 'node:module';
import crypto from 'node:crypto';
import { env } from './env';

const require = createRequire(import.meta.url);
const Razorpay = require('razorpay') as typeof import('razorpay');

export const rzp = new Razorpay({
  key_id: env!.RAZORPAY_KEY_ID,
  key_secret: env!.RAZORPAY_KEY_SECRET,
});

export interface CreateRzpOrderInput {
  amountPaise: number;
  receipt: string;
}

export async function createRzpOrder(input: CreateRzpOrderInput) {
  return await rzp.orders.create({
    amount: input.amountPaise,
    currency: 'INR',
    receipt: input.receipt,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

// Pure verifier: takes the secret as a parameter so it is unit-testable
// without the env singleton (which is null outside the Astro/Vite runtime).
export function verifyRzpHmac(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string,
): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  const expectedBuf = Buffer.from(expected);
  const sigBuf = Buffer.from(signature);
  if (expectedBuf.length !== sigBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, sigBuf);
}

// Pure verifier for Razorpay webhook deliveries (HMAC over the raw request body).
export function verifyRzpWebhook(rawBody: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const expectedBuf = Buffer.from(expected);
  const sigBuf = Buffer.from(signature);
  if (expectedBuf.length !== sigBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, sigBuf);
}

export function verifySignature(orderId: string, paymentId: string, signature: string): boolean {
  return verifyRzpHmac(orderId, paymentId, signature, env!.RAZORPAY_KEY_SECRET);
}
