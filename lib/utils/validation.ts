import { z } from 'zod';

export const phoneSchema = z
  .string()
  .min(10, 'Phone number is too short')
  .max(15, 'Phone number is too long')
  .regex(/^[0-9+]+$/, 'Invalid phone number format');

export const nigerianPhoneSchema = z
  .string()
  .regex(
    /^(\+?234|0)[789][01]\d{8}$/,
    'Enter a valid Nigerian phone number'
  );

export function isValidNigerianPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  // Matches 0801..., 234801..., +234801...
  return /^(234|0)[789][01]\d{8}$/.test(cleaned);
}
