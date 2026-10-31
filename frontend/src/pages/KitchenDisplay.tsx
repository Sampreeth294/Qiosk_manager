
import { useCallback, useEffect, useMemo, useState } from "react";

const API_URL = "http://127.0.0.1:8001/api";

type ApiStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "COMPLETED"
  | "CANCELLED";

type Filter =
  | "All"
  | "New"
  | "Confirmed"
  | "Preparing"
  | "Ready"
  | "Completed";

type ApiOrderItem = {
  id?: number;
  item_name?: string;
  menu_item_name?: string;
  name?: string;
  quantity: number;
  note?: string;
};

type ApiOrder = {
  id: number;
  order_number: string;
  restaurant?: number;
  restaurant_name?: string;
  order_type: "DINE_IN" | "TAKEAWAY" | string;
  table_number?: string | number | null;
  status: ApiStatus;
  items: ApiOrderItem[];
  created_at: string;
  updated_at?: string;
};

type KitchenOrder = {
  id: number;
  orderNumber: string;
  customer: string;
  items: { name: string; quantity: number; note?: string }[];
  status: ApiStatus;
  minutesAgo: number;
  orderType: string;
};

const statusLabels: Record<ApiStatus, string> = {
  PENDING: "New",
  CONFIRMED: "Confirmed",
  PREPARING: "Preparing",
  READY: "Ready",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const statusStyles: Record<ApiStatus, string> = {
  PENDING: "bg-blue-50 text-blue-700",
  CONFIRMED: "bg-indigo-50 text-indigo-700",
  PREPARING: "bg-amber-50 text-amber-700",
  READY: "bg-emerald-50 text-emerald-700",
  COMPLETED: "bg-slate-100 text-slate-600",
  CANCELLED: "bg-red-50 text-red-700",
};

const allowedNextStatus: Partial<Record<ApiStatus, ApiStatus>> = {
  PENDING: "CONFIRMED",
  CONFIRMED: "PREPARING",
  PREPARING: "READY",
  READY: "COMPLETED",
};

const actionLabels: Partial<Record<ApiStatus, string>> = {
  PENDING: "Confirm Order",
  CONFIRMED: "Start Preparing",
  PREPARING: "Mark Ready",
  READY: "Complete Order",
};

function mapOrder(order: ApiOrder): KitchenOrder {
  const createdTime = new Date(order.created_at).getTime();
  const minutesAgo = Number.isNaN(createdTime)
    ? 0
    : Math.max(0, Math.floor((Date.now() - createdTime) / 60000));

  return {
    id: order.id,
    orderNumber: order.order_number,
    customer:
      order.order_type === "TAKEAWAY"
        ? "Takeaway"
        : order.table_number != null
          ? `Table ${order.table_number}`
          : order.restaurant_name || "Dine-in",
    items: (order.items ?? []).map((item) => ({
      name: item.item_name || item.menu_item_name || item.name || "Menu item",
      quantity: item.quantity,
      note: item.note,
    })),
    status: order.status,
    minutesAgo,
    orderType:
      order.order_type === "TAKEAWAY" ? "Takeaway" : "Dine-in",
  };
}

export default function KitchenDisplay() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [filter, setFilter] = useState<Filter>("All");
  const [search, setSearch] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingIds, setUpdatingIds] = useState<number[]>([]);

  const fetchOrders = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);

    try {
      const response = await fetch(`${API_URL}/orders/`);

      if (!response.ok) {
        throw new Error(`Could not fetch orders (${response.status}).`);
      }

      const data: ApiOrder[] = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("Unexpected orders response from the server.");
      }

      setOrders(data.map(mapOrder));
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to the backend.",
      );
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void fetchOrders();
    }, 5000);

    return () => window.clearInterval(intervalId);
}, [fetchOrders]);

useEffect(() => {
  const timeoutId = window.setTimeout(() => {
    void fetchOrders(true);
  }, 0);

  return () => window.clearTimeout(timeoutId);
}, [fetchOrders]);

  const counts = useMemo(
    () => ({
      New: orders.filter((o) => o.status === "PENDING").length,
      Confirmed: orders.filter((o) => o.status === "CONFIRMED").length,
      Preparing: orders.filter((o) => o.status === "PREPARING").length,
      Ready: orders.filter((o) => o.status === "READY").length,
      Completed: orders.filter((o) => o.status === "COMPLETED").length,
    }),
    [orders],
  );

  const visibleOrders = useMemo(() => {
    const query = search.toLowerCase();

    return orders.filter((order) => {
      const matchesSearch =
        order.orderNumber.toLowerCase().includes(query) ||
        String(order.id).includes(query) ||
        order.customer.toLowerCase().includes(query) ||
        order.items.some((item) => item.name.toLowerCase().includes(query));

      const label = statusLabels[order.status];
      const matchesFilter = filter === "All" || label === filter;

      const matchesCompleted =
        showCompleted ||
        (order.status !== "COMPLETED" && order.status !== "CANCELLED");

      return matchesSearch && matchesFilter && matchesCompleted;
    });
  }, [orders, filter, search, showCompleted]);

  async function advanceOrder(order: KitchenOrder) {
    const nextStatus = allowedNextStatus[order.status];

    if (!nextStatus || updatingIds.includes(order.id)) return;

    setUpdatingIds((previous) => [...previous, order.id]);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/orders/${order.id}/status/`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        },
      );

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.error || `Status update failed (${response.status}).`,
        );
      }

      // Refresh from the server so the database remains the source of truth.
      await fetchOrders();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update order status.",
      );
    } finally {
      setUpdatingIds((previous) =>
        previous.filter((id) => id !== order.id),
      );
    }
  }

  return (
    <div className="min-h-full space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <p className="text-sm font-medium text-indigo-600">
            RESTAURANT OPERATIONS
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            Kitchen Display
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Live orders from POS · Refreshes every 5 seconds
          </p>
        </div>

        <button
          type="button"
          onClick={() => void fetchOrders(true)}
          disabled={loading}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh Orders"}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void fetchOrders(true)}
            className="font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {(
          [
            ["New Orders", counts.New, "border-blue-200 bg-blue-50 text-blue-700"],
            ["Confirmed", counts.Confirmed, "border-indigo-200 bg-indigo-50 text-indigo-700"],
            ["Preparing", counts.Preparing, "border-amber-200 bg-amber-50 text-amber-700"],
            ["Ready to Serve", counts.Ready, "border-emerald-200 bg-emerald-50 text-emerald-700"],
            ["Completed", counts.Completed, "border-slate-200 bg-white text-slate-700"],
          ] as const
        ).map(([label, count, style]) => (
          <div key={label} className={`rounded-2xl border p-5 shadow-sm ${style}`}>
            <p className="text-sm font-medium">{label}</p>
            <p className="mt-3 text-3xl font-bold">{count}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {(
              ["All", "New", "Confirmed", "Preparing", "Ready", "Completed"] as Filter[]
            ).map((item) => (
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
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={(event) => setShowCompleted(event.target.checked)}
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

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
          Loading orders from POS...
        </div>
      ) : visibleOrders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div className="text-3xl">🍽️</div>
          <h2 className="mt-3 font-semibold text-slate-800">No orders found</h2>
          <p className="mt-1 text-sm text-slate-500">
            Create an order in POS or try a different filter.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {visibleOrders.map((order) => {
            const isLate =
              order.minutesAgo >= 10 &&
              order.status !== "READY" &&
              order.status !== "COMPLETED" &&
              order.status !== "CANCELLED";

            const actionLabel = actionLabels[order.status];

            return (
              <article
                key={order.id}
                className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${
                  isLate ? "border-amber-300" : "border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
                  <div>
                    <p className="break-all text-lg font-bold text-slate-900">
                      Order #{order.id}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {order.customer}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Ref: {order.orderNumber}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${statusStyles[order.status]}`}
                  >
                    {statusLabels[order.status]}
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

                  {order.status === "COMPLETED" ||
                  order.status === "CANCELLED" ? (
                    <div className="rounded-xl bg-slate-50 px-4 py-3 text-center text-sm font-medium text-slate-500">
                      {statusLabels[order.status]}
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={!actionLabel || updatingIds.includes(order.id)}
                      onClick={() => void advanceOrder(order)}
                      className={`w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        order.status === "PENDING" ||
                        order.status === "CONFIRMED"
                          ? "bg-indigo-600 hover:bg-indigo-700"
                          : order.status === "PREPARING"
                            ? "bg-emerald-600 hover:bg-emerald-700"
                            : "bg-slate-800 hover:bg-slate-900"
                      }`}
                    >
                      {updatingIds.includes(order.id)
                        ? "Updating..."
                        : actionLabel}
                      {!updatingIds.includes(order.id) && (
                        <span className="ml-2" aria-hidden="true">
                          →
                        </span>
                      )}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <p className="text-center text-xs text-slate-400">
        Kitchen Display System · Connected to Django REST API
      </p>
    </div>
  );
}
