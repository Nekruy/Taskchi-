const COMMISSION_PERCENT = Number(process.env.COMMISSION_PERCENT) || 5;
const COMMISSION_MAX = Number(process.env.COMMISSION_MAX_SOMONI) || 100;

/**
 * Рассчитывает комиссию: min(сумма * 5%, 100 сомони)
 */
export function calculateCommission(amount: number): number {
  const fee = (amount * COMMISSION_PERCENT) / 100;
  return Math.min(fee, COMMISSION_MAX);
}

/**
 * Сумма, которую получит исполнитель (за вычетом комиссии)
 */
export function executorReceives(amount: number): number {
  return amount - calculateCommission(amount);
}
