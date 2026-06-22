import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

export function formatDate(date: string | undefined | null): string {
  if (!date) return '-';
  return dayjs(date).format('YYYY-MM-DD HH:mm');
}

export function formatRelativeTime(date: string | undefined | null): string {
  if (!date) return '-';
  return dayjs(date).fromNow();
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '...';
}

export function getDaysUntilExpiry(expireAt: string | undefined | null): number | null {
  if (!expireAt) return null;
  return dayjs(expireAt).diff(dayjs(), 'day');
}

export function isExpired(expireAt: string | undefined | null): boolean {
  if (!expireAt) return false;
  return dayjs(expireAt).isBefore(dayjs());
}

export function isExpiringSoon(expireAt: string | undefined | null, days = 30): boolean {
  if (!expireAt) return false;
  const daysLeft = getDaysUntilExpiry(expireAt);
  return daysLeft !== null && daysLeft >= 0 && daysLeft <= days;
}
