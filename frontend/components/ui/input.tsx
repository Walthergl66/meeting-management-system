import { forwardRef } from 'react';

const BASE =
  'w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 ' +
  'placeholder:text-slate-400 shadow-sm transition-colors focus:outline-none ' +
  'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid = false, className, ...props },
  ref,
) {
  const state = invalid
    ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
    : 'border-slate-300 focus:border-brand-500 focus:ring-brand-500/20';

  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      {...props}
      className={`${BASE} ${state} focus:ring-2 ${className ?? ''}`}
    />
  );
});
