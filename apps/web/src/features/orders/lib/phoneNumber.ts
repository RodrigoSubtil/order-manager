import { AsYouType } from 'libphonenumber-js';

// Country calling codes are based on the ITU national numbering plan list.
// Countries sharing a calling code are grouped because the database stores the
// complete international number, not an independent country identifier.
export const phoneCountries = [
  { name: 'Portugal', country: 'PT', code: '351' },
  { name: 'Brasil', country: 'BR', code: '55' },
  { name: 'Espanha', country: 'ES', code: '34' },
  { name: 'França', country: 'FR', code: '33' },
  { name: 'Reino Unido', country: 'GB', code: '44' },
  { name: 'Noruega', country: 'NO', code: '47' },
  { name: 'Alemanha', country: 'DE', code: '49' },
  { name: 'Itália', country: 'IT', code: '39' },
  { name: 'Suíça', country: 'CH', code: '41' },
  { name: 'Luxemburgo', country: 'LU', code: '352' },
  { name: 'Bélgica', country: 'BE', code: '32' },
  { name: 'Países Baixos', country: 'NL', code: '31' },
  { name: 'Irlanda', country: 'IE', code: '353' },
  { name: 'Angola', country: 'AO', code: '244' },
  { name: 'Cabo Verde', country: 'CV', code: '238' },
  { name: 'Moçambique', country: 'MZ', code: '258' },
  { name: 'Guiné-Bissau', country: 'GW', code: '245' },
  { name: 'São Tomé e Príncipe', country: 'ST', code: '239' },
  { name: 'Estados Unidos / Canadá', country: 'US/CA', code: '1' },
] as const;

export const defaultPhoneCountryCode = '351';

const countriesByPrefix = [...phoneCountries].sort(
  (left, right) => right.code.length - left.code.length,
);

export function digitsOnly(value: string) {
  return value.replace(/\D/g, '');
}

export function joinInternationalPhone(countryCode: string, nationalNumber: string) {
  return `${digitsOnly(countryCode)}${digitsOnly(nationalNumber)}`;
}

export function splitInternationalPhone(phone: string) {
  let digits = digitsOnly(phone);
  if (digits.startsWith('00')) digits = digits.slice(2);

  // Earlier orders stored a nine-digit Portuguese number without +351.
  if (digits.length === 9) {
    return {
      countryCode: defaultPhoneCountryCode,
      nationalNumber: digits,
      recognized: true,
    };
  }

  const country = countriesByPrefix.find(
    (item) => digits.startsWith(item.code) && digits.length - item.code.length >= 6,
  );
  if (country) {
    return {
      countryCode: country.code,
      nationalNumber: digits.slice(country.code.length),
      recognized: true,
    };
  }

  // An uncommon number remains editable through the custom calling-code input.
  const countryCodeLength = Math.min(3, Math.max(1, digits.length - 6));
  return {
    countryCode: digits.slice(0, countryCodeLength),
    nationalNumber: digits.slice(countryCodeLength),
    recognized: false,
  };
}

export function formatInternationalPhone(phone: string) {
  if (!phone) return '';
  const { countryCode, nationalNumber } = splitInternationalPhone(phone);
  const fullNumber = joinInternationalPhone(countryCode, nationalNumber);
  const formatted = new AsYouType().input(`+${fullNumber}`);

  // Formatting must never hide or change a digit from an existing customer record.
  return digitsOnly(formatted) === fullNumber ? formatted : `+${countryCode} ${nationalNumber}`;
}

export function formatNationalPhone(countryCode: string, nationalNumber: string) {
  const digits = digitsOnly(nationalNumber);
  if (!digits || !countryCode) return digits;

  const country = phoneCountries.find((item) => item.code === countryCode);
  if (country) {
    const region = country.country === 'US/CA' ? 'US' : country.country;
    const nationalFormatted = new AsYouType(region).input(digits);
    if (nationalFormatted !== digits && digitsOnly(nationalFormatted) === digits) {
      return nationalFormatted;
    }
  }

  const prefix = `+${digitsOnly(countryCode)}`;
  const formatted = new AsYouType().input(`${prefix}${digits}`);
  const nationalFormatted = formatted.startsWith(prefix)
    ? formatted.slice(prefix.length).trimStart()
    : digits;

  return digitsOnly(nationalFormatted) === digits ? nationalFormatted : digits;
}
