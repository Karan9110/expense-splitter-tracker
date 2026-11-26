import { MAX_MEMBERS } from '../constants.js'
import { formatPercent, formatRupees, toBasisPoints, toPaise } from './money.js'

/**
 * Validate a new member name against group limit, emptiness, and case-insensitive duplicates.
 */
export function validateMemberName(rawName, existingMembers, maxMembers = MAX_MEMBERS) {
  if (existingMembers.length >= maxMembers) {
    return `Maximum of ${maxMembers} members reached.`
  }

  const trimmed = String(rawName ?? '').trim()
  if (!trimmed) {
    return 'Member name cannot be empty.'
  }

  const normalized = trimmed.toLowerCase()
  const isDuplicate = existingMembers.some(
    (member) => member.name.trim().toLowerCase() === normalized,
  )
  if (isDuplicate) {
    return `"${trimmed}" is already in the group.`
  }

  return ''
}

/**
 * Validate an expense amount string: must be a positive decimal with up to 2 decimal places.
 */
export function validateAmount(rawAmount) {
  const trimmed = String(rawAmount ?? '').trim()
  if (!trimmed) {
    return 'Amount is required.'
  }

  const paise = toPaise(trimmed)
  if (paise === null) {
    return 'Enter a valid positive amount (max 2 decimals, e.g. 250 or 12.50).'
  }

  if (paise <= 0) {
    return 'Amount must be greater than ₹0.00.'
  }

  return ''
}

function validateCustomSplit({ splitMode, splitAmong, splitInputs, totalPaise }) {
  if (splitMode === 'exact') {
    if (totalPaise === null || totalPaise <= 0) {
      return ''
    }

    let sumPaise = 0
    for (const memberId of splitAmong) {
      const val = toPaise(splitInputs[memberId] ?? '')
      if (val === null) {
        return 'Enter valid non-negative rupee amounts (max 2 decimals) for all selected members.'
      }
      sumPaise += val
    }

    if (sumPaise !== totalPaise) {
      return `Exact amounts add up to ${formatRupees(sumPaise)}, expected ${formatRupees(totalPaise)}.`
    }
    return ''
  }

  if (splitMode === 'percent') {
    let sumBps = 0
    for (const memberId of splitAmong) {
      const bps = toBasisPoints(splitInputs[memberId] ?? '')
      if (bps === null || bps > 10000) {
        return 'Enter valid percentages between 0 and 100 (max 2 decimals) for all selected members.'
      }
      sumBps += bps
    }

    if (sumBps !== 10000) {
      return `Percentages add up to ${formatPercent(sumBps)}, must equal 100.00%.`
    }
    return ''
  }

  return ''
}

/**
 * Validate all fields of a new expense before dispatching.
 */
export function validateExpense(
  { title, amount, paidBy, splitAmong, splitMode = 'equal', splitInputs = {} },
  members,
) {
  const memberIds = new Set(members.map((member) => member.id))
  const errors = {
    title: '',
    amount: '',
    paidBy: '',
    splitAmong: '',
  }

  if (!String(title ?? '').trim()) {
    errors.title = 'Expense title cannot be empty.'
  }

  errors.amount = validateAmount(amount)

  if (!paidBy || !memberIds.has(paidBy)) {
    errors.paidBy = 'Please select who paid.'
  }

  const validSplits = Array.isArray(splitAmong)
    ? splitAmong.filter((id) => memberIds.has(id))
    : []

  if (validSplits.length === 0) {
    errors.splitAmong = 'Select at least one member to split with.'
  } else if (splitMode !== 'equal') {
    errors.splitAmong = validateCustomSplit({
      splitMode,
      splitAmong: validSplits,
      splitInputs,
      totalPaise: toPaise(amount),
    })
  }

  const isValid = !errors.title && !errors.amount && !errors.paidBy && !errors.splitAmong
  return { isValid, errors }
}
