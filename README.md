# Expense Splitter

A single-page React app for tracking shared group expenses (2 to 10 members) and computing the fewest possible payments needed to settle all debts.

## How to run

```bash
npm install
npm run dev
```

For a production build:

```bash
npm run build
```

## Features completed

- [x] **Members (2 to 10):** Add and remove members with inline validation (trimmed, non-empty, case-insensitive duplicate check, max 10 limit, removal blocked if linked to expenses).
- [x] **Add expense:** Inline validated form (`title`, `amount` up to 2 decimals, `paidBy`, `splitAmong` checkboxes defaulting to all members), disabled with a hint when fewer than 2 members exist.
- [x] **Expense list:** Sorted newest first with delete support.
- [x] **Balances table:** Shows `Paid`, `Share`, and `Net` in integer paise arithmetic so net balances always sum to `₹0.00`, with color and text status labels (`gets back`, `owes`, `settled`).
- [x] **Settle-up (minimum transactions):** Exact minimum-payment settlement list (`A pays B ₹X`).
- [x] **Persistence & reset:** Auto-saved to `localStorage` under `expenseSplitter.v1` with safe JSON error handling and an inline two-step `Reset group` confirmation.
- [x] **Bonus — Filter by member:** Filter the expense list by any member (as payer or participant) or view all.
- [x] **Bonus — Responsive layout:** Two-column desktop layout that stacks cleanly into a single column below `700px` with horizontally scrollable tables and `44px+` tap targets.

## How settle-up works

All amounts are stored as integer paise (`₹1 = 100 paise`), and equal-split remainders are distributed `+1 paise` at a time in member-list order so no paise are lost. To minimize transactions for up to 10 members, a bitmask dynamic programming pass partitions non-zero balances into the maximum number of disjoint zero-sum subgroups, and each subgroup of size `k` is settled in `k - 1` payments via largest-creditor/largest-debtor matching.

## Tech used

- React (function components, `useReducer`, `useMemo`, `useState`, `useEffect`, `useRef`)
- JavaScript (ES modules, pure logic layer in `src/logic/`)
- Plain CSS (`src/App.css`)
- Browser `localStorage`

## Known limitations

- Only equal splits across selected participants are supported (no custom/percentage splits).
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
