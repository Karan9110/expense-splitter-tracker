# Expense Splitter

A multi-page React web app with a clean white dashboard interface for tracking shared group expenses (2 to 10 members) and computing the fewest possible payments needed to settle all debts.

## How to run

```bash
npm install
npm run dev
```

Other scripts:

```bash
npm test       # run pure logic unit tests (node --test)
npm run lint   # run ESLint
npm run build  # production Vite build
```

## Pages & Features

- **Overview (`#overview`):** KPI cards (Total Spent, Group Members, Pending Settle-Up, Settled So Far), visual Paid vs. Share bars, Settle-Up snapshot, Balance table, and Recent Activity feed.
- **Expenses (`#expenses`):** Add Expense form supporting `Equal` and `Exact (₹)` splits with inline validation, paired with a searchable, sortable, filterable Expense Ledger.
- **Settle Up (`#settle`):** Full Balances table (`Paid`, `Share`, `Net`, `Total`) alongside the exact minimum-transaction settlement plan, with `Mark settled` and `Undo` support.
- **History Dashboard (`#history`):** Chronological activity timeline combining expenses and recorded settlements, activity/member/search filters, summary statistics, and a Daily Spend Breakdown chart.
- **Members & Group (`#members`):** Add/remove group members (`2` to `10` capacity meter), per-member expense stats, removal protection while linked to expenses/settlements, and two-step `Reset group` confirmation.
- **Persistence:** Auto-saved to `localStorage` under `expenseSplitter.v1` with safe JSON error handling.

## How settle-up works

All amounts are stored as integer paise (`₹1 = 100 paise`), and split remainders are distributed `+1 paise` at a time deterministically so no paise are lost. To minimize transactions for up to 10 members, a bitmask dynamic programming pass partitions non-zero balances into the maximum number of disjoint zero-sum subgroups, and each subgroup of size `k` is settled in `k - 1` payments via largest-creditor/largest-debtor matching.

## Tech used

- React (function components, `useReducer`, `useMemo`, `useState`, `useEffect`, `useRef`)
- JavaScript (ES modules, pure logic layer in `src/logic/`)
- Plain CSS (`src/App.css`, responsive sidebar + mobile pill navigation)
- Browser `localStorage`
- Node built-in test runner (`node:test`) for logic tests

## Known limitations

- State is stored locally in a single browser `localStorage` key (`expenseSplitter.v1`) with no backend or multi-group switcher.
- Group size is capped at 10 members (`MAX_MEMBERS = 10`).

## Sample test case

Members: **Rahul**, **Priya**, **Aman**

| Expense | Amount | Paid by | Split among |
| --- | --- | --- | --- |
| Dinner | ₹900.00 | Rahul | Rahul, Priya, Aman |
| Cab | ₹300.00 | Priya | Priya, Aman |
| Snacks | ₹150.00 | Aman | Rahul, Priya, Aman |

Expected balances:
- **Rahul:** Paid `₹900.00`, Share `₹350.00`, Net `+₹550.00 (gets back)`
- **Priya:** Paid `₹300.00`, Share `₹500.00`, Net `-₹200.00 (owes)`
- **Aman:** Paid `₹150.00`, Share `₹500.00`, Net `-₹350.00 (owes)`

Expected settle-up (2 payments):
1. **Aman** pays **Rahul** `₹350.00`
2. **Priya** pays **Rahul** `₹200.00`
