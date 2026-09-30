const UNITS = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };

export function parseDurationToMs(duration: string | number): number {
  if (typeof duration === 'number') {
    return duration;
  }

  const match = /^(\d+)([smhd])$/.exec(duration);

  if (!match) {
    return Number(duration);
  }

  return Number(match[1]) * UNITS[match[2]];
}

export function parseDurationToSeconds(duration: string | number): number {
  return Math.floor(parseDurationToMs(duration) / 1000);
}
