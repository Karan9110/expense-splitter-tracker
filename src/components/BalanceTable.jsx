import { formatRupees } from '../logic/money.js'

function formatNetStatus(netPaise) {
  if (netPaise > 0) {
    return {
      text: `+${formatRupees(netPaise)}`,
      label: 'gets back',
      className: 'net-positive',
    }
  }
  if (netPaise < 0) {
    return {
      text: formatRupees(netPaise),
      label: 'owes',
      className: 'net-negative',
    }
  }
  return {
    text: formatRupees(0),
    label: 'settled',
    className: 'net-settled',
  }
}

function BalanceTable({ balances }) {
  const totalPaid = balances.reduce((sum, row) => sum + row.paidPaise, 0)
  const totalShare = balances.reduce((sum, row) => sum + row.sharePaise, 0)
  const totalNet = balances.reduce((sum, row) => sum + row.netPaise, 0)

  return (
    <section className="card" aria-labelledby="balances-heading">
      <div className="section-header">
        <h2 id="balances-heading">4. Balances</h2>
      </div>

      {balances.length === 0 ? (
        <p className="empty-hint">Add members and expenses to see balances.</p>
      ) : (
        <div className="table-scroll">
          <table className="balance-table">
            <thead>
              <tr>
                <th scope="col">Member</th>
                <th scope="col" className="num-col">Paid</th>
                <th scope="col" className="num-col">Share</th>
                <th scope="col" className="num-col">Net</th>
              </tr>
            </thead>
            <tbody>
              {balances.map((row) => {
                const net = formatNetStatus(row.netPaise)
                return (
                  <tr key={row.memberId}>
                    <td className="member-cell">{row.name}</td>
                    <td className="num-col">{formatRupees(row.paidPaise)}</td>
                    <td className="num-col">{formatRupees(row.sharePaise)}</td>
                    <td className="num-col">
                      <span className={`net-pill ${net.className}`}>
                        <strong>{net.text}</strong> ({net.label})
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Total</th>
                <td className="num-col">{formatRupees(totalPaid)}</td>
                <td className="num-col">{formatRupees(totalShare)}</td>
                <td className="num-col">{formatRupees(totalNet)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  )
}

export default BalanceTable
