import type { UseFormRegisterReturn } from 'react-hook-form';
import { PHONE_COUNTRIES } from '@/lib/shared';

type PhoneInputProps = {
  invalid?: boolean;
  countryProps: UseFormRegisterReturn;
  numberProps: UseFormRegisterReturn;
  countryId?: string;
  numberId?: string;
};

export function PhoneInput({
  invalid = false,
  countryProps,
  numberProps,
  countryId,
  numberId,
}: PhoneInputProps) {
  const state = invalid
    ? 'border-red-300 focus-within:border-red-500 focus-within:ring-red-500/15'
    : 'border-slate-300 focus-within:border-brand-500 focus-within:ring-brand-500/15';

  return (
    <div
      className={`flex items-stretch overflow-hidden rounded-lg border bg-white shadow-sm transition-[border-color,box-shadow] duration-150 ease-out focus-within:ring-4 ${state}`}
    >
      <select
        id={countryId}
        aria-label="Código de país"
        {...countryProps}
        className="shrink-0 cursor-pointer border-r border-slate-200 bg-slate-50 py-2.5 pl-3 pr-2 text-sm text-slate-900 transition-colors duration-150 ease-out focus:outline-none disabled:cursor-not-allowed disabled:text-slate-500"
      >
        {PHONE_COUNTRIES.map((country) => (
          <option key={country.iso} value={country.code}>
            {country.flag} {country.iso} {country.code}
          </option>
        ))}
      </select>
      <input
        id={numberId}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder=""
        {...numberProps}
        className="min-w-0 flex-1 bg-transparent px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
      />
    </div>
  );
}