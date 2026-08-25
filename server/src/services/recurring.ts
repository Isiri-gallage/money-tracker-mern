import { RecurringTransaction } from "../models/RecurringTransaction.js";
import { Transaction } from "../models/Transaction.js";

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const targetMonth = d.getMonth() + months;
  d.setMonth(targetMonth);
  if (d.getMonth() !== ((targetMonth % 12) + 12) % 12) {
    d.setDate(0);
  }
  return d;
}

export function advance(date: Date, frequency: "daily" | "weekly" | "monthly"): Date {
  switch (frequency) {
    case "daily":
      return new Date(date.getTime() + 24 * 60 * 60 * 1000);
    case "weekly":
      return new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000);
    case "monthly":
      return addMonths(date, 1);
  }
}

export async function runDueRecurringTransactions(): Promise<number> {
  const now = new Date();
  const due = await RecurringTransaction.find({ active: true, nextRunDate: { $lte: now } });

  let created = 0;
  for (const r of due) {
    while (r.nextRunDate <= now) {
      await Transaction.create({
        user: r.user,
        account: r.account,
        category: r.category,
        amount: r.amount,
        type: r.type,
        description: r.description,
        date: r.nextRunDate,
      });
      r.lastRunDate = r.nextRunDate;
      r.nextRunDate = advance(r.nextRunDate, r.frequency);
      created++;
    }
    await r.save();
  }

  return created;
}