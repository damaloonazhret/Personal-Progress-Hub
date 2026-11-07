export type TRestoreSource = "calendar" | "today" | "completed";

export function restoreScheduledDate(source: TRestoreSource, scheduledDate: string | null) {
  if (source === "calendar") {
    return scheduledDate;
  }

  return null;
}
