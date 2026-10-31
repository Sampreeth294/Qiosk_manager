
import { useMemo, useState } from "react";

type Period = "Today" | "7 Days" | "30 Days";

const demoReports = {
  Today: {
    revenue: 12450,
    orders: 86,
    average: 144.77,
    completed: 68,
    cancelled: 4,
    pending: 14,
    sales: [
      { day: "9 AM", value: 900 },
      { day: "11 AM", value: 1800 },
      { day: "1 PM", value: 3200 },
      { day: "3 PM", value: 1500 },
      { day: "5 PM", value: 2100 },
      { day: "7 PM", value: 2950 },
    ],
  },
  "7 Days": {
    revenue: 82400,
    orders: 542,
    average: 151.85,
    completed: 451,
    cancelled: 21,
    pending: 70,
    sales: [
      { day: "Mon", value: 9200 },
      { day: "Tue", value: 10500 },
      { day: "Wed", value: 8700 },
      { day: "Thu", value: 12600 },
      { day: "Fri", value: 14800 },
      { day: "Sat", value: 17200 },
      { day: "Sun", value: 9400 },
    ],
  },
  "30 Days": {
    revenue: 356800,
    orders: 2340,
    average: 152.48,
    completed: 1980,
    cancelled: 94,
    pending: 266,
    sales: [
      { day: "Week 1", value: 72500 },
      { day: "Week 2", value: 84100 },
      { day: "Week 3", value: 93200 },
      { day: "Week 4", value: 107000 },
    ],
  },
};

const popularItems = [
  { name: "Masala Dosa", category: "South Indian", sold: 245, revenue: 24500 },
  { name: "Veg Fried Rice", category: "Chinese", sold: 198, revenue: 29700 },
  { name: "Paneer Butter Masala", category: "North Indian", sold: 164, revenue: 32800 },
  { name: "Idli Vada", category: "South Indian", sold: 152, revenue: 9120 },
  { name: "Veg Biryani", category: "Rice & Biryani", sold: 128, revenue: 19200 },
];

const paymentMethods = [
  { name: "UPI", percentage: 55, amount: 0 },
  { name: "Cash", percentage: 25, amount: 0 },
  { name: "Card", percentage: 20, amount: 0 },
];

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

export default function Reports() {
  const [period, setPeriod] = useState<Period>("7 Days");

  const report = demoReports[period];

  const maxSales = Math.max(...report.sales.map((item) => item.value));

  const computedPayments = useMemo(
    () =>
      paymentMethods.map((payment) => ({
        ...payment,
        amount: Math.round(
          report.revenue * (payment.percentage / 100),
        ),
      })),
    [report.revenue],
  );

  const cards = [
    {
      label: "Total Revenue",
      value: money(report.revenue),
      note: "Demo revenue",
      icon: "₹",
    },
    {
      label: "Total Orders",
      value: report.orders.toLocaleString("en-IN"),
      note: "Orders in selected period",
      icon: "#",
    },
    {
      label: "Average Order Value",
      value: money(report.average),
      note: "Revenue ÷ orders",
      icon: "↗",
    },
    {
      label: "Completed Orders",
      value: report.completed.toLocaleString("en-IN"),
      note: `${Math.round((report.completed / report.orders) * 100)}% of orders`,
      icon: "✓",
    },
  ];

  function exportCsv() {
    const rows = [
      ["Report", "Qiosk Manager Sales Report"],
      ["Period", period],
      ["Revenue", report.revenue],
      ["Orders", report.orders],
      ["Average Order Value", report.average],
      [],
      ["Sales Interval", "Revenue (INR)"],
      ...report.sales.map((item) => [item.day, item.value]),
      [],
      ["Popular Item", "Category", "Quantity Sold", "Revenue (INR)"],
      ...popularItems.map((item) => [
        item.name,
        item.category,
        item.sold,
        item.revenue,
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((cell) => {
            const value = String(cell ?? "");
            return `"${value.replace(/"/g, '""')}"`;
          })
          .join(","),
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `qiosk-report-${period.toLowerCase().replace(" ", "-")}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-indigo-600">
            BUSINESS INSIGHTS
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            Reports & Analytics
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Review sales, orders, popular items, and payment breakdowns.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value as Period)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-500"
            aria-label="Report date range"
          >
            <option value="Today">Today</option>
            <option value="7 Days">Last 7 Days</option>
            <option value="30 Days">Last 30 Days</option>
          </select>

          <button
            type="button"
            onClick={exportCsv}
            className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Demo data only. These reports are not connected to actual restaurant orders or payments.
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{card.label}</p>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 font-semibold text-indigo-600">
                {card.icon}
              </span>
            </div>
            <p className="mt-4 text-2xl font-bold text-slate-900">
              {card.value}
            </p>
            <p className="mt-2 text-xs text-slate-500">{card.note}</p>
          </div>
        ))}
      </div>

      {/* Sales chart */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Sales Overview
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Revenue by interval for {period.toLowerCase()}.
            </p>
          </div>
          <span className="rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700">
            {money(report.revenue)}
          </span>
        </div>

        <div className="mt-8 flex h-64 items-end gap-3 overflow-x-auto border-b border-slate-100 pb-2 sm:gap-5">
          {report.sales.map((item) => (
            <div
              key={item.day}
              className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-3"
            >
              <span className="text-center text-xs text-slate-500">
                {money(item.value)}
              </span>

              <div className="flex h-full w-full items-end">
                <div
                  title={`${item.day}: ${money(item.value)}`}
                  className="w-full rounded-t-lg bg-indigo-500 transition-all hover:bg-indigo-700"
                  style={{
                    height: `${Math.max(
                      5,
                      (item.value / maxSales) * 100,
                    )}%`,
                  }}
                />
              </div>

              <span className="whitespace-nowrap text-xs text-slate-500">
                {item.day}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Popular items and order status */}
      <div className="grid gap-6 xl:grid-cols-3">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
          <div className="border-b border-slate-100 p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Popular Menu Items
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Demo item performance.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-medium">Menu Item</th>
                  <th className="px-5 py-4 font-medium">Category</th>
                  <th className="px-5 py-4 text-right font-medium">Sold</th>
                  <th className="px-5 py-4 text-right font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {popularItems.map((item, index) => (
                  <tr key={item.name} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-sm font-semibold text-indigo-600">
                          {index + 1}
                        </span>
                        <span className="font-medium text-slate-800">
                          {item.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-500">
                      {item.category}
                    </td>
                    <td className="px-5 py-4 text-right font-medium text-slate-700">
                      {item.sold}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-slate-800">
                      {money(item.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Order status */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Order Status
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Orders in selected period.
          </p>

          {[
            {
              label: "Completed",
              value: report.completed,
              color: "bg-emerald-500",
            },
            {
              label: "Pending / Preparing",
              value: report.pending,
              color: "bg-amber-500",
            },
            {
              label: "Cancelled",
              value: report.cancelled,
              color: "bg-rose-500",
            },
          ].map((item) => (
            <div key={item.label} className="mt-6">
              <div className="flex justify-between gap-3 text-sm">
                <span className="text-slate-600">{item.label}</span>
                <span className="font-semibold text-slate-800">
                  {item.value}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${item.color}`}
                  style={{
                    width: `${(item.value / report.orders) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}

          <div className="mt-8 rounded-xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Total orders</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {report.orders}
            </p>
          </div>
        </section>
      </div>

      {/* Payment breakdown */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-lg font-semibold text-slate-900">
          Payment Breakdown
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Illustrative allocation of revenue by payment method.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {computedPayments.map((payment) => (
            <div
              key={payment.name}
              className="rounded-xl border border-slate-100 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-slate-700">
                  {payment.name}
                </span>
                <span className="text-sm font-semibold text-indigo-600">
                  {payment.percentage}%
                </span>
              </div>

              <p className="mt-3 text-xl font-bold text-slate-900">
                {money(payment.amount)}
              </p>

              <div className="mt-3 h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-indigo-500"
                  style={{ width: `${payment.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
