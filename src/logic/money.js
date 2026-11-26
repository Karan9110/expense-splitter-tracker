const DECIMAL_PATTERN = /^\d+(\.\d{1,2})?$/

/**
 * Parse a non-negative decimal string with up to 2 decimal places into integer hundredths.
 * Avoids floating-point rounding errors (e.g. "12.5" -> 1250).
 */
function parseHundredths(rawValue) {
  const trimmed = String(rawValue ?? '').trim()
  if (!DECIMAL_PATTERN.test(trimmed)) {
    return null
  }

  const [wholePart, fracPart = ''] = trimmed.split('.')
  const whole = Number.parseInt(wholePart, 10)
  const frac = Number.parseInt(fracPart.padEnd(2, '0'), 10)
  return whole * 100 + frac
}

/**
 * Convert a rupee string (e.g. "12.5") into integer paise without float math.
 * Returns null if the string is not a valid non-negative decimal with <= 2 decimals.
 */
export function toPaise(rawAmount) {
  return parseHundredths(rawAmount)
}

/**
 * Convert a percentage string (e.g. "33.33") into integer basis points (100% = 10000).
 * Returns null if invalid.
 */
export function toBasisPoints(rawPercent) {
  return parseHundredths(rawPercent)
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
 * Format integer basis points as a percentage string (e.g. 3333 -> "33.33%").
 */
export function formatPercent(basisPoints) {
  return `${(basisPoints / 100).toFixed(2)}%`
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

/**
 * Split integer paise by percentage basis points (summing to 10000).
 * Uses largest-remainder allocation so the shares sum to `amountPaise` exactly.
 */
export function percentSplit(amountPaise, basisPointsList) {
  if (basisPointsList.length === 0) {
    return []
  }

  const allocations = basisPointsList.map((bps, index) => {
    const product = amountPaise * bps
    return {
      index,
      floorPaise: Math.floor(product / 10000),
      remainder: product % 10000,
    }
  })

  const allocatedSum = allocations.reduce((sum, item) => sum + item.floorPaise, 0)
  const leftover = amountPaise - allocatedSum

  const byLargestRemainder = [...allocations].sort(
    (a, b) => b.remainder - a.remainder || a.index - b.index,
  )

  const shares = allocations.map((item) => item.floorPaise)
  for (let i = 0; i < leftover; i += 1) {
    shares[byLargestRemainder[i].index] += 1
  }

  return shares
}
