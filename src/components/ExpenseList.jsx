import { useState } from 'react'
import { formatTimestamp } from '../logic/history.js'
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
  const [memberRole, setMemberRole] = useState('any')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest')

  const memberNameById = new Map(members.map((m) => [m.id, m.name]))
  const activeFilter =
    filterMemberId === 'all' || memberNameById.has(filterMemberId)
      ? filterMemberId
      : 'all'

  // Reverse first so same-millisecond expenses still preserve newest-added first order.
  const sortedExpenses = [...expenses].reverse().sort((a, b) => {
    if (sortBy === 'highest') {
      return b.amountPaise - a.amountPaise || b.createdAt - a.createdAt
    }
    return b.createdAt - a.createdAt
  })

  const normalizedQuery = searchQuery.trim().toLowerCase()

  const visibleExpenses = sortedExpenses.filter((expense) => {
    if (activeFilter !== 'all') {
      if (memberRole === 'paid' && expense.paidBy !== activeFilter) {
        return false
      }
      if (
        memberRole === 'split' &&
        !expense.splitAmong.includes(activeFilter)
      ) {
        return false
      }
      if (
        memberRole === 'any' &&
        expense.paidBy !== activeFilter &&
        !expense.splitAmong.includes(activeFilter)
      ) {
        return false
      }
    }

    if (normalizedQuery) {
      const payer = memberNameById.get(expense.paidBy) ?? ''
      const participants = expense.splitAmong
        .map((id) => memberNameById.get(id) ?? '')
        .join(' ')
      const haystack = `${expense.title} ${payer} ${participants}`.toLowerCase()
      return haystack.includes(normalizedQuery)
    }

    return true
  })

  const hasActiveFilters = activeFilter !== 'all' || normalizedQuery.length > 0

  function handleResetFilters() {
    setFilterMemberId('all')
    setMemberRole('any')
    setSearchQuery('')
  }

  return (
    <section className="card" aria-labelledby="expenses-heading">
      <div className="section-header section-header-wrap">
        <div className="section-title-row">
          <h2 id="expenses-heading">Expense Ledger</h2>
          <span className="counter-badge">
            {hasActiveFilters
              ? `${visibleExpenses.length} of ${expenses.length} shown`
              : `${expenses.length} total`}
          </span>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            className="btn-link"
            onClick={handleResetFilters}
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="filter-toolbar filter-toolbar-flex">
        <div className="toolbar-field toolbar-search">
          <label htmlFor="expense-search" className="toolbar-label">
            Search
          </label>
          <input
            id="expense-search"
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Title or member..."
          />
        </div>

        <div className="toolbar-field">
          <label htmlFor="expense-filter" className="toolbar-label">
            Member
          </label>
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

        {activeFilter !== 'all' && (
          <div className="toolbar-field">
            <label htmlFor="expense-role-filter" className="toolbar-label">
              Role
            </label>
            <select
              id="expense-role-filter"
              value={memberRole}
              onChange={(event) => setMemberRole(event.target.value)}
            >
              <option value="any">Paid or split</option>
              <option value="paid">Paid by</option>
              <option value="split">In split</option>
            </select>
          </div>
        )}

        <div className="toolbar-field">
          <label htmlFor="expense-sort" className="toolbar-label">
            Sort
          </label>
          <select
            id="expense-sort"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
          >
            <option value="newest">Newest first</option>
            <option value="highest">Highest amount</option>
          </select>
        </div>
      </div>

      {members.length > 0 && (
        <div className="member-chip-bar" role="group" aria-label="Quick member filter">
          <button
            type="button"
            className={`filter-chip ${activeFilter === 'all' ? 'filter-chip-active' : ''}`}
            onClick={() => setFilterMemberId('all')}
          >
            All
          </button>
          {members.map((member) => (
            <button
              key={member.id}
              type="button"
              className={`filter-chip ${
                activeFilter === member.id ? 'filter-chip-active' : ''
              }`}
              onClick={() =>
                setFilterMemberId(activeFilter === member.id ? 'all' : member.id)
              }
            >
              {member.name}
            </button>
          ))}
        </div>
      )}

      {expenses.length === 0 ? (
        <p className="empty-hint">No expenses yet.</p>
      ) : visibleExpenses.length === 0 ? (
        <p className="empty-hint">No expenses match your filters.</p>
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
                  <p className="expense-time">
                    {formatTimestamp(expense.createdAt)}
                  </p>
                </div>

                <button
                  type="button"
                  className="btn-ghost-danger btn-compact"
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
