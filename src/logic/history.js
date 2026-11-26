/**
 * Build a unified, newest-first activity timeline combining expenses and recorded settlements.
 */
export function buildActivityTimeline(members, expenses, settlements = []) {
  const memberNameById = new Map(members.map((m) => [m.id, m.name]))

  const expenseEvents = expenses.map((expense, index) => ({
    kind: 'expense',
    id: expense.id,
    createdAt: expense.createdAt,
    order: index,
    title: expense.title,
    amountPaise: expense.amountPaise,
    payerId: expense.paidBy,
    payerName: memberNameById.get(expense.paidBy) ?? 'Unknown',
    participantIds: expense.splitAmong,
    participantNames: expense.splitAmong
      .map((id) => memberNameById.get(id))
      .filter(Boolean),
    splitMode: expense.splitMode ?? 'equal',
    splits: expense.splits,
  }))

  const settlementEvents = settlements.map((settlement, index) => ({
    kind: 'settlement',
    id: settlement.id,
    createdAt: settlement.createdAt,
    order: expenses.length + index,
    title: 'Settlement recorded',
    amountPaise: settlement.amountPaise,
    fromId: settlement.from,
    fromName: memberNameById.get(settlement.from) ?? 'Unknown',
    toId: settlement.to,
    toName: memberNameById.get(settlement.to) ?? 'Unknown',
    participantIds: [settlement.from, settlement.to],
  }))

  return [...expenseEvents, ...settlementEvents].sort(
    (a, b) => b.createdAt - a.createdAt || b.order - a.order,
  )
}

/**
 * Compute overview KPI metrics for the Dashboard and History pages (all money in integer paise).
 */
export function computeDashboardMetrics(
  expenses,
  settlements = [],
  recommendedPayments = [],
) {
  const totalSpentPaise = expenses.reduce((sum, e) => sum + e.amountPaise, 0)
  const expenseCount = expenses.length
  const averageExpensePaise =
    expenseCount > 0 ? Math.round(totalSpentPaise / expenseCount) : 0

  let largestExpense = null
  for (const expense of expenses) {
    if (!largestExpense || expense.amountPaise > largestExpense.amountPaise) {
      largestExpense = expense
    }
  }

  const totalSettledPaise = settlements.reduce((sum, s) => sum + s.amountPaise, 0)
  const pendingSettlementPaise = recommendedPayments.reduce(
    (sum, p) => sum + p.amountPaise,
    0,
  )

  return {
    totalSpentPaise,
    expenseCount,
    averageExpensePaise,
    largestExpense,
    totalSettledPaise,
    settledCount: settlements.length,
    pendingSettlementPaise,
    pendingCount: recommendedPayments.length,
  }
}

/**
 * Group expenses by local calendar day (newest first) for the History breakdown.
 */
export function groupExpensesByDate(expenses) {
  const byDate = new Map()

  for (const expense of expenses) {
    const date = new Date(expense.createdAt)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateKey = `${year}-${month}-${day}`

    if (!byDate.has(dateKey)) {
      byDate.set(dateKey, {
        dateKey,
        label: date.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        count: 0,
        totalPaise: 0,
      })
    }

    const bucket = byDate.get(dateKey)
    bucket.count += 1
    bucket.totalPaise += expense.amountPaise
  }

  return [...byDate.values()].sort((a, b) => b.dateKey.localeCompare(a.dateKey))
}

/**
 * Format a millisecond timestamp into a concise readable date-time string.
 */
export function formatTimestamp(timestampMs) {
  return new Date(timestampMs).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
