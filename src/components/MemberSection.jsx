import { useState } from 'react'
import { MAX_MEMBERS } from '../constants.js'
import { formatRupees } from '../logic/money.js'
import { validateMemberName } from '../logic/validators.js'
import FieldError from './FieldError.jsx'

function MemberSection({
  members,
  expenses,
  settlements = [],
  balances = [],
  onAddMember,
  onRemoveMember,
}) {
  const [name, setName] = useState('')
  const [addError, setAddError] = useState('')
  const [removeError, setRemoveError] = useState('')

  const balanceByMemberId = new Map(balances.map((b) => [b.memberId, b]))
  const capacityPct = Math.round((members.length / MAX_MEMBERS) * 100)

  function handleSubmit(event) {
    event.preventDefault()
    setRemoveError('')

    const error = validateMemberName(name, members, MAX_MEMBERS)
    if (error) {
      setAddError(error)
      return
    }

    onAddMember(name.trim())
    setName('')
    setAddError('')
  }

  function handleNameChange(event) {
    setName(event.target.value)
    if (addError) {
      setAddError('')
    }
    if (removeError) {
      setRemoveError('')
    }
  }

  function handleRemove(member) {
    setAddError('')
    const linkedExpenses = expenses.filter(
      (expense) =>
        expense.paidBy === member.id || expense.splitAmong.includes(member.id),
    ).length

    const linkedSettlements = settlements.filter(
      (settlement) =>
        settlement.from === member.id || settlement.to === member.id,
    ).length

    if (linkedExpenses > 0) {
      setRemoveError(
        `${member.name} is part of ${linkedExpenses} ${
          linkedExpenses === 1 ? 'expense' : 'expenses'
        }. Delete ${linkedExpenses === 1 ? 'that' : 'those'} first.`,
      )
      return
    }

    if (linkedSettlements > 0) {
      setRemoveError(
        `${member.name} is part of ${linkedSettlements} recorded ${
          linkedSettlements === 1 ? 'settlement' : 'settlements'
        }. Undo ${linkedSettlements === 1 ? 'that' : 'those'} first.`,
      )
      return
    }

    setRemoveError('')
    onRemoveMember(member.id)
  }

  return (
    <section className="card" aria-labelledby="members-heading">
      <div className="section-header">
        <h2 id="members-heading">Group Members</h2>
        <span className="counter-badge">
          {members.length} / {MAX_MEMBERS} members
        </span>
      </div>

      <div className="capacity-bar" aria-hidden="true">
        <div
          className="capacity-fill"
          style={{ width: `${capacityPct}%` }}
        />
      </div>

      <form className="member-form" onSubmit={handleSubmit} noValidate>
        <div className="field-group">
          <label htmlFor="member-name">Add a member</label>
          <div className="inline-input-row">
            <input
              id="member-name"
              type="text"
              value={name}
              onChange={handleNameChange}
              placeholder="e.g. Rahul"
              aria-describedby={addError ? 'member-name-error' : undefined}
              aria-invalid={Boolean(addError)}
            />
            <button type="submit" className="btn-primary">
              Add member
            </button>
          </div>
          <FieldError id="member-name-error" message={addError} />
        </div>
      </form>

      {members.length === 0 ? (
        <p className="empty-hint">
          No members yet. Add at least 2 members to start splitting expenses.
        </p>
      ) : (
        <ul className="member-list">
          {members.map((member) => {
            const stats = balanceByMemberId.get(member.id)
            const expenseCount = expenses.filter(
              (e) => e.paidBy === member.id || e.splitAmong.includes(member.id),
            ).length

            return (
              <li key={member.id} className="member-item">
                <div className="member-info">
                  <span className="member-name">{member.name}</span>
                  <span className="member-stats">
                    {expenseCount} {expenseCount === 1 ? 'expense' : 'expenses'}
                    {stats ? ` · Paid ${formatRupees(stats.paidPaise)}` : ''}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn-ghost-danger btn-compact"
                  onClick={() => handleRemove(member)}
                  aria-label={`Remove ${member.name}`}
                >
                  Remove
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <FieldError id="member-remove-error" message={removeError} />
    </section>
  )
}

export default MemberSection
