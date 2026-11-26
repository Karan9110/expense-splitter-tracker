import { useEffect, useReducer } from 'react'
import { STORAGE_KEY } from '../constants.js'

const EMPTY_STATE = {
  members: [],
  expenses: [],
  settlements: [],
}

function createId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 7)}${Date.now().toString(36).slice(-3)}`
}

function isValidSplits(splits, memberIds) {
  if (splits === undefined) {
    return true
  }
  if (!splits || typeof splits !== 'object' || Array.isArray(splits)) {
    return false
  }
  return Object.entries(splits).every(
    ([id, value]) => memberIds.has(id) && Number.isInteger(value) && value >= 0,
  )
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return EMPTY_STATE
    }

    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.members) || !Array.isArray(parsed.expenses)) {
      return EMPTY_STATE
    }

    const members = parsed.members.filter(
      (m) => m && typeof m.id === 'string' && typeof m.name === 'string' && m.name.trim().length > 0,
    )
    const memberIds = new Set(members.map((m) => m.id))

    const expenses = parsed.expenses.filter(
      (e) =>
        e &&
        typeof e.id === 'string' &&
        typeof e.title === 'string' &&
        e.title.trim().length > 0 &&
        Number.isInteger(e.amountPaise) &&
        e.amountPaise > 0 &&
        memberIds.has(e.paidBy) &&
        Array.isArray(e.splitAmong) &&
        e.splitAmong.some((id) => memberIds.has(id)) &&
        isValidSplits(e.splits, memberIds) &&
        typeof e.createdAt === 'number',
    )

    const settlements = Array.isArray(parsed.settlements)
      ? parsed.settlements.filter(
          (s) =>
            s &&
            typeof s.id === 'string' &&
            memberIds.has(s.from) &&
            memberIds.has(s.to) &&
            s.from !== s.to &&
            Number.isInteger(s.amountPaise) &&
            s.amountPaise > 0 &&
            typeof s.createdAt === 'number',
        )
      : []

    return { members, expenses, settlements }
  } catch {
    return EMPTY_STATE
  }
}

function expenseReducer(state, action) {
  switch (action.type) {
    case 'ADD_MEMBER':
      return {
        ...state,
        members: [...state.members, action.payload],
      }

    case 'REMOVE_MEMBER':
      return {
        ...state,
        members: state.members.filter((m) => m.id !== action.payload.memberId),
      }

    case 'ADD_EXPENSE':
      return {
        ...state,
        expenses: [...state.expenses, action.payload],
      }

    case 'DELETE_EXPENSE':
      return {
        ...state,
        expenses: state.expenses.filter((e) => e.id !== action.payload.expenseId),
      }

    case 'MARK_SETTLED':
      return {
        ...state,
        settlements: [...state.settlements, action.payload],
      }

    case 'UNDO_SETTLEMENT':
      return {
        ...state,
        settlements: state.settlements.filter((s) => s.id !== action.payload.settlementId),
      }

    case 'RESET':
      return EMPTY_STATE

    default:
      return state
  }
}

/**
 * Manage members, expenses, and recorded settlements with useReducer and localStorage.
 */
export function useExpenseStore() {
  const [state, dispatch] = useReducer(expenseReducer, null, loadState)

  useEffect(() => {
    try {
      if (
        state.members.length === 0 &&
        state.expenses.length === 0 &&
        state.settlements.length === 0
      ) {
        localStorage.removeItem(STORAGE_KEY)
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      }
    } catch {
      // Ignore storage errors (e.g. private browsing quota exceeded)
    }
  }, [state])

  function addMember(name) {
    dispatch({
      type: 'ADD_MEMBER',
      payload: {
        id: createId('m'),
        name: name.trim(),
      },
    })
  }

  function removeMember(memberId) {
    dispatch({
      type: 'REMOVE_MEMBER',
      payload: { memberId },
    })
  }

  function addExpense({ title, amountPaise, paidBy, splitAmong, splitMode = 'equal', splits }) {
    dispatch({
      type: 'ADD_EXPENSE',
      payload: {
        id: createId('e'),
        title: title.trim(),
        amountPaise,
        paidBy,
        splitAmong,
        splitMode,
        ...(splits ? { splits } : {}),
        createdAt: Date.now(),
      },
    })
  }

  function deleteExpense(expenseId) {
    dispatch({
      type: 'DELETE_EXPENSE',
      payload: { expenseId },
    })
  }

  function markSettled({ from, to, amountPaise }) {
    dispatch({
      type: 'MARK_SETTLED',
      payload: {
        id: createId('s'),
        from,
        to,
        amountPaise,
        createdAt: Date.now(),
      },
    })
  }

  function undoSettlement(settlementId) {
    dispatch({
      type: 'UNDO_SETTLEMENT',
      payload: { settlementId },
    })
  }

  function resetGroup() {
    dispatch({ type: 'RESET' })
  }

  return {
    members: state.members,
    expenses: state.expenses,
    settlements: state.settlements,
    addMember,
    removeMember,
    addExpense,
    deleteExpense,
    markSettled,
    undoSettlement,
    resetGroup,
  }
}
