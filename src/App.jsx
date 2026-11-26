import { useMemo } from 'react'
import BalanceTable from './components/BalanceTable.jsx'
import ExpenseForm from './components/ExpenseForm.jsx'
import ExpenseList from './components/ExpenseList.jsx'
import MemberSection from './components/MemberSection.jsx'
import ResetButton from './components/ResetButton.jsx'
import SettleUp from './components/SettleUp.jsx'
import { useExpenseStore } from './hooks/useExpenseStore.js'
import { computeBalances } from './logic/balances.js'
import { minimumTransactions } from './logic/settle.js'
import './App.css'

function App() {
  const {
    members,
    expenses,
    settlements,
    addMember,
    removeMember,
    addExpense,
    deleteExpense,
    markSettled,
    undoSettlement,
    resetGroup,
  } = useExpenseStore()

  const balances = useMemo(
    () => computeBalances(members, expenses, settlements),
    [members, expenses, settlements],
  )

  const recommendedPayments = useMemo(
    () => minimumTransactions(balances),
    [balances],
  )

  const isEmpty =
    members.length === 0 && expenses.length === 0 && settlements.length === 0

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Expense Splitter</h1>
          <p className="app-subtitle">
            Track group expenses and settle up with the fewest possible payments.
          </p>
        </div>
        <ResetButton disabled={isEmpty} onReset={resetGroup} />
      </header>

      <main className="layout-grid">
        <div className="layout-column">
          <MemberSection
            members={members}
            expenses={expenses}
            settlements={settlements}
            onAddMember={addMember}
            onRemoveMember={removeMember}
          />
          <ExpenseForm members={members} onAddExpense={addExpense} />
        </div>

        <div className="layout-column">
          <BalanceTable balances={balances} />
          <SettleUp
            recommendedPayments={recommendedPayments}
            recordedSettlements={settlements}
            members={members}
            onMarkSettled={markSettled}
            onUndoSettlement={undoSettlement}
          />
        </div>

        <ExpenseList
          members={members}
          expenses={expenses}
          onDeleteExpense={deleteExpense}
        />
      </main>
    </div>
  )
}

export default App
