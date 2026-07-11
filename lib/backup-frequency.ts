export const BACKUP_FREQUENCIES = ["Daily", "Weekly", "Monthly", "Yearly"] as const;

export type BackupFrequency = (typeof BACKUP_FREQUENCIES)[number];

export function isBackupFrequency(value: string): value is BackupFrequency {
  return (BACKUP_FREQUENCIES as readonly string[]).includes(value);
}

export function getNextBackupDueAt(
  lastBackupAt: Date | null,
  frequency: BackupFrequency,
): Date {
  const base = lastBackupAt ?? new Date(0);
  const next = new Date(base);

  switch (frequency) {
    case "Daily":
      next.setDate(next.getDate() + 1);
      break;
    case "Weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "Monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    case "Yearly":
      next.setFullYear(next.getFullYear() + 1);
      break;
  }

  return next;
}

export function isBackupDue(
  lastBackupAt: string | null | undefined,
  frequency: BackupFrequency,
): boolean {
  if (!lastBackupAt) return true;
  const last = new Date(lastBackupAt);
  if (Number.isNaN(last.getTime())) return true;
  return Date.now() >= getNextBackupDueAt(last, frequency).getTime();
}

export function formatBackupFrequencyLabel(frequency: BackupFrequency): string {
  switch (frequency) {
    case "Daily":
      return "once per day";
    case "Weekly":
      return "once per week";
    case "Monthly":
      return "once per month";
    case "Yearly":
      return "once per year";
  }
}
