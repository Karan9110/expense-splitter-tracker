import { useState } from 'react'
import { formatTimestamp, groupExpensesByDate } from '../logic/history.js'
import { formatRupees } from '../logic/money.js'

function HistoryDashboard({
  members,
  expenses,
  timeline,
  metrics,
  onDeleteExpense,
  onUndoSettlement,
}) {
  const [typeFilter, setTypeFilter] = useState('all')
  const [memberFilter, setMemberFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const memberIds = new Set(members.map((m) => m.id))
  const activeMemberFilter =
    memberFilter === 'all' || memberIds.has(memberFilter) ? memberFilter : 'all'

  const normalizedQuery = searchQuery.trim().toLowerCase()

  const filteredTimeline = timeline.filter((item) => {
    if (typeFilter !== 'all' && item.kind !== typeFilter) {
      return false
    }

    if (activeMemberFilter !== 'all') {
      const involvesMember =
        item.kind === 'expense'
          ? item.payerId === activeMemberFilter ||
            item.participantIds.includes(activeMemberFilter)
          : item.fromId === activeMemberFilter || item.toId === activeMemberFilter
      if (!involvesMember) {
        return false
      }
    }

    if (normalizedQuery) {
      const searchableText =
        item.kind === 'expense'
          ? `${item.title} ${item.payerName} ${item.participantNames.join(' ')}`
          : `settlement ${item.fromName} ${item.toName}`
      if (!searchableText.toLowerCase().includes(normalizedQuery)) {
        return false
      }
    }

    return true
  })

  const hasActiveFilters =
    typeFilter !== 'all' ||
    activeMemberFilter !== 'all' ||
    normalizedQuery.length > 0

  function handleClearFilters() {
    setTypeFilter('all')
    setMemberFilter('all')
    setSearchQuery('')
  }

  const dailyBuckets = groupExpensesByDate(expenses)
  const maxDayPaise = Math.max(1, ...dailyBuckets.map((b) => b.totalPaise))

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1 className="page-title">History Dashboard</h1>
          <p className="page-subtitle">
            Complete chronological ledger of all expenses, split methods, and recorded settlements.
          </p>
        </div>
      </div>

      <section className="kpi-grid" aria-label="History statistics">
        <article className="kpi-card">
          <div className="kpi-label">Activity logged</div>
          <div className="kpi-value">{timeline.length}</div>
          <div className="kpi-meta">
            {metrics.expenseCount} expenses · {metrics.settledCount} settlements
          </div>
        </article>

        <article className="kpi-card">
          <div className="kpi-label">Total volume</div>
          <div className="kpi-value">{formatRupees(metrics.totalSpentPaise)}</div>
          <div className="kpi-meta">
            {formatRupees(metrics.totalSettledPaise)} settled
          </div>
        </article>

        <article className="kpi-card">
          <div className="kpi-label">Average expense</div>
          <div className="kpi-value">
            {formatRupees(metrics.averageExpensePaise)}
          </div>
          <div className="kpi-meta">Per recorded expense</div>
        </article>

        <article className="kpi-card">
          <div className="kpi-label">Largest expense</div>
          <div className="kpi-value">
            {metrics.largestExpense
              ? formatRupees(metrics.largestExpense.amountPaise)
              : formatRupees(0)}
          </div>
          <div className="kpi-meta">
            {metrics.largestExpense ? metrics.largestExpense.title : 'No expenses yet'}
          </div>
        </article>
      </section>

      <div className="history-grid">
        <section className="card" aria-labelledby="timeline-heading">
          <div className="section-header section-header-wrap">
            <div className="section-title-row">
              <h2 id="timeline-heading">Activity Timeline</h2>
              <span className="counter-badge">
                {hasActiveFilters
                  ? `${filteredTimeline.length} of ${timeline.length} shown`
                  : `${timeline.length} total`}
              </span>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                className="btn-link"
                onClick={handleClearFilters}
              >
                Clear filters
              </button>
            )}
          </div>

          <div className="filter-toolbar filter-toolbar-flex">
            <div className="toolbar-field toolbar-search">
              <label htmlFor="history-search" className="toolbar-label">
                Search
              </label>
              <input
                id="history-search"
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search title or member..."
              />
            </div>

            <div className="toolbar-field">
              <label htmlFor="history-type" className="toolbar-label">
                Type
              </label>
              <select
                id="history-type"
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
              >
                <option value="all">All activity</option>
                <option value="expense">Expenses only</option>
                <option value="settlement">Settlements only</option>
              </select>
            </div>

            <div className="toolbar-field">
              <label htmlFor="history-member" className="toolbar-label">
                Member
              </label>
              <select
                id="history-member"
                value={activeMemberFilter}
                onChange={(event) => setMemberFilter(event.target.value)}
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

          {members.length > 0 && (
            <div className="member-chip-bar" role="group" aria-label="Quick member filter">
              <button
                type="button"
                className={`filter-chip ${
                  activeMemberFilter === 'all' ? 'filter-chip-active' : ''
                }`}
                onClick={() => setMemberFilter('all')}
              >
                All
              </button>
              {members.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  className={`filter-chip ${
                    activeMemberFilter === member.id ? 'filter-chip-active' : ''
                  }`}
                  onClick={() =>
                    setMemberFilter(
                      activeMemberFilter === member.id ? 'all' : member.id,
                    )
                  }
                >
                  {member.name}
                </button>
              ))}
            </div>
          )}

          {timeline.length === 0 ? (
            <p className="empty-hint">
              No activity yet. Add expenses or mark settlements to build your history.
            </p>
          ) : filteredTimeline.length === 0 ? (
            <p className="empty-hint">No matching history events found.</p>
          ) : (
            <ul className="timeline-list">
              {filteredTimeline.map((item) => (
                <li key={item.id} className="timeline-item timeline-item-detailed">
                  <div className="timeline-content">
                    <div className="timeline-top">
                      <span
                        className={`type-pill ${
                          item.kind === 'settlement'
                            ? 'type-pill-settlement'
                            : 'type-pill-expense'
                        }`}
                      >
                        {item.kind === 'settlement'
                          ? 'Settlement'
                          : `Expense · ${item.splitMode}`}
                      </span>
                      <span className="timeline-date">
                        {formatTimestamp(item.createdAt)}
                      </span>
                    </div>

                    {item.kind === 'expense' ? (
                      <>
                        <div className="timeline-title">{item.title}</div>
                        <p className="timeline-meta">
                          Paid by <strong>{item.payerName}</strong> · Split among:{' '}
                          {item.participantNames.join(', ')}
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="timeline-title">
                          <strong>{item.fromName}</strong> paid{' '}
                          <strong>{item.toName}</strong>
                        </div>
                        <p className="timeline-meta">
                          Recorded debt settlement payment
                        </p>
                      </>
                    )}
                  </div>

                  <div className="timeline-right">
                    <span className="timeline-amount">
                      {formatRupees(item.amountPaise)}
                    </span>
                    {item.kind === 'expense' ? (
                      <button
                        type="button"
                        className="btn-ghost-danger btn-compact"
                        onClick={() => onDeleteExpense(item.id)}
                        aria-label={`Delete ${item.title}`}
                      >
                        Delete
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-ghost-danger btn-compact"
                        onClick={() => onUndoSettlement(item.id)}
                      >
                        Undo
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card" aria-labelledby="daily-breakdown-heading">
          <div className="section-header">
            <h2 id="daily-breakdown-heading">Daily Spend Breakdown</h2>
          </div>

          {dailyBuckets.length === 0 ? (
            <p className="empty-hint">Daily spending totals will appear here.</p>
          ) : (
            <ul className="daily-list">
              {dailyBuckets.map((bucket) => {
                const widthPct = Math.round((bucket.totalPaise / maxDayPaise) * 100)
                return (
                  <li key={bucket.dateKey} className="daily-item">
                    <div className="daily-top">
                      <span className="daily-date">{bucket.label}</span>
                      <span className="daily-total">
                        {formatRupees(bucket.totalPaise)}
                      </span>
                    </div>
                    <div className="bar-track">
                      <div
                        className="bar-fill bar-fill-paid"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                    <div className="daily-meta">
                      {bucket.count} {bucket.count === 1 ? 'expense' : 'expenses'}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

export default HistoryDashboard
