export function formatCoins(value: number | string | null | undefined): string {
  const num = typeof value === 'string' ? Number(value) : value ?? 0;

  if (!Number.isFinite(num)) {
    return '0';
  }

  const sign = num < 0 ? '-' : '';
  const digits = Math.trunc(Math.abs(num)).toString();
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
