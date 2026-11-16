/** Production must never report a text or payment as done when it wasn't. */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { sendSms, SmsNotSentError } from '../../src/services/smsService';
import { processBraintreePayment } from '../../src/services/braintreeService';

const SMS_KEYS = ['CLICKSEND_USERNAME', 'CLICKSEND_API_KEY', 'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'APP_ENV'];

describe('SMS without a provider', () => {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const k of SMS_KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });
  afterEach(() => {
    for (const k of SMS_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it('is simulated on staging and locally', async () => {
    process.env.APP_ENV = 'staging';
    await expect(sendSms('unknown', '0412345678', 'Hello')).resolves.toMatch(/^SM_SIM_/);
  });

  it('fails in production instead of pretending', async () => {
    process.env.APP_ENV = 'production';
    await expect(sendSms('unknown', '0412345678', 'Hello')).rejects.toBeInstanceOf(SmsNotSentError);
  });
});

describe('Braintree simulator', () => {
  afterEach(() => {
    delete (globalThis as any).window;
  });
  const pay = () =>
    processBraintreePayment({
      amount: 100,
      paymentMethodType: 'paypal',
      customerName: 'Test',
      customerEmail: 'test@example.com',
    } as any);

  it('refuses in production', async () => {
    (globalThis as any).window = { __PUBLIC_ENV__: { VITE_APP_ENV: 'production' } };
    const result = await pay();
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not available/);
  });

  it('still simulates on staging', async () => {
    (globalThis as any).window = { __PUBLIC_ENV__: { VITE_APP_ENV: 'staging' } };
    expect((await pay()).success).toBe(true);
  });
});
