import { MIN_MEMBERS } from '../constants.js'
import { formatRupees } from '../logic/money.js'

function SettleUp({
  recommendedPayments,
  recordedSettlements = [],
  members,
  onMarkSettled,
  onUndoSettlement,
}) {
  const memberNameById = new Map(members.map((m) => [m.id, m.name]))

  return (
    <section className="card" aria-labelledby="settle-heading">
      <div className="section-header">
        <h2 id="settle-heading">5. Settle up</h2>
        {recommendedPayments.length > 0 && (
          <span className="counter-badge">
            {recommendedPayments.length}{' '}
            {recommendedPayments.length === 1 ? 'payment' : 'payments'}
          </span>
        )}
      </div>

      {members.length < MIN_MEMBERS ? (
        <p className="empty-hint">
          Add at least {MIN_MEMBERS} members to calculate settlements.
        </p>
      ) : recommendedPayments.length === 0 ? (
        <p className="settled-banner">All settled up 🎉</p>
      ) : (
        <ul className="settle-list">
          {recommendedPayments.map((payment) => {
            const fromName = memberNameById.get(payment.from) ?? 'Unknown'
            const toName = memberNameById.get(payment.to) ?? 'Unknown'
            return (
              <li key={`${payment.from}-${payment.to}`} className="settle-item">
                <span className="settle-text">
                  <strong>{fromName}</strong> pays <strong>{toName}</strong>{' '}
                  <span className="settle-amount">
                    {formatRupees(payment.amountPaise)}
                  </span>
                </span>
                {onMarkSettled && (
                  <button
                    type="button"
                    className="btn-secondary btn-compact"
                    onClick={() => onMarkSettled(payment)}
                  >
                    Mark settled
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {recordedSettlements.length > 0 && (
        <div className="settled-history">
          <h3 className="sub-heading">Recorded payments</h3>
          <ul className="settle-list">
            {recordedSettlements.map((settlement) => {
              const fromName = memberNameById.get(settlement.from) ?? 'Unknown'
              const toName = memberNameById.get(settlement.to) ?? 'Unknown'
              return (
                <li key={settlement.id} className="settle-item settle-item-done">
                  <span className="settle-text">
                    ✓ <strong>{fromName}</strong> paid <strong>{toName}</strong>{' '}
                    <span className="settle-amount">
                      {formatRupees(settlement.amountPaise)}
                    </span>
                  </span>
                  {onUndoSettlement && (
                    <button
                      type="button"
                      className="btn-ghost-danger btn-compact"
                      onClick={() => onUndoSettlement(settlement.id)}
                    >
                      Undo
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}

export default SettleUp
