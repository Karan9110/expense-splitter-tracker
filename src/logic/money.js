const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/

/**
 * Convert a rupee string (e.g. "12.5") into integer paise without float math.
 * Returns null if the string is not a valid non-negative decimal with <= 2 decimals.
 */
export function toPaise(rawAmount) {
  const trimmed = String(rawAmount ?? '').trim()
  if (!AMOUNT_PATTERN.test(trimmed)) {
    return null
  }

  const [rupeesPart, paisePart = ''] = trimmed.split('.')
  const rupees = Number.parseInt(rupeesPart, 10)
  const paise = Number.parseInt(paisePart.padEnd(2, '0'), 10)
  return rupees * 100 + paise
}

/**
 * Format integer paise as Indian Rupee currency (e.g. "₹1,250.50" or "-₹200.00").
 */
export function formatRupees(amountPaise) {
  const isNegative = amountPaise < 0
  const absRupees = Math.abs(amountPaise) / 100
  const formatted = absRupees.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${isNegative ? '-' : ''}₹${formatted}`
}

/**
 * Split integer paise equally across participants.
 * Distributes any remainder (+1 paise each) to the first `remainder` participants
 * so that the sum of shares always equals `amountPaise` exactly.
 */
export function equalSplit(amountPaise, participantIds) {
  const count = participantIds.length
  if (count === 0) {
    return []
  }

  const baseShare = Math.floor(amountPaise / count)
  const remainder = amountPaise - baseShare * count

  return participantIds.map((_, index) => baseShare + (index < remainder ? 1 : 0))
}
