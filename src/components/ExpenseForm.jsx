import { useRef, useState } from 'react'
import { MIN_MEMBERS } from '../constants.js'
import { formatRupees, toPaise } from '../logic/money.js'
import { validateExpense } from '../logic/validators.js'
import FieldError from './FieldError.jsx'

const INITIAL_ERRORS = {
  title: '',
  amount: '',
  paidBy: '',
  splitAmong: '',
}

const SPLIT_MODES = [
  { id: 'equal', label: 'Equal' },
  { id: 'exact', label: 'Exact (₹)' },
]

function ExpenseForm({ members, onAddExpense }) {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState('')
  const [splitMode, setSplitMode] = useState('equal')
  const [splitInputs, setSplitInputs] = useState({})
  const [uncheckedIds, setUncheckedIds] = useState(() => new Set())
  const [errors, setErrors] = useState(INITIAL_ERRORS)
  const titleInputRef = useRef(null)

  const isGated = members.length < MIN_MEMBERS
  const effectivePaidBy = members.some((m) => m.id === paidBy) ? paidBy : ''
  const splitAmong = members
    .filter((m) => !uncheckedIds.has(m.id))
    .map((m) => m.id)

  function clearFieldError(field) {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  function handleToggleSplit(memberId) {
    setUncheckedIds((prev) => {
      const next = new Set(prev)
      if (next.has(memberId)) {
        next.delete(memberId)
      } else {
        next.add(memberId)
      }
      return next
    })
    clearFieldError('splitAmong')
  }

  function handleSelectAllSplits() {
    setUncheckedIds(new Set())
    clearFieldError('splitAmong')
  }

  function handleSplitModeChange(nextMode) {
    setSplitMode(nextMode)
    clearFieldError('splitAmong')
  }

  function handleSplitInputChange(memberId, value) {
    setSplitInputs((prev) => ({ ...prev, [memberId]: value }))
    clearFieldError('splitAmong')
  }

  function buildSplits() {
    if (splitMode !== 'exact') {
      return undefined
    }

    const splits = {}
    splitAmong.forEach((memberId) => {
      splits[memberId] = toPaise(splitInputs[memberId] ?? '') ?? 0
    })
    return splits
  }

  function renderExactSummary() {
    if (splitMode !== 'exact' || splitAmong.length === 0) {
      return null
    }

    const totalPaise = toPaise(amount)
    const assignedPaise = splitAmong.reduce(
      (sum, id) => sum + (toPaise(splitInputs[id] ?? '') ?? 0),
      0,
    )
    if (totalPaise === null) {
      return <p className="split-summary">Assigned: {formatRupees(assignedPaise)}</p>
    }
    const remaining = totalPaise - assignedPaise
    return (
      <p className={`split-summary ${remaining === 0 ? 'split-summary-ok' : ''}`}>
        Assigned {formatRupees(assignedPaise)} / {formatRupees(totalPaise)} (
        {remaining >= 0
          ? `${formatRupees(remaining)} remaining`
          : `${formatRupees(-remaining)} over`})
      </p>
    )
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (isGated) {
      return
    }

    const result = validateExpense(
      {
        title,
        amount,
        paidBy: effectivePaidBy,
        splitAmong,
        splitMode,
        splitInputs,
      },
      members,
    )

    if (!result.isValid) {
      setErrors(result.errors)
      return
    }

    const amountPaise = toPaise(amount)
    const splits = buildSplits()

    onAddExpense({
      title: title.trim(),
      amountPaise,
      paidBy: effectivePaidBy,
      splitAmong,
      splitMode,
      splits,
    })

    setTitle('')
    setAmount('')
    setPaidBy('')
    setSplitMode('equal')
    setSplitInputs({})
    setUncheckedIds(new Set())
    setErrors(INITIAL_ERRORS)
    titleInputRef.current?.focus()
  }

  return (
    <section className="card" aria-labelledby="add-expense-heading">
      <div className="section-header">
        <h2 id="add-expense-heading">Add Expense</h2>
      </div>

      {isGated && (
        <p className="gate-notice" role="status">
          Add at least {MIN_MEMBERS} members to start adding expenses.
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <fieldset className="expense-fieldset" disabled={isGated}>
          <div className="field-group">
            <label htmlFor="expense-title">Title</label>
            <input
              ref={titleInputRef}
              id="expense-title"
              type="text"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value)
                clearFieldError('title')
              }}
              placeholder="e.g. Dinner"
              aria-describedby={errors.title ? 'expense-title-error' : undefined}
              aria-invalid={Boolean(errors.title)}
            />
            <FieldError id="expense-title-error" message={errors.title} />
          </div>

          <div className="form-row-two">
            <div className="field-group">
              <label htmlFor="expense-amount">Amount (₹)</label>
              <input
                id="expense-amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value)
                  clearFieldError('amount')
                }}
                placeholder="e.g. 900.00"
                aria-describedby={errors.amount ? 'expense-amount-error' : undefined}
                aria-invalid={Boolean(errors.amount)}
              />
              <FieldError id="expense-amount-error" message={errors.amount} />
            </div>

            <div className="field-group">
              <label htmlFor="expense-paid-by">Paid by</label>
              <select
                id="expense-paid-by"
                value={effectivePaidBy}
                onChange={(event) => {
                  setPaidBy(event.target.value)
                  clearFieldError('paidBy')
                }}
                aria-describedby={errors.paidBy ? 'expense-paid-by-error' : undefined}
                aria-invalid={Boolean(errors.paidBy)}
              >
                <option value="">-- Select member --</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
              <FieldError id="expense-paid-by-error" message={errors.paidBy} />
            </div>
          </div>

          <div className="field-group">
            <div className="split-header">
              <span className="field-label">Split among</span>
              <div className="split-controls">
                {members.length > 0 && splitAmong.length < members.length && (
                  <button
                    type="button"
                    className="btn-link"
                    onClick={handleSelectAllSplits}
                  >
                    Select all
                  </button>
                )}
                <div className="mode-toggle" role="group" aria-label="Split mode">
                  {SPLIT_MODES.map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      className={`mode-btn ${splitMode === mode.id ? 'mode-btn-active' : ''}`}
                      onClick={() => handleSplitModeChange(mode.id)}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {members.length === 0 ? (
              <p className="empty-hint">Members will appear here.</p>
            ) : splitMode === 'equal' ? (
              <div className="checkbox-grid">
                {members.map((member) => {
                  const checked = !uncheckedIds.has(member.id)
                  const checkboxId = `split-${member.id}`
                  return (
                    <label key={member.id} htmlFor={checkboxId} className="checkbox-pill">
                      <input
                        id={checkboxId}
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggleSplit(member.id)}
                      />
                      <span>{member.name}</span>
                    </label>
                  )
                })}
              </div>
            ) : (
              <div className="custom-split-list">
                {members.map((member) => {
                  const checked = !uncheckedIds.has(member.id)
                  const checkboxId = `split-${member.id}`
                  const inputId = `split-value-${member.id}`
                  return (
                    <div key={member.id} className="custom-split-row">
                      <label htmlFor={checkboxId} className="checkbox-pill custom-split-check">
                        <input
                          id={checkboxId}
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleSplit(member.id)}
                        />
                        <span>{member.name}</span>
                      </label>
                      {checked && (
                        <input
                          id={inputId}
                          type="text"
                          inputMode="decimal"
                          className="custom-split-input"
                          value={splitInputs[member.id] ?? ''}
                          onChange={(event) =>
                            handleSplitInputChange(member.id, event.target.value)
                          }
                          placeholder="₹ 0.00"
                          aria-label={`${member.name} amount in rupees`}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {renderExactSummary()}
            <FieldError id="expense-split-error" message={errors.splitAmong} />
          </div>

          <button type="submit" className="btn-primary btn-full">
            Add expense
          </button>
        </fieldset>
      </form>
    </section>
  )
}

export default ExpenseForm
