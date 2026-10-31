
import { useMemo, useState } from "react";

type OrderStatus = "New" | "Preparing" | "Ready" | "Completed";

type KitchenOrder = {
  id: string;
  customer: string;
  items: { name: string; quantity: number; note?: string }[];
  status: OrderStatus;
  minutesAgo: number;
  orderType: "Dine-in" | "Takeaway";
};

const initialOrders: KitchenOrder[] = [
  {
    id: "ORD-1042",
    customer: "Table 04",
    items: [
      { name: "Masala Dosa", quantity: 2 },
      { name: "Idli Vada", quantity: 1, note: "Extra chutney" },
    ],
    status: "New",
    minutesAgo: 2,
    orderType: "Dine-in",
  },
  {
    id: "ORD-1043",
    customer: "Takeaway",
    items: [
      { name: "Veg Fried Rice", quantity: 1 },
      { name: "Gobi Manchurian", quantity: 1, note: "Less spicy" },
    ],
    status: "Preparing",
    minutesAgo: 8,
    orderType: "Takeaway",
  },
  {
    id: "ORD-1044",
    customer: "Table 02",
    items: [
      { name: "Paneer Butter Masala", quantity: 1 },
      { name: "Butter Naan", quantity: 3 },
    ],
    status: "Preparing",
    minutesAgo: 12,
    orderType: "Dine-in",
  },
  {
    id: "ORD-1045",
    customer: "Table 07",
    items: [{ name: "Veg Biryani", quantity: 2 }],
    status: "Ready",
    minutesAgo: 6,
    orderType: "Dine-in",
  },
  {
    id: "ORD-1046",
    customer: "Takeaway",
    items: [
      { name: "Idli Vada", quantity: 2 },
      { name: "Filter Coffee", quantity: 2 },
    ],
    status: "New",
    minutesAgo: 1,
    orderType: "Takeaway",
  },
  {
    id: "ORD-1047",
    customer: "Table 01",
    items: [{ name: "Masala Dosa", quantity: 1 }],
    status: "Completed",
    minutesAgo: 18,
    orderType: "Dine-in",
  },
];

type Filter = "All" | "New" | "Preparing" | "Ready";

const statusStyles: Record<OrderStatus, string> = {
  New: "bg-blue-50 text-blue-700",
  Preparing: "bg-amber-50 text-amber-700",
  Ready: "bg-emerald-50 text-emerald-700",
  Completed: "bg-slate-100 text-slate-600",
};

function nextStatus(status: OrderStatus): OrderStatus {
  switch (status) {
    case "New":
      return "Preparing";
    case "Preparing":
      return "Ready";
    case "Ready":
      return "Completed";
    default:
      return "Completed";
  }
}

function nextActionLabel(status: OrderStatus): string {
  switch (status) {
    case "New":
      return "Start Preparing";
    case "Preparing":
      return "Mark Ready";
    case "Ready":
      return "Complete Order";
    default:
      return "Completed";
  }
}

export default function KitchenDisplay() {
  const [orders, setOrders] = useState<KitchenOrder[]>(initialOrders);
  const [filter, setFilter] = useState<Filter>("All");
  const [search, setSearch] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);

  const counts = useMemo(
    () => ({
      New: orders.filter((order) => order.status === "New").length,
      Preparing: orders.filter((order) => order.status === "Preparing").length,
      Ready: orders.filter((order) => order.status === "Ready").length,
      Completed: orders.filter((order) => order.status === "Completed").length,
    }),
    [orders],
  );

  const visibleOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        order.id.toLowerCase().includes(search.toLowerCase()) ||
        order.customer.toLowerCase().includes(search.toLowerCase()) ||
        order.items.some((item) =>
          item.name.toLowerCase().includes(search.toLowerCase()),
        );

      const matchesFilter =
        filter === "All" || order.status === filter;

      const matchesCompleted =
        showCompleted || order.status !== "Completed";

      return matchesSearch && matchesFilter && matchesCompleted;
    });
  }, [orders, filter, search, showCompleted]);

  function advanceOrder(orderId: string) {
    setOrders((previous) =>
      previous.map((order) =>
        order.id === orderId
          ? { ...order, status: nextStatus(order.status) }
          : order,
      ),
    );
  }

  function resetDemoOrders() {
    setOrders(initialOrders);
    setFilter("All");
    setSearch("");
    setShowCompleted(false);
  }

  return (
    <div className="min-h-full space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <p className="text-sm font-medium text-indigo-600">
            RESTAURANT OPERATIONS
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            Kitchen Display
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage incoming orders and kitchen preparation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
            Demo mode
          </span>

          <button
            type="button"
            onClick={resetDemoOrders}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Reset Demo
          </button>
        </div>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          {
            label: "New Orders",
            count: counts.New,
            color: "border-blue-200 bg-blue-50",
            text: "text-blue-700",
          },
          {
            label: "Preparing",
            count: counts.Preparing,
            color: "border-amber-200 bg-amber-50",
            text: "text-amber-700",
          },
          {
            label: "Ready to Serve",
            count: counts.Ready,
            color: "border-emerald-200 bg-emerald-50",
            text: "text-emerald-700",
          },
          {
            label: "Completed",
            count: counts.Completed,
            color: "border-slate-200 bg-white",
            text: "text-slate-700",
          },
        ].map((item) => (
          <div
            key={item.label}
            className={`rounded-2xl border p-5 shadow-sm ${item.color}`}
          >
            <p className={`text-sm font-medium ${item.text}`}>
              {item.label}
            </p>
            <p className={`mt-3 text-3xl font-bold ${item.text}`}>
              {item.count}
            </p>
          </div>
        ))}
      </div>

      {/* Search and filters */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {(["All", "New", "Preparing", "Ready"] as Filter[]).map(
              (item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                    filter === item
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {item}
                </button>
              ),
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={(event) =>
                  setShowCompleted(event.target.checked)
                }
                className="h-4 w-4 accent-indigo-600"
              />
              Show completed
            </label>

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search order or item..."
              aria-label="Search kitchen orders"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 sm:w-64"
            />
          </div>
        </div>
      </section>

      {/* Order cards */}
      {visibleOrders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div className="text-3xl">🍽️</div>
          <h2 className="mt-3 font-semibold text-slate-800">
            No orders found
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Try another filter or search term.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {visibleOrders.map((order) => {
            const isLate =
              order.minutesAgo >= 10 &&
              order.status !== "Ready" &&
              order.status !== "Completed";

            return (
              <article
                key={order.id}
                className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${
                  isLate
                    ? "border-amber-300"
                    : "border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
                  <div>
                    <p className="text-lg font-bold text-slate-900">
                      {order.id}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {order.customer}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      statusStyles[order.status]
                    }`}
                  >
                    {order.status}
                  </span>
                </div>

                <div className="space-y-4 p-5">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 font-medium text-slate-600">
                      {order.orderType}
                    </span>
                    <span
                      className={`rounded-lg px-2.5 py-1.5 font-medium ${
                        isLate
                          ? "bg-amber-50 text-amber-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {order.minutesAgo} min ago
                      {isLate ? " · Check delay" : ""}
                    </span>
                  </div>

                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Order Items
                    </p>

                    <div className="space-y-4">
                      {order.items.map((item, index) => (
                        <div
                          key={`${item.name}-${index}`}
                          className="flex items-start gap-3"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-sm font-bold text-indigo-700">
                            {item.quantity}
                          </span>

                          <div>
                            <p className="text-sm font-medium text-slate-800">
                              {item.name}
                            </p>
                            {item.note && (
                              <p className="mt-1 text-xs text-amber-700">
                                Note: {item.note}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {order.status === "Completed" ? (
                    <div className="rounded-xl bg-slate-50 px-4 py-3 text-center text-sm font-medium text-slate-500">
                      Order completed
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => advanceOrder(order.id)}
                      className={`w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition ${
                        order.status === "New"
                          ? "bg-indigo-600 hover:bg-indigo-700"
                          : order.status === "Preparing"
                            ? "bg-emerald-600 hover:bg-emerald-700"
                            : "bg-slate-800 hover:bg-slate-900"
                      }`}
                    >
                      {nextActionLabel(order.status)}
                      <span className="ml-2" aria-hidden="true">
                        →
                      </span>
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <p className="text-center text-xs text-slate-400">
        Kitchen Display System · Demo orders · Changes are temporary
      </p>
    </div>
  );
}
