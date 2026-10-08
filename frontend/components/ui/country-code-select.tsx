import { forwardRef } from 'react';
import { PHONE_COUNTRIES } from '@/lib/shared';

const BASE =
  'w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 ' +
  'shadow-sm transition-colors focus:outline-none ' +
  'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

type CountryCodeSelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean;
};

export const CountryCodeSelect = forwardRef<
  HTMLSelectElement,
  CountryCodeSelectProps
>(function CountryCodeSelect({ invalid = false, className, ...props }, ref) {
  const state = invalid
    ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
    : 'border-slate-300 focus:border-brand-500 focus:ring-brand-500/20';

  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      {...props}
      className={`${BASE} ${state} focus:ring-2 ${className ?? ''}`}
    >
      {PHONE_COUNTRIES.map((country) => (
        <option key={country.iso} value={country.code}>
          {country.iso} {country.code}
        </option>
      ))}
    </select>
  );
});