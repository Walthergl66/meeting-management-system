export interface PhoneCountry {
  iso: string;
  name: string;
  code: string;
  flag: string;
}

function flagEmoji(iso: string): string {
  return iso.replace(/./g, (char) =>
    String.fromCodePoint(127397 + char.charCodeAt(0)),
  );
}

const COUNTRIES: Omit<PhoneCountry, 'flag'>[] = [
  { iso: 'MX', name: 'México', code: '+52' },
  { iso: 'AR', name: 'Argentina', code: '+54' },
  { iso: 'ES', name: 'España', code: '+34' },
  { iso: 'CO', name: 'Colombia', code: '+57' },
  { iso: 'CL', name: 'Chile', code: '+56' },
  { iso: 'PE', name: 'Perú', code: '+51' },
  { iso: 'VE', name: 'Venezuela', code: '+58' },
  { iso: 'EC', name: 'Ecuador', code: '+593' },
  { iso: 'GT', name: 'Guatemala', code: '+502' },
  { iso: 'CU', name: 'Cuba', code: '+53' },
  { iso: 'BO', name: 'Bolivia', code: '+591' },
  { iso: 'DO', name: 'República Dominicana', code: '+1' },
  { iso: 'HN', name: 'Honduras', code: '+504' },
  { iso: 'PY', name: 'Paraguay', code: '+595' },
  { iso: 'SV', name: 'El Salvador', code: '+503' },
  { iso: 'NI', name: 'Nicaragua', code: '+505' },
  { iso: 'CR', name: 'Costa Rica', code: '+506' },
  { iso: 'PA', name: 'Panamá', code: '+507' },
  { iso: 'UY', name: 'Uruguay', code: '+598' },
  { iso: 'PR', name: 'Puerto Rico', code: '+1' },
  { iso: 'US', name: 'Estados Unidos', code: '+1' },
  { iso: 'CA', name: 'Canadá', code: '+1' },
  { iso: 'BR', name: 'Brasil', code: '+55' },
  { iso: 'PT', name: 'Portugal', code: '+351' },
  { iso: 'FR', name: 'Francia', code: '+33' },
  { iso: 'DE', name: 'Alemania', code: '+49' },
  { iso: 'IT', name: 'Italia', code: '+39' },
  { iso: 'GB', name: 'Reino Unido', code: '+44' },
];

export const PHONE_COUNTRIES: PhoneCountry[] = COUNTRIES.map((country) => ({
  ...country,
  flag: flagEmoji(country.iso),
}));

const REGION_DIAL: Record<string, string> = Object.fromEntries(
  PHONE_COUNTRIES.map((country) => [country.iso, country.code]),
);

export function defaultPhoneCountry(
  locale = Intl.DateTimeFormat().resolvedOptions().locale,
): string {
  const region = locale.split('-')[1]?.toUpperCase();
  return region && REGION_DIAL[region] ? REGION_DIAL[region] : '+52';
}