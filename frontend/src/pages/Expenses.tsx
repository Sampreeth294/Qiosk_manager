
import { useMemo, useState } from "react";
import type { FormEvent } from "react";

type ExpenseCategory =
  | "Ingredients"
  | "Utilities"
  | "Rent"
  | "Salaries"
  | "Maintenance"
  | "Packaging"
  | "Other";

type PaymentMethod = "Cash" | "UPI" | "Card" | "Bank Transfer";

type Expense = {
  id: number;
  title: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  paymentMethod: PaymentMethod;
  paidTo: string;
};

const initialExpenses: Expense[] = [
  {
    id: 1,
    title: "Vegetable purchase",
    category: "Ingredients",
    amount: 2450,
    date: "2026-10-30",
    paymentMethod: "UPI",
    paidTo: "Green Basket",
  },
  {
    id: 2,
    title: "Electricity bill",
    category: "Utilities",
    amount: 3800,
    date: "2026-10-29",
    paymentMethod: "Bank Transfer",
    paidTo: "Electricity Board",
  },
  {
    id: 3,
    title: "Takeaway packaging",
    category: "Packaging",
    amount: 1250,
    date: "2026-10-28",
    paymentMethod: "Cash",
    paidTo: "PackPro Supplies",
  },
  {
    id: 4,
    title: "Kitchen equipment repair",
    category: "Maintenance",
    amount: 1800,
    date: "2026-10-27",
    paymentMethod: "Card",
    paidTo: "City Repairs",
  },
  {
    id: 5,
    title: "Dairy purchase",
    category: "Ingredients",
    amount: 1650,
    date: "2026-10-26",
    paymentMethod: "UPI",
    paidTo: "Morning Dairy",
  },
  {
    id: 6,
    title: "Monthly rent",
    category: "Rent",
    amount: 18000,
    date: "2026-10-01",
    paymentMethod: "Bank Transfer",
    paidTo: "Property Owner",
  },
];

const categories: ExpenseCategory[] = [
  "Ingredients",
  "Utilities",
  "Rent",
  "Salaries",
  "Maintenance",
  "Packaging",
  "Other",
];

const paymentMethods: PaymentMethod[] = [
  "Cash",
  "UPI",
  "Card",
  "Bank Transfer",
];

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100";

const money = (amount: number) =>
  `₹${amount.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

const today = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function Expenses() {
  const [expenses, setExpenses] =
    useState<Expense[]>(initialExpenses);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [periodFilter, setPeriodFilter] = useState("All time");
  const [showForm, setShowForm] = useState(false);
  const [notice, setNotice] = useState("");

  const [form, setForm] = useState({
    title: "",
    category: "Ingredients" as ExpenseCategory,
    amount: "",
    date: today(),
    paymentMethod: "UPI" as PaymentMethod,
    paidTo: "",
  });

  const filteredExpenses = useMemo(() => {
    const now = new Date();

    return expenses.filter((expense) => {
      const searchText =
        `${expense.title} ${expense.paidTo} ${expense.category}`.toLowerCase();

      const matchesSearch = searchText.includes(search.toLowerCase());

      const matchesCategory =
        categoryFilter === "All" ||
        expense.category === categoryFilter;

      const expenseDate = new Date(
        `${expense.date}T00:00:00`
      );

      let matchesPeriod = true;

      if (periodFilter === "This month") {
        matchesPeriod =
          expenseDate.getFullYear() === now.getFullYear() &&
          expenseDate.getMonth() === now.getMonth();
      } else if (periodFilter === "Last 30 days") {
        const start = new Date(now);
        start.setDate(start.getDate() - 29);
        start.setHours(0, 0, 0, 0);

        matchesPeriod =
          expenseDate >= start &&
          expenseDate <= now;
      }

      return matchesSearch && matchesCategory && matchesPeriod;
    });
  }, [expenses, search, categoryFilter, periodFilter]);

  const totalExpenses = filteredExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );

  const thisMonthExpenses = expenses
    .filter((expense) => {
      const date = new Date(`${expense.date}T00:00:00`);
      const now = new Date();

      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth()
      );
    })
    .reduce((sum, expense) => sum + expense.amount, 0);

  const averageExpense =
    filteredExpenses.length > 0
      ? totalExpenses / filteredExpenses.length
      : 0;

  const largestExpense = expenses.reduce(
    (largest, expense) =>
      expense.amount > largest.amount ? expense : largest,
    expenses[0]
  );

  function addExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amount = Number(form.amount);

    if (
      !form.title.trim() ||
      !form.paidTo.trim() ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !form.date
    ) {
      setNotice("Please enter valid expense details.");
      return;
    }

    const newExpense: Expense = {
      id: Math.max(0, ...expenses.map((expense) => expense.id)) + 1,
      title: form.title.trim(),
      category: form.category,
      amount,
      date: form.date,
      paymentMethod: form.paymentMethod,
      paidTo: form.paidTo.trim(),
    };

    setExpenses((current) => [newExpense, ...current]);

    setForm({
      title: "",
      category: "Ingredients",
      amount: "",
      date: today(),
      paymentMethod: "UPI",
      paidTo: "",
    });

    setShowForm(false);
    setNotice("Expense recorded successfully.");
  }

  function deleteExpense(id: number) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this expense?"
    );

    if (!confirmed) return;

    setExpenses((current) =>
      current.filter((expense) => expense.id !== id)
    );

    setNotice("Expense deleted.");
  }

  function exportCSV() {
    const escapeCSV = (value: string | number) =>
      `"${String(value).replace(/"/g, '""')}"`;

    const rows = [
      [
        "Expense ID",
        "Title",
        "Category",
        "Amount",
        "Date",
        "Payment Method",
        "Paid To",
      ],
      ...filteredExpenses.map((expense) => [
        expense.id,
        expense.title,
        expense.category,
        expense.amount,
        expense.date,
        expense.paymentMethod,
        expense.paidTo,
      ]),
    ];

    const csv = rows
      .map((row) => row.map(escapeCSV).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "qiosk-expenses.csv";
    link.click();

    URL.revokeObjectURL(url);
    setNotice("Expense report exported.");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm text-slate-500">
            Finance / Expenses
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Expense Management
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Record operating costs and monitor restaurant spending.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportCSV}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            ↓ Export CSV
          </button>

          <button
            type="button"
            onClick={() => {
              setNotice("");
              setShowForm((value) => !value);
            }}
            className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
          >
            {showForm ? "Close form" : "+ Add expense"}
          </button>
        </div>
      </div>

      {/* Notification */}
      {notice && (
        <div
          role="status"
          className="flex items-center justify-between rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800"
        >
          <span>{notice}</span>

          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="Dismiss notification"
            className="ml-3 text-lg font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Filtered expenses"
          value={money(totalExpenses)}
          description="Based on current filters"
          symbol="₹"
        />

        <SummaryCard
          title="This month"
          value={money(thisMonthExpenses)}
          description="All recorded expenses this month"
          symbol="▦"
        />

        <SummaryCard
          title="Average expense"
          value={money(averageExpense)}
          description="Per filtered transaction"
          symbol="∅"
        />

        <SummaryCard
          title="Largest expense"
          value={largestExpense ? money(largestExpense.amount) : "₹0"}
          description={largestExpense?.title ?? "No expenses"}
          symbol="↗"
        />
      </div>

      {/* Add expense form */}
      {showForm && (
        <form
          onSubmit={addExpense}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="font-bold text-slate-900">
            Record a new expense
          </h2>

          <p className="mb-5 mt-1 text-sm text-slate-500">
            Enter the transaction details below.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="Expense title">
              <input
                required
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
                placeholder="e.g. Gas cylinder"
                className={inputClass}
              />
            </FormField>

            <FormField label="Category">
              <select
                value={form.category}
                onChange={(event) =>
                  setForm({
                    ...form,
                    category: event.target.value as ExpenseCategory,
                  })
                }
                className={inputClass}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Amount (₹)">
              <input
                required
                type="number"
                min="0.01"
                step="any"
                value={form.amount}
                onChange={(event) =>
                  setForm({ ...form, amount: event.target.value })
                }
                placeholder="0.00"
                className={inputClass}
              />
            </FormField>

            <FormField label="Expense date">
              <input
                required
                type="date"
                max={today()}
                value={form.date}
                onChange={(event) =>
                  setForm({ ...form, date: event.target.value })
                }
                className={inputClass}
              />
            </FormField>

            <FormField label="Payment method">
              <select
                value={form.paymentMethod}
                onChange={(event) =>
                  setForm({
                    ...form,
                    paymentMethod: event.target.value as PaymentMethod,
                  })
                }
                className={inputClass}
              >
                {paymentMethods.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Paid to / vendor">
              <input
                required
                value={form.paidTo}
                onChange={(event) =>
                  setForm({ ...form, paidTo: event.target.value })
                }
                placeholder="Vendor or recipient"
                className={inputClass}
              />
            </FormField>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="submit"
              className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
            >
              Save expense
            </button>

            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Category spending */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="font-bold text-slate-900">
            Spending by category
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Distribution of recorded expenses.
          </p>
        </div>

        <div className="space-y-4">
          {categories
            .map((category) => ({
              category,
              amount: expenses
                .filter((expense) => expense.category === category)
                .reduce((sum, expense) => sum + expense.amount, 0),
            }))
            .filter((entry) => entry.amount > 0)
            .sort((a, b) => b.amount - a.amount)
            .map((entry) => {
              const allTimeTotal = expenses.reduce(
                (sum, expense) => sum + expense.amount,
                0
              );

              const percentage =
                allTimeTotal > 0
                  ? (entry.amount / allTimeTotal) * 100
                  : 0;

              return (
                <div key={entry.category}>
                  <div className="mb-1.5 flex justify-between gap-3 text-sm">
                    <span className="font-medium text-slate-700">
                      {entry.category}
                    </span>

                    <span className="text-slate-500">
                      {money(entry.amount)} · {percentage.toFixed(1)}%
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-violet-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}

          {expenses.length === 0 && (
            <p className="text-sm text-slate-500">
              Add expenses to see category spending.
            </p>
          )}
        </div>
      </section>

      {/* Expense table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-bold text-slate-900">
              Expense transactions
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {filteredExpenses.length} transactions displayed
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search expenses..."
              className={`${inputClass} sm:w-64`}
            />

            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className={inputClass}
            >
              <option value="All">All categories</option>

              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <select
              value={periodFilter}
              onChange={(event) => setPeriodFilter(event.target.value)}
              className={inputClass}
            >
              <option value="All time">All time</option>
              <option value="This month">This month</option>
              <option value="Last 30 days">Last 30 days</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4 font-semibold">Expense</th>
                <th className="px-5 py-4 font-semibold">Category</th>
                <th className="px-5 py-4 font-semibold">Date</th>
                <th className="px-5 py-4 font-semibold">Paid to</th>
                <th className="px-5 py-4 font-semibold">Payment</th>
                <th className="px-5 py-4 font-semibold">Amount</th>
                <th className="px-5 py-4 text-right font-semibold">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-900">
                      {expense.title}
                    </div>

                    <div className="mt-1 text-xs text-slate-400">
                      EXP-{String(expense.id).padStart(4, "0")}
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      {expense.category}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    {expense.date}
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    {expense.paidTo}
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    {expense.paymentMethod}
                  </td>

                  <td className="px-5 py-4 font-semibold text-slate-900">
                    {money(expense.amount)}
                  </td>

                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => deleteExpense(expense.id)}
                      className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <p className="font-semibold text-slate-700">
                      No expenses found
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Try changing your search or filters.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>

            {filteredExpenses.length > 0 && (
              <tfoot className="border-t border-slate-200 bg-slate-50">
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-4 text-right font-semibold text-slate-700"
                  >
                    Filtered total
                  </td>

                  <td className="px-5 py-4 font-bold text-slate-900">
                    {money(totalExpenses)}
                  </td>

                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
          Demo data only. Expenses are stored in React state and reset on
          page reload. Export CSV downloads the currently filtered transactions.
        </div>
      </section>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  description,
  symbol,
}: {
  title: string;
  value: string;
  description: string;
  symbol: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>

        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 font-bold text-violet-700">
          {symbol}
        </span>
      </div>

      <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>

      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">
        {label}
      </span>

      {children}
    </label>
  );
}
