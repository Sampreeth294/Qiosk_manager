import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../api/apiClient";

type Period = "Today" | "7 Days" | "30 Days";
type Restaurant = { id: number; name: string };
type AnalyticsReport = {
  restaurant_id: number;
  period: { start_date: string; end_date: string };
  summary: {
    revenue: number;
    orders: number;
    average_order_value: number;
    completed_orders: number;
    cancelled_orders: number;
    pending_orders: number;
  };
  status_counts: Record<string, number>;
  sales_series: { date: string; label: string; value: number }[];
  best_sellers: {
    name: string;
    category: string;
    sold: number;
    revenue: number;
  }[];
  inventory_summary: { low_stock_items: number; total_items: number };
  purchase_summary: { orders: number; receipts: number; pending: number };
};

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);

function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateRange(period: Period) {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - (period === "Today" ? 0 : period === "7 Days" ? 6 : 29));
  return { start: localDate(start), end: localDate(end) };
}

function displayStatus(status: string) {
  return status
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function Reports() {
  const [period, setPeriod] = useState<Period>("7 Days");
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restaurantId, setRestaurantId] = useState<number | null>(null);
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void apiRequest<Restaurant[]>("/restaurants/?include_inactive=true")
      .then((items) => {
        if (!active) return;
        setRestaurants(items);
        setRestaurantId(items[0]?.id ?? null);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : "Unable to load restaurants.");
        }
      })
      .finally(() => {
        if (active) setLoadingRestaurants(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!restaurantId) return;

    let active = true;
    const range = dateRange(period);
    const query = new URLSearchParams({
      restaurant_id: String(restaurantId),
      start_date: range.start,
      end_date: range.end,
      series_start_date: range.start,
      series_end_date: range.end,
    });
    void apiRequest<AnalyticsReport>(`/reports/summary/?${query.toString()}`)
      .then((data) => {
        if (active) setReport(data);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setReport(null);
          setError(requestError instanceof Error ? requestError.message : "Unable to load report data.");
        }
      });
    return () => {
      active = false;
    };
  }, [period, restaurantId]);

  const selectedRange = dateRange(period);
  const loadingReport = Boolean(
    restaurantId &&
      !error &&
      (!report ||
        report.restaurant_id !== restaurantId ||
        report.period.start_date !== selectedRange.start ||
        report.period.end_date !== selectedRange.end),
  );
  const maxSales = useMemo(
    () => Math.max(0, ...(report?.sales_series.map((item) => item.value) ?? [])),
    [report],
  );

  function exportCsv() {
    if (!report) return;
    const rows: (string | number)[][] = [
      ["Report", "Qiosk Manager Sales Report"],
      ["Restaurant", restaurants.find((item) => item.id === restaurantId)?.name ?? ""],
      ["Period", `${report.period.start_date} to ${report.period.end_date}`],
      ["Revenue", report.summary.revenue],
      ["Orders", report.summary.orders],
      ["Average Order Value", report.summary.average_order_value],
      [],
      ["Date", "Revenue (INR)"],
      ...report.sales_series.map((item) => [item.label, item.value]),
      [],
      ["Popular Item", "Category", "Quantity Sold", "Revenue (INR)"],
      ...report.best_sellers.map((item) => [item.name, item.category, item.sold, item.revenue]),
    ];
    const csv = rows
      .map((row) =>
        row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `qiosk-report-${period.toLowerCase().replace(" ", "-")}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  const cards = report
    ? [
        {
          label: "Total Revenue",
          value: money(report.summary.revenue),
          note: "From saved orders in this period",
          icon: "₹",
        },
        {
          label: "Total Orders",
          value: report.summary.orders.toLocaleString("en-IN"),
          note: "Orders in selected period",
          icon: "#",
        },
        {
          label: "Average Order Value",
          value: money(report.summary.average_order_value),
          note: "Revenue divided by order count",
          icon: "↗",
        },
        {
          label: "Completed Orders",
          value: report.summary.completed_orders.toLocaleString("en-IN"),
          note: `${report.summary.orders ? Math.round((report.summary.completed_orders / report.summary.orders) * 100) : 0}% of orders`,
          icon: "✓",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-indigo-600">BUSINESS INSIGHTS</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Reports &amp; Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">
            Review saved sales, orders, popular items, inventory, and purchase orders.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="sr-only" htmlFor="report-restaurant">Restaurant</label>
          <select
            id="report-restaurant"
            value={restaurantId ?? ""}
            onChange={(event) => {
              setError("");
              setRestaurantId(Number(event.target.value));
            }}
            disabled={loadingRestaurants || restaurants.length === 0}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-500"
          >
            {restaurants.map((restaurant) => (
              <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>
            ))}
          </select>
          <label className="sr-only" htmlFor="report-period">Report date range</label>
          <select
            id="report-period"
            value={period}
            onChange={(event) => {
              setError("");
              setPeriod(event.target.value as Period);
            }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-500"
          >
            <option value="Today">Today</option>
            <option value="7 Days">Last 7 Days</option>
            <option value="30 Days">Last 30 Days</option>
          </select>
          <button
            type="button"
            onClick={exportCsv}
            disabled={!report || loadingReport}
            className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}
      {loadingReport && (
        <p role="status" className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Loading report data…
        </p>
      )}
      {!loadingRestaurants && restaurants.length === 0 && !error && (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-slate-600">
          No restaurant access is available for this account.
        </p>
      )}

      {report && !loadingReport && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500">{card.label}</p>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 font-semibold text-indigo-600">{card.icon}</span>
                </div>
                <p className="mt-4 text-2xl font-bold text-slate-900">{card.value}</p>
                <p className="mt-2 text-xs text-slate-500">{card.note}</p>
              </div>
            ))}
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Sales Overview</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Daily revenue, {report.period.start_date} through {report.period.end_date}.
                </p>
              </div>
              <span className="rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700">
                {money(report.summary.revenue)}
              </span>
            </div>
            {report.sales_series.length === 0 ? (
              <p className="py-16 text-center text-sm text-slate-500">No sales data in this period.</p>
            ) : (
              <div className="mt-8 flex h-64 items-end gap-3 overflow-x-auto border-b border-slate-100 pb-2 sm:gap-5">
                {report.sales_series.map((item) => (
                  <div key={item.date} className="flex h-full min-w-12 flex-1 flex-col items-center justify-end gap-3">
                    <span className="text-center text-xs text-slate-500">{money(item.value)}</span>
                    <div className="flex h-full w-full items-end">
                      <div
                        title={`${item.label}: ${money(item.value)}`}
                        className="w-full rounded-t-lg bg-indigo-500 transition-all hover:bg-indigo-700"
                        style={{ height: `${maxSales ? Math.max(5, (item.value / maxSales) * 100) : 5}%` }}
                      />
                    </div>
                    <span className="whitespace-nowrap text-xs text-slate-500">{item.label}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="grid gap-6 xl:grid-cols-3">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
              <div className="border-b border-slate-100 p-5 sm:p-6">
                <h2 className="text-lg font-semibold text-slate-900">Popular Menu Items</h2>
                <p className="mt-1 text-sm text-slate-500">Best sellers by saved order quantity.</p>
              </div>
              {report.best_sellers.length === 0 ? (
                <p className="p-8 text-center text-sm text-slate-500">No menu item sales in this period.</p>
              ) : (
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
                      {report.best_sellers.map((item, index) => (
                        <tr key={`${item.name}-${item.category}`} className="hover:bg-slate-50">
                          <td className="px-5 py-4">
                            <span className="mr-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-sm font-semibold text-indigo-600">{index + 1}</span>
                            <span className="font-medium text-slate-800">{item.name}</span>
                          </td>
                          <td className="px-5 py-4 text-slate-500">{item.category}</td>
                          <td className="px-5 py-4 text-right font-medium text-slate-700">{item.sold}</td>
                          <td className="px-5 py-4 text-right font-semibold text-slate-800">{money(item.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold text-slate-900">Order Status</h2>
              <p className="mt-1 text-sm text-slate-500">Saved orders in selected period.</p>
              {Object.entries(report.status_counts).map(([status, count]) => (
                <div key={status} className="mt-5">
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-slate-600">{displayStatus(status)}</span>
                    <span className="font-semibold text-slate-800">{count}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${report.summary.orders ? (count / report.summary.orders) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
              <div className="mt-7 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-amber-50 p-4">
                  <p className="text-xs text-amber-800">Low stock items</p>
                  <p className="mt-1 text-xl font-bold text-amber-950">{report.inventory_summary.low_stock_items}</p>
                </div>
                <div className="rounded-xl bg-violet-50 p-4">
                  <p className="text-xs text-violet-800">Pending purchases</p>
                  <p className="mt-1 text-xl font-bold text-violet-950">{report.purchase_summary.pending}</p>
                </div>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
