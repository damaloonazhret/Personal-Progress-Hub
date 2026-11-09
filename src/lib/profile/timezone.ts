export const FALLBACK_TIME_ZONE = "Etc/GMT+12";

const timeZonePattern = /^[A-Za-z0-9_+-]+(?:\/[A-Za-z0-9_+-]+)*$/;

export function isIanaTimeZone(value: string) {
  if (value.length === 0 || value.length > 64 || !timeZonePattern.test(value)) {
    return false;
  }

  try {
    Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export function localDateInTimeZone(timeZone: string, now = new Date()) {
  const zone = isIanaTimeZone(timeZone) ? timeZone : FALLBACK_TIME_ZONE;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}
