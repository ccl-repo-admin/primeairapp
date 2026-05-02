export type PayPeriodType = "WEEKLY" | "BIWEEKLY" | "SEMIMONTHLY" | "MONTHLY";

export interface PayPeriod {
  start: Date;
  end: Date;
  label: string;
}

export function getCurrentPayPeriod(
  type: PayPeriodType,
  anchor?: Date | null
): PayPeriod {
  const now = new Date();

  if (type === "SEMIMONTHLY") {
    const year = now.getFullYear();
    const month = now.getMonth();
    if (now.getDate() <= 15) {
      const start = new Date(year, month, 1, 0, 0, 0, 0);
      const end = new Date(year, month, 15, 23, 59, 59, 999);
      return { start, end, label: `${fmtMonth(now)} 1–15` };
    } else {
      const start = new Date(year, month, 16, 0, 0, 0, 0);
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
      return { start, end, label: `${fmtMonth(now)} 16–${end.getDate()}` };
    }
  }

  if (type === "MONTHLY") {
    const year = now.getFullYear();
    const month = now.getMonth();
    const start = new Date(year, month, 1, 0, 0, 0, 0);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
    return { start, end, label: fmtMonth(now) };
  }

  // WEEKLY or BIWEEKLY — need an anchor date
  const periodDays = type === "WEEKLY" ? 7 : 14;
  // Default anchor: the most recent Monday before or on today
  const anchorMs = anchor
    ? stripTime(anchor).getTime()
    : mondayBefore(now).getTime();

  const nowMs = stripTime(now).getTime();
  const daysSince = Math.floor((nowMs - anchorMs) / 86400000);
  const periodsElapsed = Math.floor(daysSince / periodDays);
  const start = new Date(anchorMs + periodsElapsed * periodDays * 86400000);
  const end = new Date(start.getTime() + periodDays * 86400000 - 1);

  const label =
    type === "WEEKLY"
      ? `Week of ${fmtShort(start)}`
      : `${fmtShort(start)} – ${fmtShort(end)}`;
  return { start, end, label };
}

function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function mondayBefore(d: Date): Date {
  const day = d.getDay(); // 0=Sun
  const diff = (day + 6) % 7; // days since Monday
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff);
}

function fmtMonth(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function fmtShort(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function getAdjacentPayPeriod(
  currentStart: Date,
  type: PayPeriodType,
  direction: -1 | 1,
  anchor?: Date | null
): PayPeriod {
  if (type === "MONTHLY") {
    const year = currentStart.getFullYear();
    const month = currentStart.getMonth() + direction;
    const start = new Date(year, month, 1, 0, 0, 0, 0);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
    return { start, end, label: fmtMonth(start) };
  }

  if (type === "SEMIMONTHLY") {
    const day = currentStart.getDate();
    const year = currentStart.getFullYear();
    const month = currentStart.getMonth();
    if (direction === 1) {
      if (day === 1) {
        const start = new Date(year, month, 16, 0, 0, 0, 0);
        const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
        return { start, end, label: `${fmtMonth(start)} 16–${end.getDate()}` };
      } else {
        const start = new Date(year, month + 1, 1, 0, 0, 0, 0);
        const end = new Date(year, month + 1, 15, 23, 59, 59, 999);
        return { start, end, label: `${fmtMonth(start)} 1–15` };
      }
    } else {
      if (day === 1) {
        const start = new Date(year, month - 1, 16, 0, 0, 0, 0);
        const end = new Date(year, month, 0, 23, 59, 59, 999);
        return { start, end, label: `${fmtMonth(start)} 16–${end.getDate()}` };
      } else {
        const start = new Date(year, month, 1, 0, 0, 0, 0);
        const end = new Date(year, month, 15, 23, 59, 59, 999);
        return { start, end, label: `${fmtMonth(start)} 1–15` };
      }
    }
  }

  // WEEKLY or BIWEEKLY
  const periodDays = type === "WEEKLY" ? 7 : 14;
  const start = new Date(stripTime(currentStart).getTime() + direction * periodDays * 86400000);
  const end = new Date(start.getTime() + periodDays * 86400000 - 1);
  const label =
    type === "WEEKLY"
      ? `Week of ${fmtShort(start)}`
      : `${fmtShort(start)} – ${fmtShort(end)}`;
  return { start, end, label };
}

export function toDateInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
