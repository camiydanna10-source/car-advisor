// Phone numbers are stored in international format (E.164, e.g. +34600111222) so the same value
// works for tel: links, WhatsApp and a future SMS/voice provider.

// Spanish mobiles/landlines are 9 digits starting with 6-9; other countries are accepted with "+".
export function normalizePhone(input: string): string | null {
  const cleaned = input.trim().replace(/[\s().-]/g, '');
  const international = cleaned.startsWith('00') ? `+${cleaned.slice(2)}` : cleaned;

  if (international.startsWith('+')) {
    const digits = international.slice(1);
    if (!/^\d{8,15}$/.test(digits)) return null;
    if (digits.startsWith('34')) {
      const national = digits.slice(2);
      return /^[6-9]\d{8}$/.test(national) ? `+34${national}` : null;
    }
    return `+${digits}`;
  }
  return /^[6-9]\d{8}$/.test(international) ? `+34${international}` : null;
}

// "+34600111222" -> "+34 600 111 222"
export function formatPhone(phone: string): string {
  const m = /^\+34(\d{3})(\d{3})(\d{3})$/.exec(phone);
  return m ? `+34 ${m[1]} ${m[2]} ${m[3]}` : phone;
}

export const telUrl = (phone: string) => `tel:${phone}`;

export const whatsappUrl = (phone: string, text?: string) =>
  `https://wa.me/${phone.replace('+', '')}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

export const PHONE_ERROR = 'Introduce un teléfono válido (9 dígitos, por ejemplo 600 123 456).';
