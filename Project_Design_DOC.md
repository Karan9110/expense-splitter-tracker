# Expense Splitter: Project Design Document

**Project:** Shared expense tracker with minimum-transaction settle-up
**Time budget:** 2 hours, from scratch
**Stack:** React (JavaScript, no TypeScript) + plain CSS, localStorage, no backend

---

## 1. Goal and scope

Build a single-page web app where a small group (2 to 10 people) records shared expenses and instantly sees:

1. Who paid what and who owes what (balances).
2. The **fewest possible payments** needed to clear all debts (the twist).

### In scope (must-have)
| # | Requirement | Section |
|---|-------------|---------|
| 1 | Add/remove members (2 to 10) | 5.1 |
| 2 | Add expense with validation (no `alert()`) | 5.2 |
| 3 | Expense list, newest first, deletable | 5.3 |
| 4 | Balances: paid, share, net; nets sum to ₹0 | 5.4 |
| 5 | Settle-up list ("A pays B ₹X") | 5.5 |
| 6 | localStorage persistence + Reset group | 5.6 |
| Twist | Minimum number of transactions | 6.3 |

### Bonus (only after core works, pick one or two, capped at +5)
- Filter expenses by member (cheapest, about 15 minutes)
- Responsive layout (mostly CSS you will write anyway)
- Deploy on GitHub Pages or Netlify (about 5 minutes for a static site)
- Unequal split / Mark as settled (only if time remains)

---

## 2. Tech choices

| Concern | Choice | Why |
|---------|--------|-----|
| UI | React function components + hooks | Project already set up; one component per section |
| State | `useReducer` in `App` (or a custom hook) | Several related actions on one state object |
| Derived data | `useMemo` | Balances and settle-up recomputed only when data changes |
| Styling | Plain CSS with CSS variables, flexbox/grid | No extra libraries, easy to make responsive |
| Logic | Plain JS modules in `src/logic/` | Pure functions, no React inside, easy to explain in the viva |
| Storage | `localStorage` (single JSON key) | Required, no backend |
| Hosting | Vercel / Netlify / GitHub Pages | Free static hosting |

**Keep it simple:** no Redux, no Context, no router, no UI library, no form library. State lives in `App` and goes down via props. At this size that is the easiest thing to explain in the viva.

> Note: if your setup uses Vite, run with `npm run dev`. If it is Create React App, use `npm start`. Put the exact command in the README.

---

## 3. Architecture

The rubric asks for "logic kept apart from UI", so use three layers:

```
┌──────────────────────────────────────────────┐
│ Components (src/components/*)                │  render props, collect input, show errors
├──────────────────────────────────────────────┤
│ State (App.jsx + reducer + storage hook)     │  holds state, handles actions, saves/loads
├──────────────────────────────────────────────┤
│ Logic (src/logic/*)                          │  PURE functions: no React, no DOM, no storage
└──────────────────────────────────────────────┘
```

**Rule:** files in `src/logic/` never import React and never touch `localStorage`. They take data in and return data out.

### Folder structure
```
src/
├── main.jsx                 # entry (index.js in CRA)
├── App.jsx                  # owns state, derives balances/settlements, composes sections
├── constants.js             # MAX_MEMBERS, MIN_MEMBERS, STORAGE_KEY
├── components/
│   ├── MemberSection.jsx    # add/remove members
│   ├── ExpenseForm.jsx      # add expense + inline errors
│   ├── ExpenseList.jsx      # list, delete, (bonus) filter
│   ├── BalanceTable.jsx     # paid / share / net
│   ├── SettleUp.jsx         # "A pays B ₹X"
│   ├── ResetButton.jsx      # inline two-step confirm
│   └── FieldError.jsx       # small reusable error message
├── hooks/
│   └── useExpenseStore.js   # useReducer + localStorage load/save (or keep in App)
├── logic/
│   ├── money.js             # rupees <-> paise, formatRupees, equalSplit
│   ├── validators.js        # validateMemberName, validateExpense
│   ├── balances.js          # computeBalances(members, expenses)
│   └── settle.js            # minimumTransactions(balances)
└── App.css
```

### Data flow
```
User input → component handler → validate (logic/validators) 
   ├─ invalid → set local error state → <FieldError/>
   └─ valid   → dispatch(action) → reducer → new state
                                     ├─ useEffect saves to localStorage
                                     └─ useMemo recomputes balances + settlements → re-render
```

### State and reducer
- Actions: `ADD_MEMBER`, `REMOVE_MEMBER`, `ADD_EXPENSE`, `DELETE_EXPENSE`, `RESET`.
- The reducer stays **pure** and never mutates (use `[...arr, item]`, `filter`).
- **Validate before dispatching**, in the component handler (or a helper), so the reducer stays simple.
- Form error messages are **local** `useState` in each form component, not part of saved state.

### React-specific pitfalls to avoid
- **Load before save:** initialise state lazily from storage (`useReducer(reducer, null, loadState)`). If you start with empty state and save in `useEffect`, you can overwrite saved data on first render.
- **Always use `key={item.id}`** in lists, never the array index (deleting items would misbehave).
- **Controlled inputs:** keep input values in state, and reset them after a successful add.
- **Don't store derived data** (balances, settlements) in state or in localStorage. Compute them with `useMemo`.
- **Never `dangerouslySetInnerHTML`** with user-entered text. React escapes text by default, so just render `{name}`.
- Wrap `JSON.parse` in `try/catch` so corrupted storage can't crash the app.

---

## 4. Data model

### 4.1 State shape
```js
{
  members:  [ { id: "m_k3j2", name: "Rahul" }, ... ],
  expenses: [
    {
      id: "e_x9a1",
      title: "Dinner",
      amountPaise: 90000,          // integer paise, NOT float rupees
      paidBy: "m_k3j2",            // member id
      splitAmong: ["m_k3j2", "m_p1", "m_a1"],   // member ids
      createdAt: 1764000000000     // Date.now(), used for newest-first sort
    }
  ]
}
```

### 4.2 Key decisions

- **Store money as integer paise.** Floats cause errors like `0.1 + 0.2 = 0.30000000000000004`. Convert to paise on input and back to rupees only when displaying. This is the heart of the "rounding" criterion and guarantees nets sum to exactly ₹0.
- **Reference members by `id`, not name.** Names are for display only, which keeps data consistent.
- **One storage key**, e.g. `expenseSplitter.v1`, holding the whole state as JSON. The `v1` leaves room for future migrations.
- **Derived data is never stored.** Balances and settle-up are computed from `members` + `expenses` every render, so they can never go out of sync.

---

## 5. Features in detail

### 5.1 Members

**UI:** a text input plus an "Add" button, then a list of members with a "Remove" button each. Show a counter such as "3 / 10 members".

**Rules**
- Trim whitespace before validating.
- Not empty.
- Not a duplicate, compared case-insensitively (`"rahul"` equals `"Rahul"`).
- Maximum 10 members. Disable the Add button (or show an error) at 10.
- A member can be removed **only if they have no expenses**, meaning they are neither the payer nor in the `splitAmong` of any expense. Otherwise show an error like *"Rahul is part of 2 expenses. Delete those first."*
- Minimum 2 members: you can't add an expense until at least 2 members exist. Show a hint such as *"Add at least 2 members to start adding expenses."* (Don't block removal. Just gate the expense form.)

**Error messages:** show inline, directly under the relevant field, in an element with `role="alert"` so screen readers announce it.

### 5.2 Add expense

**Fields**
| Field | Control | Validation |
|-------|---------|------------|
| Title | text input | trimmed, not empty |
| Amount (₹) | text input (`inputmode="decimal"`) | positive, max 2 decimals |
| Paid by | `<select>` of members | must be selected |
| Split among | checkboxes, all checked by default | at least 1 selected |

**Amount validation**
- Use a regex on the **string**, not `parseFloat`: `/^\d+(\.\d{1,2})?$/`
- Then check the value is `> 0` (rejects `0`, `0.00`).
- Reject: empty, `abc`, `-50`, `12.345`, `1e3`, `.5` (decide whether to allow; the simplest rule is to reject it with a clear message).
- Convert to paise from the string: split on `.`, pad the fractional part to 2 digits, e.g. `"12.5"` → `1250`. Avoid `Math.round(x * 100)` where possible.

**Errors:** one message per invalid field, shown inline and cleared when the user edits the field. **No `alert()`.**

**On success:** add the expense, clear the form (reset checkboxes to all-checked), focus the title input.

### 5.3 Expense list

- Sorted by `createdAt` descending (newest first).
- Each row shows: title, amount (`₹900.00`), "Paid by Rahul", "Split among: Rahul, Priya, Aman", and a Delete button.
- Empty state: *"No expenses yet."*
- Deleting removes it from state, saves, and re-renders everything (balances and settle-up update immediately because they are derived).

### 5.4 Balances

For each member, compute (all in paise):
- **Paid** = sum of `amountPaise` of expenses where they are the payer.
- **Share** = sum of their portion of each expense they are in.
- **Net** = Paid − Share.

Display as a table:

| Member | Paid | Share | Net |
|--------|------|-------|-----|
| Rahul | ₹900.00 | ₹350.00 | **+₹550.00** (gets back) |

Color-code with text as well, not color alone: green and "gets back" for positive, red and "owes" for negative, grey for zero ("settled").

**Invariant:** the sum of all net balances is exactly 0. Add a `console.assert` in `computeBalances` to catch bugs early.

### 5.5 Settle-up

Show a list like:
- Aman pays Rahul ₹350.00
- Priya pays Rahul ₹200.00

If all nets are 0, show *"All settled up 🎉"*. The algorithm is in section 6.3.

### 5.6 Persistence and reset

- Save state in a `useEffect` that runs whenever `state` changes.
- Load once with a lazy initialiser: `try { JSON.parse(localStorage.getItem(KEY)) } catch { fallback to empty state }`. Corrupted or missing data must not crash the app.
- **Reset group** button clears members and expenses and removes the storage key. Because `confirm()`/`alert()` are discouraged, use an **inline two-step confirm**: first click changes the button to "Really reset? Yes / Cancel".

---

## 6. Core algorithms

### 6.1 Equal split with correct rounding

An amount in paise may not divide evenly. For example, ₹100 among 3 is 10000 paise, which is 3333.33 each.

```
base      = floor(amountPaise / n)
remainder = amountPaise - base * n      // 0 <= remainder < n
```

Give every participant `base`, and give **+1 paise to the first `remainder` participants** (in a fixed order, e.g. the member list order). The shares then **sum exactly to the amount**, so no paise is created or lost and total net stays at 0.

Example: 10000 among 3 gives 3334, 3333, 3333 (sum 10000).

### 6.2 Computing balances

```
for each member: paid = 0, share = 0
for each expense:
    paid[paidBy] += amountPaise
    shares = equalSplit(amountPaise, splitAmong)   // array aligned to splitAmong
    for each (memberId, s) in shares: share[memberId] += s
net[member] = paid[member] - share[member]
```

### 6.3 Minimum-transaction settle-up (the twist, 15 marks)

**Naive approach:** pair up debtors and creditors by name or order. This can produce more payments than necessary.

**Common greedy approach (good baseline):**
1. Build a list of creditors (net > 0) and debtors (net < 0).
2. Repeatedly take the largest creditor and the largest debtor.
3. Payment = `min(creditor, |debtor|)`. Record "debtor pays creditor".
4. Subtract the amount from both. Remove anyone who hits 0.
5. Repeat until empty.

This gives at most `n − 1` transactions and is correct for the sample case. It also gives the "A pays C ₹100" result for the chain example in the problem statement.

**Caveat:** greedy is not always the true minimum. Example: balances `+5, +5, -5, -5` may be settled in 2 payments by pairing, but greedy can sometimes do worse on cases with hidden zero-sum subgroups. For a test that explicitly grades "fewest payments", an exact method is safer.

**Exact approach (recommended, feasible because n ≤ 10):**

The minimum number of payments is `(number of people with non-zero net) − (maximum number of disjoint groups whose nets each sum to 0)`. Each zero-sum group of size `k` can be settled in `k − 1` payments.

1. Remove members with net = 0.
2. Let `m` = number of remaining members (≤ 10), so there are at most 2^10 = 1024 subsets.
3. For each bitmask subset, compute its sum.
4. DP over bitmasks: `dp[mask]` = max number of zero-sum groups you can split `mask` into. Transition: for each `mask`, try adding one more bit; if the sum of the current partial group is zero, increment the count (standard "max zero-sum partition" bitmask DP).
5. Reconstruct the groups.
6. Inside each group, run the greedy largest-creditor/largest-debtor routine, which uses exactly `k − 1` payments for a zero-sum group.

Time cost is tiny for 10 people. If time is short, **ship the greedy version first, commit, then upgrade to the exact version** and keep the greedy as a fallback.

**Output format:** `[{ from: memberId, to: memberId, amountPaise }]`

### 6.4 Sample test case (verify before anything else)

Members: Rahul, Priya, Aman

| Expense | Amount | Paid by | Split among |
|---------|--------|---------|-------------|
| Dinner | 900 | Rahul | Rahul, Priya, Aman |
| Cab | 300 | Priya | Priya, Aman |
| Snacks | 150 | Aman | Rahul, Priya, Aman |

Expected:

| Member | Paid | Share | Net |
|--------|------|-------|-----|
| Rahul | 900 | 350 | +550 |
| Priya | 300 | 500 | −200 |
| Aman | 150 | 500 | −350 |

Sum of nets: 550 − 200 − 350 = **0** ✔
Settle-up (2 payments): **Aman pays Rahul ₹350, Priya pays Rahul ₹200.**

Also test the chain case: A owes B 100, B owes C 100 gives a single payment, "A pays C ₹100".

---

## 7. User flow

```
Open app
   │
   ├─ saved data? ── yes ─► load state ─► render everything
   │                  no  ─► empty state with hint "Add at least 2 members"
   │
   ▼
Step 1: Add members (2 to 10)
   │  errors: empty / duplicate / limit reached
   ▼
Step 2: Add expense (title, amount, payer, split-among)
   │  errors: invalid title/amount/payer/no participants
   ▼
Step 3: View results (updates instantly)
   ├─ Expense list (newest first)
   ├─ Balances table
   └─ Settle-up payments
   │
   ├─ Delete expense ─► everything recomputes
   ├─ Remove member ─► allowed only if they have no expenses
   └─ Reset group ─► inline confirm ─► clears all data
```

---

## 8. UI layout

Single page, sections stacked on mobile and two columns on desktop.

```
┌────────────────────────────────────────────────┐
│ Expense Splitter                [Reset group]  │
├──────────────────────┬─────────────────────────┤
│ 1. Members (3/10)    │ 4. Balances             │
│  [name input] [Add]  │  table: paid/share/net  │
│  • Rahul   [Remove]  ├─────────────────────────┤
│  • Priya   [Remove]  │ 5. Settle up            │
│  • Aman    [Remove]  │  Aman pays Rahul ₹350   │
├──────────────────────┤  Priya pays Rahul ₹200  │
│ 2. Add expense       │                         │
│  title / amount      │                         │
│  paid by / split     │                         │
│  [Add expense]       │                         │
├──────────────────────┴─────────────────────────┤
│ 3. Expenses (newest first)   [Filter: All ▾]   │
│  Dinner · ₹900 · Rahul · Rahul, Priya, Aman [x]│
└────────────────────────────────────────────────┘
```

**Usability notes**
- Error text is red, small, placed directly beneath the field, and also marked with an icon or the word "Error", so it is not color-only.
- Buttons have clear labels. Use `<label for>` on every input.
- Format money consistently with `toLocaleString("en-IN", { minimumFractionDigits: 2 })` and the ₹ symbol.
- Mobile: single column below about 700px, tap targets at least 44px high, tables scroll horizontally (`overflow-x: auto`) or stack as cards.

---

## 9. Validation and edge-case checklist (15 marks)

**Members**
- [ ] Empty name, or only spaces → error
- [ ] `"Rahul"` then `"rahul"` or `" RAHUL "` → duplicate error
- [ ] 11th member → blocked with message
- [ ] Remove a member who paid or is in a split → blocked with message
- [ ] Remove a member with no expenses → works

**Expenses**
- [ ] Empty title → error
- [ ] Amount: empty, `0`, `-5`, `abc`, `10.999`, `1e3` → error; `10`, `10.5`, `10.50` → ok
- [ ] No payer selected → error
- [ ] No one selected in split → error
- [ ] Payer not included in the split (valid: the payer may not share the cost) → allowed
- [ ] Fewer than 2 members → expense form disabled with hint
- [ ] Very long titles → wrap or truncate with CSS, don't break layout
- [ ] HTML in a title or name (`<script>`) → render with `textContent`, never `innerHTML` with user data

**Rounding**
- [ ] ₹100 split 3 ways → shares 33.34 / 33.33 / 33.33, total 100.00
- [ ] Net balances always sum to exactly 0
- [ ] Settle-up payments exactly clear all balances

**Persistence**
- [ ] Refresh keeps all data
- [ ] Corrupted localStorage value doesn't crash the app
- [ ] Reset clears everything, including storage

---

## 10. Code quality guidelines (15 marks)

- Small single-purpose functions: `validateAmount`, `toPaise`, `formatRupees`, `equalSplit`, `computeBalances`, `minimumTransactions`.
- Small components, one job each (see folder structure). Components render and handle events. They contain **no money math**.
- **No repeated code:** one `formatRupees`, one `FieldError` component, one reducer for all state changes.
- Descriptive names (`amountPaise`, not `amt`). No magic numbers: `MAX_MEMBERS`, `MIN_MEMBERS`, `STORAGE_KEY` in `constants.js`.
- Logic files are pure (see section 3). Components only receive props and call handlers.
- Short comments only where the *why* isn't obvious (the remainder-paise rule, the bitmask DP).
- Remove the default boilerplate (logo, counter demo, unused CSS and assets).
- No unused imports, no leftover `console.log`.

---

## 11. Suggested timeline (2 hours) and commits

You must commit at least 3 times, so make small, regular commits with meaningful messages.

| Time | Work | Commit message |
|------|------|----------------|
| 0:00 to 0:10 | Clean boilerplate, create folders, `constants.js`, empty README | `Clean template and set up project structure` |
| 0:10 to 0:30 | `money.js`, `validators.js`, reducer + storage hook, `MemberSection` | `Add members with validation and persistence` |
| 0:30 to 0:55 | `ExpenseForm`, `equalSplit`, `ExpenseList` + delete | `Add expenses with validation and expense list` |
| 0:55 to 1:10 | `balances.js` + `BalanceTable`, check sample case | `Add balance calculation` |
| 1:10 to 1:30 | `settle.js` greedy, `SettleUp`, `ResetButton` | `Add settle-up and reset group` |
| 1:30 to 1:45 | Upgrade to exact minimum-transaction algorithm, test chain case | `Use exact minimum-transaction settlement` |
| 1:45 to 1:55 | Responsive CSS, one bonus (filter by member), edge-case pass | `Add responsive layout and member filter` |
| 1:55 to 2:00 | Finish README, final push, **submit repo link** | `Complete README` |

**Priorities if you run late:** core features (40) → validation (15) → twist (15) → code quality (15) → UI/README (10) → bonus. Never skip the README, and push before the deadline. Later commits don't count.

**Deploying (bonus):** Vercel or Netlify is the easiest (import the GitHub repo, build command `npm run build`). For GitHub Pages with Vite you must set `base: "/<repo-name>/"` in `vite.config.js`.

---

## 12. README outline (5 marks)

1. **Project name and one-line description**
2. **How to run:** `npm install`, then `npm run dev` (or `npm start`), plus the deployed link if any
3. **Features completed:** tick-list mapping to requirements 1 to 6, the twist, and bonuses done
4. **How settle-up works:** 2 to 3 sentences on the algorithm
5. **Tech used:** React, JavaScript, CSS, localStorage
6. **Known bugs / limitations:** be honest
7. **Sample test case:** the Rahul/Priya/Aman input and the expected output

---

## 13. Testing plan

1. **Sample case:** enter the three expenses and confirm balances (+550 / −200 / −350) and 2 payments.
2. **Chain case:** A owes B 100, B owes C 100 gives 1 payment (A pays C).
3. **Rounding case:** ₹100 split among 3, check shares and that the net sum is 0.
4. **Delete flow:** delete an expense, balances and settle-up change immediately.
5. **Persistence:** refresh after each step.
6. **Validation:** go through the checklist in section 9.
7. **Quick logic tests:** the files in `src/logic/` are plain JS, so you can write a throwaway script that imports them with hard-coded data and `console.log`s the result (run it with `node`, or temporarily call it from `App`). Delete it before submitting.
8. **Mobile:** check at about 375px width in DevTools device mode.

---

## 14. Viva preparation

You'll explain your code and make a small change live, so:

- Be able to explain **why paise integers**, **how equal-split remainders are handled**, and **how settle-up works** (greedy and the exact DP).
- Know the file layout, which component renders what, and how data flows (state in `App`, props down, handlers up).
- Be ready to explain `useState` vs `useReducer`, why balances are derived with `useMemo` instead of stored, and why list items need `key`.
- Practice small changes such as: change the max members, allow a different decimal rule, change sort order, add a field to the expense, change the currency symbol.
- Write the code in a style you can read aloud. If you can't explain a line, simplify it.

---

## 15. Bonus feature notes (only after the core works)

| Bonus | Approach | Effort |
|-------|----------|--------|
| Filter by member | `<select>` of members + "All". Filter expenses where the member is the payer or in `splitAmong`. Keep the filter in `useState` inside `ExpenseList`, not in saved state. | Low |
| Responsive layout | CSS grid with a media query at about 700px; tables become scrollable | Low |
| Deploy | Push to GitHub, enable Pages (Settings → Pages → main branch) and add the link to the README | Low |
| Mark as settled | Store a `settlements: [{from, to, amountPaise}]` list. Treat each as an extra "payment" in balance math (payer's paid increases, receiver's share increases) so the nets update | Medium |
| Unequal split | Add a split mode (equal / exact / percent). Store `splits: { memberId: paise }` per expense. Validate exact amounts sum to the total and percentages sum to 100. Convert percentages to paise with remainder handling | Medium-High |

Pick the low-effort ones first. The cap is +5, so one or two bonuses are enough.
