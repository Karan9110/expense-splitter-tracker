import { useEffect, useMemo, useState } from 'react'
import BalanceTable from './components/BalanceTable.jsx'
import ExpenseForm from './components/ExpenseForm.jsx'
import ExpenseList from './components/ExpenseList.jsx'
import HistoryDashboard from './components/HistoryDashboard.jsx'
import MemberSection from './components/MemberSection.jsx'
import OverviewDashboard from './components/OverviewDashboard.jsx'
import ResetButton from './components/ResetButton.jsx'
import SettleUp from './components/SettleUp.jsx'
import SidebarNav from './components/SidebarNav.jsx'
import { useExpenseStore } from './hooks/useExpenseStore.js'
import { computeBalances } from './logic/balances.js'
import {
  buildActivityTimeline,
  computeDashboardMetrics,
} from './logic/history.js'
import { minimumTransactions } from './logic/settle.js'
import './App.css'

const VALID_PAGES = new Set([
  'overview',
  'expenses',
  'settle',
  'history',
  'members',
])

function readPageFromHash() {
  const hash = window.location.hash.replace('#', '').trim()
  return VALID_PAGES.has(hash) ? hash : 'overview'
}

function App() {
  const [activePage, setActivePage] = useState(readPageFromHash)

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

  useEffect(() => {
    function handleHashChange() {
      setActivePage(readPageFromHash())
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  function navigateTo(pageId) {
    if (!VALID_PAGES.has(pageId)) {
      return
    }
    setActivePage(pageId)
    if (window.location.hash !== `#${pageId}`) {
      window.location.hash = pageId
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const balances = useMemo(
    () => computeBalances(members, expenses, settlements),
    [members, expenses, settlements],
  )

  const recommendedPayments = useMemo(
    () => minimumTransactions(balances),
    [balances],
  )

  const timeline = useMemo(
    () => buildActivityTimeline(members, expenses, settlements),
    [members, expenses, settlements],
  )

  const metrics = useMemo(
    () => computeDashboardMetrics(expenses, settlements, recommendedPayments),
    [expenses, settlements, recommendedPayments],
  )

  const isEmpty =
    members.length === 0 && expenses.length === 0 && settlements.length === 0

  return (
    <div className="app-layout">
      <SidebarNav
        activePage={activePage}
        onNavigate={navigateTo}
        counts={{
          expenses: expenses.length,
          pending: recommendedPayments.length,
          history: timeline.length,
          members: members.length,
        }}
        isEmpty={isEmpty}
        onReset={resetGroup}
      />

      <main className="main-content">
        {activePage === 'overview' && (
          <OverviewDashboard
            members={members}
            balances={balances}
            recommendedPayments={recommendedPayments}
            metrics={metrics}
            recentActivity={timeline}
            onNavigate={navigateTo}
            onMarkSettled={markSettled}
          />
        )}

        {activePage === 'expenses' && (
          <div className="page-stack">
            <div className="page-header">
              <div>
                <h1 className="page-title">Expenses</h1>
                <p className="page-subtitle">
                  Log shared bills using equal, exact rupee, or percentage splits.
                </p>
              </div>
            </div>

            <div className="two-col-page">
              <ExpenseForm members={members} onAddExpense={addExpense} />
              <ExpenseList
                members={members}
                expenses={expenses}
                onDeleteExpense={deleteExpense}
              />
            </div>
          </div>
        )}

        {activePage === 'settle' && (
          <div className="page-stack">
            <div className="page-header">
              <div>
                <h1 className="page-title">Balances & Settle Up</h1>
                <p className="page-subtitle">
                  Exact minimum-transaction settlement plan so everyone clears up in fewest steps.
                </p>
              </div>
            </div>

            <div className="two-col-page">
              <BalanceTable balances={balances} />
              <SettleUp
                recommendedPayments={recommendedPayments}
                recordedSettlements={settlements}
                members={members}
                onMarkSettled={markSettled}
                onUndoSettlement={undoSettlement}
              />
            </div>
          </div>
        )}

        {activePage === 'history' && (
          <HistoryDashboard
            members={members}
            expenses={expenses}
            timeline={timeline}
            metrics={metrics}
            onDeleteExpense={deleteExpense}
            onUndoSettlement={undoSettlement}
          />
        )}

        {activePage === 'members' && (
          <div className="page-stack">
            <div className="page-header">
              <div>
                <h1 className="page-title">Members & Group</h1>
                <p className="page-subtitle">
                  Manage participants (2 to 10 people) or reset the group ledger.
                </p>
              </div>
            </div>

            <div className="two-col-page">
              <MemberSection
                members={members}
                expenses={expenses}
                settlements={settlements}
                balances={balances}
                onAddMember={addMember}
                onRemoveMember={removeMember}
              />

              <section className="card danger-card" aria-labelledby="reset-heading">
                <div className="section-header">
                  <h2 id="reset-heading">Reset Group Data</h2>
                </div>
                <p className="empty-hint" style={{ marginBottom: '16px' }}>
                  Clearing the group removes all members, expenses, and recorded
                  settlements from this browser&apos;s local storage.
                </p>
                <ResetButton disabled={isEmpty} onReset={resetGroup} />
              </section>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
