/**
 * Greedy largest-creditor / largest-debtor settlement for a zero-sum group.
 * Settles a zero-sum group of k people in at most k - 1 payments.
 */
function greedySettle(entries) {
  const creditors = []
  const debtors = []

  for (const entry of entries) {
    if (entry.netPaise > 0) {
      creditors.push({ memberId: entry.memberId, amount: entry.netPaise })
    } else if (entry.netPaise < 0) {
      debtors.push({ memberId: entry.memberId, amount: -entry.netPaise })
    }
  }

  const payments = []

  while (creditors.length > 0 && debtors.length > 0) {
    creditors.sort((a, b) => b.amount - a.amount || a.memberId.localeCompare(b.memberId))
    debtors.sort((a, b) => b.amount - a.amount || a.memberId.localeCompare(b.memberId))

    const creditor = creditors[0]
    const debtor = debtors[0]
    const amountPaise = Math.min(creditor.amount, debtor.amount)

    payments.push({
      from: debtor.memberId,
      to: creditor.memberId,
      amountPaise,
    })

    creditor.amount -= amountPaise
    debtor.amount -= amountPaise

    if (creditor.amount === 0) {
      creditors.shift()
    }
    if (debtor.amount === 0) {
      debtors.shift()
    }
  }

  return payments
}

/**
 * Compute the exact minimum number of transactions needed to settle all balances.
 * Uses bitmask DP to maximize disjoint zero-sum subgroups (feasible for n <= 10),
 * falling back to greedy if more than 16 non-zero balances exist.
 */
export function minimumTransactions(balances) {
  const nonZero = balances.filter((entry) => entry.netPaise !== 0)
  const count = nonZero.length

  if (count <= 1) {
    return []
  }

  if (count > 16) {
    return greedySettle(nonZero)
  }

  const totalMasks = 1 << count
  const subsetSum = new Float64Array(totalMasks)

  for (let mask = 1; mask < totalMasks; mask += 1) {
    const lowestBit = mask & -mask
    const bitIndex = Math.clz32(lowestBit) ^ 31
    subsetSum[mask] = subsetSum[mask ^ lowestBit] + nonZero[bitIndex].netPaise
  }

  // dp[mask] = maximum number of zero-sum groups closed along a prefix ordering of `mask`.
  const dp = new Int32Array(totalMasks).fill(-1)
  const parent = new Int32Array(totalMasks).fill(-1)
  dp[0] = 0

  for (let mask = 0; mask < totalMasks - 1; mask += 1) {
    if (dp[mask] === -1) {
      continue
    }

    for (let i = 0; i < count; i += 1) {
      if ((mask & (1 << i)) !== 0) {
        continue
      }
      const nextMask = mask | (1 << i)
      const closedGroup = subsetSum[nextMask] === 0 ? 1 : 0
      const candidate = dp[mask] + closedGroup

      if (candidate > dp[nextMask]) {
        dp[nextMask] = candidate
        parent[nextMask] = mask
      }
    }
  }

  const path = []
  let current = totalMasks - 1
  while (current !== -1) {
    path.push(current)
    current = parent[current]
  }
  path.reverse()

  const groups = []
  let groupStartMask = 0

  for (let idx = 1; idx < path.length; idx += 1) {
    const mask = path[idx]
    if (subsetSum[mask] === 0) {
      const groupMask = mask ^ groupStartMask
      const groupEntries = []
      for (let i = 0; i < count; i += 1) {
        if ((groupMask & (1 << i)) !== 0) {
          groupEntries.push(nonZero[i])
        }
      }
      groups.push(groupEntries)
      groupStartMask = mask
    }
  }

  if (groups.length === 0) {
    return greedySettle(nonZero)
  }

  return groups.flatMap((groupEntries) => greedySettle(groupEntries))
}
