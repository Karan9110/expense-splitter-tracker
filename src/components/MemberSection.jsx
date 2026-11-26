import { useState } from 'react'
import { MAX_MEMBERS } from '../constants.js'
import { validateMemberName } from '../logic/validators.js'
import FieldError from './FieldError.jsx'

function MemberSection({
  members,
  expenses,
  settlements = [],
  onAddMember,
  onRemoveMember,
}) {
  const [name, setName] = useState('')
  const [addError, setAddError] = useState('')
  const [removeError, setRemoveError] = useState('')

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
        <h2 id="members-heading">1. Members</h2>
        <span className="counter-badge">
          {members.length} / {MAX_MEMBERS} members
        </span>
      </div>

      <form className="member-form" onSubmit={handleSubmit} noValidate>
        <div className="field-group">
          <label htmlFor="member-name">Member name</label>
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
              Add
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
          {members.map((member) => (
            <li key={member.id} className="member-item">
              <span className="member-name">{member.name}</span>
              <button
                type="button"
                className="btn-ghost-danger"
                onClick={() => handleRemove(member)}
                aria-label={`Remove ${member.name}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <FieldError id="member-remove-error" message={removeError} />
    </section>
  )
}

export default MemberSection
