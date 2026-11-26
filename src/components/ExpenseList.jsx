import { useState } from 'react'
import { formatRupees } from '../logic/money.js'

function formatSplitSummary(expense, memberNameById) {
  if (expense.splits && expense.splitMode && expense.splitMode !== 'equal') {
    const details = expense.splitAmong
      .map((id) => {
        const name = memberNameById.get(id)
        if (!name) return null
        return `${name} (${formatRupees(expense.splits[id] ?? 0)})`
      })
      .filter(Boolean)
      .join(', ')
    return `Split (${expense.splitMode}): ${details}`
  }

  const names = expense.splitAmong
    .map((id) => memberNameById.get(id))
    .filter(Boolean)
    .join(', ')
  return `Split among: ${names}`
}

function ExpenseList({ members, expenses, onDeleteExpense }) {
  const [filterMemberId, setFilterMemberId] = useState('all')

  const memberNameById = new Map(members.map((m) => [m.id, m.name]))
  const activeFilter =
    filterMemberId === 'all' || memberNameById.has(filterMemberId)
      ? filterMemberId
      : 'all'

  // Reverse first so same-millisecond expenses still preserve newest-added first order.
  const sortedExpenses = [...expenses]
    .reverse()
    .sort((a, b) => b.createdAt - a.createdAt)

  const visibleExpenses =
    activeFilter === 'all'
      ? sortedExpenses
      : sortedExpenses.filter(
          (expense) =>
            expense.paidBy === activeFilter ||
            expense.splitAmong.includes(activeFilter),
        )

  return (
    <section className="card card-full" aria-labelledby="expenses-heading">
      <div className="section-header section-header-wrap">
        <div className="section-title-row">
          <h2 id="expenses-heading">3. Expenses</h2>
          <span className="counter-badge">{expenses.length} total</span>
        </div>

        <div className="filter-control">
          <label htmlFor="expense-filter">Filter</label>
          <select
            id="expense-filter"
            value={activeFilter}
            onChange={(event) => setFilterMemberId(event.target.value)}
            disabled={members.length === 0}
          >
            <option value="all">All members</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {expenses.length === 0 ? (
        <p className="empty-hint">No expenses yet.</p>
      ) : visibleExpenses.length === 0 ? (
        <p className="empty-hint">No expenses found for this member.</p>
      ) : (
        <ul className="expense-list">
          {visibleExpenses.map((expense) => {
            const payerName = memberNameById.get(expense.paidBy) ?? 'Unknown'
            const splitDescription = formatSplitSummary(expense, memberNameById)

            return (
              <li key={expense.id} className="expense-item">
                <div className="expense-main">
                  <div className="expense-top">
                    <span className="expense-title">{expense.title}</span>
                    <span className="expense-amount">
                      {formatRupees(expense.amountPaise)}
                    </span>
                  </div>
                  <p className="expense-meta">
                    Paid by <strong>{payerName}</strong> · {splitDescription}
                  </p>
                </div>

                <button
                  type="button"
                  className="btn-ghost-danger"
                  onClick={() => onDeleteExpense(expense.id)}
                  aria-label={`Delete ${expense.title}`}
                >
                  Delete
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default ExpenseList
