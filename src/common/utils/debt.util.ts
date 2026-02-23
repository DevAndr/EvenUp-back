export interface DebtBalance {
  userId: string;
  balance: number; // положительный = должны этому пользователю, отрицательный = он должен
}

export interface DebtTransfer {
  fromUserId: string;
  toUserId: string;
  amount: number;
}

/**
 * Алгоритм минимизации переводов (debt simplification).
 * Жадно сопоставляет должников с кредиторами, минимизируя количество транзакций.
 */
export function simplifyDebts(balances: DebtBalance[]): DebtTransfer[] {
  const EPSILON = 0.001;
  const transfers: DebtTransfer[] = [];

  const debtors = balances
    .filter((b) => b.balance < -EPSILON)
    .map((b) => ({ userId: b.userId, amount: -b.balance }))
    .sort((a, b) => b.amount - a.amount);

  const creditors = balances
    .filter((b) => b.balance > EPSILON)
    .map((b) => ({ userId: b.userId, amount: b.balance }))
    .sort((a, b) => b.amount - a.amount);

  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(debtor.amount, creditor.amount);

    transfers.push({
      fromUserId: debtor.userId,
      toUserId: creditor.userId,
      amount: Math.round(amount * 100) / 100,
    });

    debtor.amount -= amount;
    creditor.amount -= amount;

    if (debtor.amount < EPSILON) i++;
    if (creditor.amount < EPSILON) j++;
  }

  return transfers;
}
