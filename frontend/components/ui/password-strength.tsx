const LEVELS = [
  { label: 'Muy débil', bar: 'bg-red-500', text: 'text-red-600' },
  { label: 'Débil', bar: 'bg-orange-500', text: 'text-orange-600' },
  { label: 'Media', bar: 'bg-amber-500', text: 'text-amber-600' },
  { label: 'Fuerte', bar: 'bg-emerald-500', text: 'text-emerald-600' },
] as const;

export function passwordScore(password: string): number {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(Math.max(score, 1), LEVELS.length);
}

export function PasswordStrength({ password }: { password: string }) {
  if (!password) {
    return null;
  }

  const score = passwordScore(password);
  const level = LEVELS[score - 1];

  return (
    <div className="flex flex-col gap-1.5 animate-fade-in">
      <div className="flex gap-1" aria-hidden="true">
        {LEVELS.map((item, index) => (
          <span
            key={item.label}
            className={`h-1 flex-1 rounded-full ${
              index < score ? item.bar : 'bg-slate-200'
            }`}
          />
        ))}
      </div>
      <p
        role="status"
        className={`text-xs font-medium ${level.text}`}
      >
        Contraseña {level.label.toLowerCase()}
      </p>
    </div>
  );
}