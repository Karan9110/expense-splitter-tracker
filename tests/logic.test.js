import assert from 'node:assert/strict'
import test from 'node:test'
import { computeBalances } from '../src/logic/balances.js'
import {
  buildActivityTimeline,
  computeDashboardMetrics,
  groupExpensesByDate,
} from '../src/logic/history.js'
import {
  equalSplit,
  formatRupees,
  toPaise,
} from '../src/logic/money.js'
import { minimumTransactions } from '../src/logic/settle.js'
import {
  validateAmount,
  validateExpense,
  validateMemberName,
} from '../src/logic/validators.js'

test('money conversion and rounding preserve exact paise', () => {
  assert.equal(toPaise('10'), 1000)
  assert.equal(toPaise('12.5'), 1250)
  assert.equal(toPaise('10.50'), 1050)
  assert.equal(toPaise('0'), 0)
  assert.equal(toPaise('-5'), null)
  assert.equal(toPaise('10.999'), null)
  assert.equal(toPaise('1e3'), null)
  assert.equal(toPaise('.5'), null)
  assert.equal(toPaise('abc'), null)

  assert.equal(formatRupees(90000), '₹900.00')
  assert.equal(formatRupees(-20000), '-₹200.00')

  assert.deepEqual(equalSplit(10000, ['a', 'b', 'c']), [3334, 3333, 3333])
})

test('member and expense validators reject invalid input', () => {
  const members = [
    { id: 'm1', name: 'Rahul' },
    { id: 'm2', name: 'Priya' },
  ]

  assert.ok(validateMemberName('   ', members))
  assert.ok(validateMemberName(' RAHUL ', members))
  assert.equal(validateMemberName('Aman', members), '')

  const fullGroup = Array.from({ length: 10 }, (_, i) => ({
    id: `m${i}`,
    name: `Member ${i}`,
  }))
  assert.ok(validateMemberName('Eleventh', fullGroup))

  assert.ok(validateAmount(''))
  assert.ok(validateAmount('0'))
  assert.ok(validateAmount('0.00'))
  assert.ok(validateAmount('1e3'))
  assert.equal(validateAmount('250.75'), '')

  const missingFields = validateExpense(
    { title: ' ', amount: '0', paidBy: '', splitAmong: [] },
    members,
  )
  assert.equal(missingFields.isValid, false)
  assert.ok(missingFields.errors.title)
  assert.ok(missingFields.errors.amount)
  assert.ok(missingFields.errors.paidBy)
  assert.ok(missingFields.errors.splitAmong)

  const payerExcluded = validateExpense(
    {
      title: 'Gift',
      amount: '500',
      paidBy: 'm1',
      splitAmong: ['m2'],
    },
    members,
  )
  assert.equal(payerExcluded.isValid, true)

  const badExact = validateExpense(
    {
      title: 'Lunch',
      amount: '500',
      paidBy: 'm1',
      splitAmong: ['m1', 'm2'],
      splitMode: 'exact',
      splitInputs: { m1: '200', m2: '200' },
    },
    members,
  )
  assert.equal(badExact.isValid, false)
  assert.ok(badExact.errors.splitAmong)

  const goodExact = validateExpense(
    {
      title: 'Lunch',
      amount: '500',
      paidBy: 'm1',
      splitAmong: ['m1', 'm2'],
      splitMode: 'exact',
      splitInputs: { m1: '300', m2: '200' },
    },
    members,
  )
  assert.equal(goodExact.isValid, true)
})

test('sample Rahul/Priya/Aman case, settlements, and exact minimum transactions', () => {
  const members = [
    { id: 'm1', name: 'Rahul' },
    { id: 'm2', name: 'Priya' },
    { id: 'm3', name: 'Aman' },
  ]
  const expenses = [
    {
      id: 'e1',
      title: 'Dinner',
      amountPaise: 90000,
      paidBy: 'm1',
      splitAmong: ['m1', 'm2', 'm3'],
      createdAt: 1,
    },
    {
      id: 'e2',
      title: 'Cab',
      amountPaise: 30000,
      paidBy: 'm2',
      splitAmong: ['m2', 'm3'],
      createdAt: 2,
    },
    {
      id: 'e3',
      title: 'Snacks',
      amountPaise: 15000,
      paidBy: 'm3',
      splitAmong: ['m1', 'm2', 'm3'],
      createdAt: 3,
    },
  ]

  const balances = computeBalances(members, expenses)
  assert.deepEqual(
    balances.map((b) => [b.name, b.paidPaise, b.sharePaise, b.netPaise]),
    [
      ['Rahul', 90000, 35000, 55000],
      ['Priya', 30000, 50000, -20000],
      ['Aman', 15000, 50000, -35000],
    ],
  )

  const initialTx = minimumTransactions(balances)
  assert.deepEqual(initialTx, [
    { from: 'm3', to: 'm1', amountPaise: 35000 },
    { from: 'm2', to: 'm1', amountPaise: 20000 },
  ])

  const afterOneSettlement = computeBalances(members, expenses, [
    { id: 's1', from: 'm3', to: 'm1', amountPaise: 35000, createdAt: 4 },
  ])
  assert.deepEqual(
    afterOneSettlement.map((b) => [b.name, b.netPaise]),
    [
      ['Rahul', 20000],
      ['Priya', -20000],
      ['Aman', 0],
    ],
  )
  assert.deepEqual(minimumTransactions(afterOneSettlement), [
    { from: 'm2', to: 'm1', amountPaise: 20000 },
  ])
})

test('exact bitmask DP handles chain case and beats greedy on hidden subgroups', () => {
  const chainTx = minimumTransactions([
    { memberId: 'A', name: 'A', netPaise: -10000 },
    { memberId: 'B', name: 'B', netPaise: 0 },
    { memberId: 'C', name: 'C', netPaise: 10000 },
  ])
  assert.deepEqual(chainTx, [{ from: 'A', to: 'C', amountPaise: 10000 }])

  const exactTx = minimumTransactions([
    { memberId: 'a', name: 'a', netPaise: 900 },
    { memberId: 'b', name: 'b', netPaise: 600 },
    { memberId: 'c', name: 'c', netPaise: -600 },
    { memberId: 'd', name: 'd', netPaise: -500 },
    { memberId: 'e', name: 'e', netPaise: -400 },
  ])
  assert.equal(exactTx.length, 3)
})

test('history timeline, KPI metrics, and daily spend grouping work cleanly', () => {
  const members = [
    { id: 'm1', name: 'Rahul' },
    { id: 'm2', name: 'Priya' },
  ]
  const day1 = new Date(2026, 10, 25, 19, 30).getTime()
  const day2 = new Date(2026, 10, 26, 11, 15).getTime()
  const day2Settle = new Date(2026, 10, 26, 12, 0).getTime()

  const expenses = [
    {
      id: 'e1',
      title: 'Dinner',
      amountPaise: 80000,
      paidBy: 'm1',
      splitAmong: ['m1', 'm2'],
      createdAt: day1,
    },
    {
      id: 'e2',
      title: 'Coffee',
      amountPaise: 20000,
      paidBy: 'm2',
      splitAmong: ['m1', 'm2'],
      createdAt: day2,
    },
  ]
  const settlements = [
    {
      id: 's1',
      from: 'm2',
      to: 'm1',
      amountPaise: 30000,
      createdAt: day2Settle,
    },
  ]

  const timeline = buildActivityTimeline(members, expenses, settlements)
  assert.equal(timeline.length, 3)
  assert.deepEqual(
    timeline.map((item) => item.id),
    ['s1', 'e2', 'e1'],
  )

  const metrics = computeDashboardMetrics(expenses, settlements, [])
  assert.equal(metrics.totalSpentPaise, 100000)
  assert.equal(metrics.averageExpensePaise, 50000)
  assert.equal(metrics.largestExpense.title, 'Dinner')
  assert.equal(metrics.totalSettledPaise, 30000)

  const daily = groupExpensesByDate(expenses)
  assert.equal(daily.length, 2)
  assert.equal(daily[0].dateKey, '2026-11-26')
  assert.equal(daily[0].totalPaise, 20000)
  assert.equal(daily[1].dateKey, '2026-11-25')
  assert.equal(daily[1].totalPaise, 80000)
})
