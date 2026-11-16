/** When the server trusts an email from a Microsoft (Entra ID) sign-in for staff access. */
import { afterEach, describe, expect, it } from 'vitest';
import { isTrustedMicrosoftAccount, microsoftSignInConfig } from '../../serverAuth';

const msUser = (email: string, providerId = 'microsoft.com') => ({
  email,
  emailVerified: false,
  providerUserInfo: [{ providerId, email }],
});

describe('Microsoft staff sign-in trust', () => {
  afterEach(() => {
    delete process.env.MICROSOFT_TENANT_ID;
    delete process.env.MICROSOFT_STAFF_DOMAINS;
  });
  const enable = () => {
    process.env.MICROSOFT_TENANT_ID = '00000000-0000-0000-0000-000000000000';
    process.env.MICROSOFT_STAFF_DOMAINS = 'auspods.com.au';
  };

  it('is off unless both the tenant and the domains are set', () => {
    expect(microsoftSignInConfig()).toBeNull();
    process.env.MICROSOFT_TENANT_ID = 'abc';
    expect(microsoftSignInConfig()).toBeNull();
    expect(isTrustedMicrosoftAccount(msUser('danh@auspods.com.au'), 'danh@auspods.com.au')).toBe(false);
  });

  it('trusts a Microsoft sign-in on a listed domain', () => {
    enable();
    expect(isTrustedMicrosoftAccount(msUser('danh@auspods.com.au'), 'danh@auspods.com.au')).toBe(true);
  });

  it('does not trust other domains, even from Microsoft', () => {
    enable();
    expect(isTrustedMicrosoftAccount(msUser('danh@auspods.com.au.evil.com'), 'danh@auspods.com.au.evil.com')).toBe(false);
    expect(isTrustedMicrosoftAccount(msUser('someone@gmail.com'), 'someone@gmail.com')).toBe(false);
  });

  it('does not trust a listed domain that signed in some other way', () => {
    enable();
    expect(isTrustedMicrosoftAccount(msUser('danh@auspods.com.au', 'password'), 'danh@auspods.com.au')).toBe(false);
    expect(isTrustedMicrosoftAccount({ email: 'danh@auspods.com.au', providerUserInfo: [] }, 'danh@auspods.com.au')).toBe(false);
  });

  it('does not trust a Microsoft identity whose email differs from the account email', () => {
    enable();
    const user = { email: 'danh@auspods.com.au', providerUserInfo: [{ providerId: 'microsoft.com', email: 'other@auspods.com.au' }] };
    expect(isTrustedMicrosoftAccount(user, 'danh@auspods.com.au')).toBe(false);
  });
});
