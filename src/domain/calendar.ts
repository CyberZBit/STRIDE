const timeZone = 'Europe/Stockholm';

const clock = new Intl.DateTimeFormat('en-GB', {
  timeZone,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  hourCycle: 'h23',
});

const homeDate = new Intl.DateTimeFormat('en-GB', {
  timeZone, weekday: 'short', day: 'numeric', month: 'short',
});

const sessionDate = new Intl.DateTimeFormat('en-GB', {
  timeZone, day: 'numeric', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

function civilTime(timestamp: number) {
  const parts = clock.formatToParts(timestamp);
  const number = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: number('year'),
    month: number('month'),
    day: number('day'),
    hour: number('hour'),
    minute: number('minute'),
  };
}

function stockholmMidnight(civilDate: Date): number {
  const midnight = civilDate.getTime();
  const local = civilTime(midnight);
  const apparentUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute);
  // Stockholm's daylight-saving transitions occur after local midnight.
  return midnight - (apparentUtc - midnight);
}

export function getWalkingPeriods(now: number) {
  const local = civilTime(now);
  const today = new Date(Date.UTC(local.year, local.month - 1, local.day));
  const monday = new Date(today);
  const tomorrow = new Date(today);
  monday.setUTCDate(today.getUTCDate() - (today.getUTCDay() + 6) % 7);
  tomorrow.setUTCDate(today.getUTCDate() + 1);

  return {
    today: stockholmMidnight(today),
    week: stockholmMidnight(monday),
    tomorrow: stockholmMidnight(tomorrow),
  };
}

export function formatHomeDate(timestamp: number): string {
  return homeDate.format(timestamp);
}

export function formatSessionDate(timestamp: number): string {
  return sessionDate.format(timestamp);
}
