type LogoMarkProps = {
  className?: string;
};

export function LogoMark({ className }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className ?? 'h-8 w-8'}
    >
      <rect width="32" height="32" rx="9" fill="url(#meetflow-mark)" />
      <path
        d="M10.5 7.5v3.5M21.5 7.5v3.5"
        stroke="#fff"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
      <rect
        x="7.25"
        y="10.75"
        width="17.5"
        height="13.5"
        rx="3"
        stroke="#fff"
        strokeWidth="2.25"
      />
      <path
        d="M12 17.75l3.25 3.25L20.5 15.5"
        stroke="#fff"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient
          id="meetflow-mark"
          x1="0"
          y1="0"
          x2="32"
          y2="32"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#84cc16" />
          <stop offset="1" stopColor="#4d7c0f" />
        </linearGradient>
      </defs>
    </svg>
  );
}

type LogoProps = {
  className?: string;
  tone?: 'default' | 'inverse';
  size?: 'sm' | 'md';
};

export function Logo({ className, tone = 'default', size = 'md' }: LogoProps) {
  const text =
    tone === 'inverse' ? 'text-white' : 'text-slate-900';
  const mark = size === 'sm' ? 'h-7 w-7' : 'h-8 w-8';
  const label =
    size === 'sm' ? 'text-base' : 'text-lg';

  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ''}`}>
      <LogoMark className={mark} />
      <span
        className={`${label} font-semibold tracking-tight ${text}`}
      >
        MeetFlow
      </span>
    </span>
  );
}
