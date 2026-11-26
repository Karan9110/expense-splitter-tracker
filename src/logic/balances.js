import { equalSplit } from './money.js'

/**
 * Compute paid, share, and net balance (all in integer paise) for every member.
 * Recorded settlements increase the payer's paid total and the receiver's share total
 * so net balances reflect cleared debts while preserving the zero-sum invariant.
 */
export function computeBalances(members, expenses, settlements = []) {
  const memberOrder = new Map()
  const paidByMember = new Map()
  const shareByMember = new Map()

  members.forEach((member, index) => {
    memberOrder.set(member.id, index)
    paidByMember.set(member.id, 0)
    shareByMember.set(member.id, 0)
  })

  for (const expense of expenses) {
    if (paidByMember.has(expense.paidBy)) {
      paidByMember.set(
        expense.paidBy,
        paidByMember.get(expense.paidBy) + expense.amountPaise,
      )
    }

    // Order participants by member-list order so remainder paise assignment is deterministic.
    const orderedParticipants = expense.splitAmong
      .filter((id) => memberOrder.has(id))
      .sort((a, b) => memberOrder.get(a) - memberOrder.get(b))

    if (expense.splits && typeof expense.splits === 'object') {
      orderedParticipants.forEach((memberId) => {
        const customShare = expense.splits[memberId] ?? 0
        shareByMember.set(memberId, shareByMember.get(memberId) + customShare)
      })
    } else {
      const shares = equalSplit(expense.amountPaise, orderedParticipants)
      orderedParticipants.forEach((memberId, index) => {
        shareByMember.set(memberId, shareByMember.get(memberId) + shares[index])
      })
    }
  }

  for (const settlement of settlements) {
    if (paidByMember.has(settlement.from) && shareByMember.has(settlement.to)) {
      paidByMember.set(
        settlement.from,
        paidByMember.get(settlement.from) + settlement.amountPaise,
      )
      shareByMember.set(
        settlement.to,
        shareByMember.get(settlement.to) + settlement.amountPaise,
      )
    }
  }

  const balances = members.map((member) => {
    const paidPaise = paidByMember.get(member.id) ?? 0
    const sharePaise = shareByMember.get(member.id) ?? 0
    return {
      memberId: member.id,
      name: member.name,
      paidPaise,
      sharePaise,
      netPaise: paidPaise - sharePaise,
    }
  })

  const totalNet = balances.reduce((sum, entry) => sum + entry.netPaise, 0)
  console.assert(totalNet === 0, `Expected net balances to sum to 0, got ${totalNet}`)

  return balances
}
