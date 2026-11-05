/**
 * Australian Mobile Phone Validation & Formatting Utilities
 *
 * Requirements:
 * - Must be a valid Australian mobile number before allowing the user to move on.
 * - Standard Australian mobile numbers are 10 digits starting with '04' (e.g. 0412 345 678).
 * - Also supports international formats (+61 4XX XXX XXX, 614XXXXXXXX, 00614XXXXXXXX).
 * - Supports user omission of leading zero (e.g. 412 345 678 -> 9 digits starting with 4).
 * - Explicitly rejects Australian landlines (02, 03, 07, 08), toll-free (13, 1300, 1800),
 *   international non-Australian numbers, and invalid digit lengths.
 */

/**
 * Cleans phone string by removing whitespace, hyphens, brackets, dots.
 */
export function cleanPhoneNumber(phone: string): string {
  if (!phone) return '';
  return phone.replace(/[\s\-\(\)\.]/g, '');
}

/**
 * Validates if the given string is a valid Australian mobile number.
 */
export function isValidAustralianMobile(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;

  const cleaned = cleanPhoneNumber(phone.trim());

  // 1. Standard Australian mobile: 04XXXXXXXX (10 digits starting with 04)
  if (/^04\d{8}$/.test(cleaned)) {
    return true;
  }

  // 2. International format with leading +: +614XXXXXXXX
  if (/^\+614\d{8}$/.test(cleaned)) {
    return true;
  }

  // 3. International format without +: 614XXXXXXXX
  if (/^614\d{8}$/.test(cleaned)) {
    return true;
  }

  // 4. International format with 00: 00614XXXXXXXX
  if (/^00614\d{8}$/.test(cleaned)) {
    return true;
  }

  // 5. Omitted leading zero: 4XXXXXXXX (9 digits starting with 4)
  if (/^4\d{8}$/.test(cleaned)) {
    return true;
  }

  return false;
}

/**
 * Returns a specific, user-friendly validation error message for Australian mobile numbers.
 */
export function getAustralianMobileValidationError(phone: string): string | null {
  if (!phone || !phone.trim()) {
    return 'Please enter a valid Australian mobile number.';
  }

  const cleaned = cleanPhoneNumber(phone.trim());

  if (isValidAustralianMobile(phone)) {
    return null;
  }

  // Landline detection
  if (/^0[2378]\d{8}$/.test(cleaned) || /^\(0[2378]\)/.test(phone.trim())) {
    return 'Landline numbers cannot receive SMS quotes. Please enter an Australian mobile starting with 04 (e.g. 0412 345 678).';
  }

  // 1300 / 1800 detection
  if (/^(1300|1800|13)\d*/.test(cleaned)) {
    return '1300 and 1800 numbers cannot receive SMS quotes. Please enter a mobile number starting with 04.';
  }

  // International non-AU detection
  if (cleaned.startsWith('+') && !cleaned.startsWith('+614')) {
    return 'Please enter an Australian mobile number (+61 4XX XXX XXX or 04XX XXX XXX).';
  }

  if (cleaned.startsWith('04') && cleaned.length < 10) {
    return `Mobile number is too short (${cleaned.length}/10 digits). Format: 0412 345 678`;
  }

  if (cleaned.startsWith('04') && cleaned.length > 10) {
    return `Mobile number is too long (${cleaned.length}/10 digits). Format: 0412 345 678`;
  }

  return 'Please enter a valid Australian mobile number starting with 04 (e.g. 0412 345 678).';
}

/**
 * Formats an Australian mobile number into the canonical display format:
 * '04XX XXX XXX' or '+61 4XX XXX XXX'
 */
export function formatAustralianMobile(phone: string): string {
  if (!phone) return '';
  const cleaned = cleanPhoneNumber(phone.trim());

  if (/^04\d{8}$/.test(cleaned)) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }

  if (/^4\d{8}$/.test(cleaned)) {
    return `0${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }

  if (/^\+614\d{8}$/.test(cleaned)) {
    return `+61 4${cleaned.slice(4, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
  }

  if (/^614\d{8}$/.test(cleaned)) {
    return `04${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
  }

  return phone.trim();
}
