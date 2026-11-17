export type DistanceUnit = 'km' | 'mi';

const locale = 'en-GB';
const distanceNumber = new Intl.NumberFormat(locale, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const speedNumber = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
const stepNumber = new Intl.NumberFormat(locale);

function metersPerUnit(unit: DistanceUnit): number {
  return unit === 'km' ? 1000 : 1609.344;
}

export function formatDistance(meters: number, unit: DistanceUnit): string {
  return distanceNumber.format(meters / metersPerUnit(unit));
}

export function formatSpeed(metersPerSecond: number, unit: DistanceUnit): string {
  return `${speedNumber.format(metersPerSecond * 3600 / metersPerUnit(unit))} ${unit}/h`;
}

export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds / 60) % 60;
  const remainder = String(seconds % 60).padStart(2, '0');
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${remainder}` : `${minutes}:${remainder}`;
}

export function formatSteps(steps: number | null): string {
  return steps === null ? '—' : stepNumber.format(steps);
}
