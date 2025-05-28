// Turn "1 hour" | "2 days" | "1 week" | "3 months" into BullMQ repeat opts
export function parseRepeatInterval(interval: string) {
  const regex =
    /^(\d+)\s*(second|seconds|minute|minutes|hour|hours|day|days|week|weeks|month|months)$/i;
  const m = regex.exec(interval.trim());
  if (!m) throw new Error(`Invalid interval="${interval}"`);
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  const S = 1000; // 1 second in milliseconds
  const M = 60 * S; // 1 minute in milliseconds
  const H = 60 * M; // 1 hour in milliseconds
  const D = 24 * H; // 1 day in milliseconds
  const W = 7 * D; // 1 week in milliseconds
  switch (unit) {
    case 'second':
    case 'seconds':
      return { every: n * S };
    case 'minute':
    case 'minutes':
      return { every: n * M };
    case 'hour':
    case 'hours':
      return { every: n * H };
    case 'day':
    case 'days':
      return { every: n * D };
    case 'week':
    case 'weeks':
      return { every: n * W };
    case 'month':
    case 'months':
      // run at midnight on day 1 of every Nth month
      return { cron: `0 0 1 */${n} *` };
    default:
      throw new Error(`Unsupported unit: ${unit}`);
  }
}
