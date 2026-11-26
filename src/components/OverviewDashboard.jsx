import { MAX_MEMBERS, MIN_MEMBERS } from '../constants.js'
import { formatTimestamp } from '../logic/history.js'
import { formatRupees } from '../logic/money.js'
import BalanceTable from './BalanceTable.jsx'

function OverviewDashboard({
  members,
  balances,
  recommendedPayments,
  metrics,
  recentActivity,
  onNavigate,
  onMarkSettled,
}) {
  const memberNameById = new Map(members.map((m) => [m.id, m.name]))
  const maxBarPaise = Math.max(
    1,
    ...balances.flatMap((b) => [b.paidPaise, b.sharePaise]),
  )

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1 className="page-title">Overview</h1>
          <p className="page-subtitle">
            Live snapshot of group spending, net balances, and minimum settle-up transfers.
          </p>
        </div>
        <div className="page-actions">
          {members.length < MIN_MEMBERS ? (
            <button
              type="button"
              className="btn-primary"
              onClick={() => onNavigate('members')}
            >
              + Add members
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary"
              onClick={() => onNavigate('expenses')}
            >
              + Add expense
            </button>
          )}
        </div>
      </div>

      {members.length < MIN_MEMBERS && (
        <div className="onboarding-banner" role="status">
          <div>
            <strong>Get started:</strong> Add at least {MIN_MEMBERS} members to
            begin logging shared expenses.
          </div>
          <button
            type="button"
            className="btn-secondary btn-compact"
            onClick={() => onNavigate('members')}
          >
            Go to Members
          </button>
        </div>
      )}

      <section className="kpi-grid" aria-label="Group summary metrics">
        <article className="kpi-card">
          <div className="kpi-label">Total spent</div>
          <div className="kpi-value">{formatRupees(metrics.totalSpentPaise)}</div>
          <div className="kpi-meta">
            Across {metrics.expenseCount}{' '}
            {metrics.expenseCount === 1 ? 'expense' : 'expenses'}
          </div>
        </article>

        <article className="kpi-card">
          <div className="kpi-label">Group members</div>
          <div className="kpi-value">
            {members.length} <span className="kpi-denom">/ {MAX_MEMBERS}</span>
          </div>
          <div className="kpi-meta">
            <button
              type="button"
              className="btn-link"
              onClick={() => onNavigate('members')}
            >
              Manage members →
            </button>
          </div>
        </article>

        <article className="kpi-card">
          <div className="kpi-label">Pending settle-up</div>
          <div className="kpi-value">
            {formatRupees(metrics.pendingSettlementPaise)}
          </div>
          <div className="kpi-meta">
            {metrics.pendingCount === 0
              ? 'All settled up'
              : `${metrics.pendingCount} minimum ${
                  metrics.pendingCount === 1 ? 'payment' : 'payments'
                }`}
          </div>
        </article>

        <article className="kpi-card">
          <div className="kpi-label">Settled so far</div>
          <div className="kpi-value">{formatRupees(metrics.totalSettledPaise)}</div>
          <div className="kpi-meta">
            {metrics.settledCount} recorded{' '}
            {metrics.settledCount === 1 ? 'payment' : 'payments'}
          </div>
        </article>
      </section>

      <div className="overview-grid">
        <section className="card" aria-labelledby="spend-share-heading">
          <div className="section-header">
            <h2 id="spend-share-heading">Paid vs. Share</h2>
            <button
              type="button"
              className="btn-link"
              onClick={() => onNavigate('settle')}
            >
              Full breakdown →
            </button>
          </div>

          {balances.length === 0 ? (
            <p className="empty-hint">
              Add members and expenses to visualize paid vs. share.
            </p>
          ) : (
            <div className="bar-chart-list">
              {balances.map((row) => {
                const paidWidth = Math.round((row.paidPaise / maxBarPaise) * 100)
                const shareWidth = Math.round((row.sharePaise / maxBarPaise) * 100)
                return (
                  <div key={row.memberId} className="bar-chart-item">
                    <div className="bar-chart-top">
                      <span className="bar-member-name">{row.name}</span>
                      <span
                        className={`bar-net-text ${
                          row.netPaise > 0
                            ? 'text-positive'
                            : row.netPaise < 0
                              ? 'text-danger'
                              : 'text-muted'
                        }`}
                      >
                        {row.netPaise > 0
                          ? `+${formatRupees(row.netPaise)}`
                          : formatRupees(row.netPaise)}
                      </span>
                    </div>
                    <div className="bar-pair">
                      <div className="bar-row">
                        <span className="bar-tag">Paid</span>
                        <div className="bar-track">
                          <div
                            className="bar-fill bar-fill-paid"
                            style={{ width: `${paidWidth}%` }}
                          />
                        </div>
                        <span className="bar-amount">
                          {formatRupees(row.paidPaise)}
                        </span>
                      </div>
                      <div className="bar-row">
                        <span className="bar-tag">Share</span>
                        <div className="bar-track">
                          <div
                            className="bar-fill bar-fill-share"
                            style={{ width: `${shareWidth}%` }}
                          />
                        </div>
                        <span className="bar-amount">
                          {formatRupees(row.sharePaise)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="card" aria-labelledby="quick-settle-heading">
          <div className="section-header">
            <h2 id="quick-settle-heading">Settle-Up Plan</h2>
            <button
              type="button"
              className="btn-link"
              onClick={() => onNavigate('settle')}
            >
              Open Settle Up →
            </button>
          </div>

          {members.length < MIN_MEMBERS ? (
            <p className="empty-hint">
              Add at least {MIN_MEMBERS} members to calculate settlements.
            </p>
          ) : recommendedPayments.length === 0 ? (
            <p className="settled-banner">All settled up 🎉</p>
          ) : (
            <ul className="settle-list">
              {recommendedPayments.slice(0, 4).map((payment) => {
                const fromName = memberNameById.get(payment.from) ?? 'Unknown'
                const toName = memberNameById.get(payment.to) ?? 'Unknown'
                return (
                  <li
                    key={`${payment.from}-${payment.to}`}
                    className="settle-item"
                  >
                    <span className="settle-text">
                      <strong>{fromName}</strong> pays <strong>{toName}</strong>{' '}
                      <span className="settle-amount">
                        {formatRupees(payment.amountPaise)}
                      </span>
                    </span>
                    <button
                      type="button"
                      className="btn-secondary btn-compact"
                      onClick={() => onMarkSettled(payment)}
                    >
                      Mark settled
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      <div className="overview-grid">
        <BalanceTable balances={balances} />

        <section className="card" aria-labelledby="recent-activity-heading">
          <div className="section-header">
            <h2 id="recent-activity-heading">Recent Activity</h2>
            <button
              type="button"
              className="btn-link"
              onClick={() => onNavigate('history')}
            >
              View History →
            </button>
          </div>

          {recentActivity.length === 0 ? (
            <p className="empty-hint">No expenses or settlements logged yet.</p>
          ) : (
            <ul className="timeline-list">
              {recentActivity.slice(0, 5).map((item) => (
                <li key={item.id} className="timeline-item">
                  <div className="timeline-content">
                    <div className="timeline-top">
                      <span
                        className={`type-pill ${
                          item.kind === 'settlement'
                            ? 'type-pill-settlement'
                            : 'type-pill-expense'
                        }`}
                      >
                        {item.kind === 'settlement' ? 'Settled' : 'Expense'}
                      </span>
                      <span className="timeline-date">
                        {formatTimestamp(item.createdAt)}
                      </span>
                    </div>
                    <div className="timeline-title">
                      {item.kind === 'expense' ? (
                        <>
                          <strong>{item.title}</strong> · Paid by {item.payerName}
                        </>
                      ) : (
                        <>
                          <strong>{item.fromName}</strong> paid{' '}
                          <strong>{item.toName}</strong>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="timeline-amount">
                    {formatRupees(item.amountPaise)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

export default OverviewDashboard
