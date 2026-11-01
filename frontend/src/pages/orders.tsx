import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../api/apiClient";
import { chooseRestaurantId, storeSelectedRestaurantId } from "../api/restaurantSelection";

type OrderStatus = "PENDING" | "CONFIRMED" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED";
type StatusFilter = "All" | OrderStatus;
type Restaurant = { id: number; name: string; is_active: boolean };
type ApiOrder = {
  id: number;
  order_number: string;
  display_order_number: string | null;
  restaurant: number;
  order_type: "DINE_IN" | "TAKEAWAY";
  table_number: string;
  status: OrderStatus;
  total_amount: string;
  items: { id: number; item_name: string; quantity: number; unit_price: string }[];
  created_at: string;
};
type Order = {
  id: number;
  displayId: string;
  items: string[];
  total: number;
  status: OrderStatus;
  time: string;
  type: string;
};

const statuses: StatusFilter[] = [
  "All",
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "COMPLETED",
  "CANCELLED",
];

const statusLabels: Record<OrderStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PREPARING: "Preparing",
  READY: "Ready",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const statusStyles: Record<OrderStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
  CONFIRMED: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  PREPARING: "bg-blue-50 text-blue-700 ring-blue-200",
  READY: "bg-violet-50 text-violet-700 ring-violet-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  CANCELLED: "bg-rose-50 text-rose-700 ring-rose-200",
};

const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY"],
  READY: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

function mapOrder(order: ApiOrder): Order {
  return {
    id: order.id,
    displayId: order.display_order_number ?? order.order_number.slice(0, 8).toUpperCase(),
    items: order.items.map((item) => `${item.item_name} × ${item.quantity}`),
    total: Number(order.total_amount),
    status: order.status,
    time: new Date(order.created_at).toLocaleString(),
    type: order.order_type === "DINE_IN"
      ? order.table_number ? `Dine-in · Table ${order.table_number}` : "Dine-in"
      : "Takeaway",
  };
}

function Orders() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restaurantId, setRestaurantId] = useState<number | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>("All");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loadedRestaurantId, setLoadedRestaurantId] = useState<number | null>(null);
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void apiRequest<Restaurant[]>("/restaurants/?include_inactive=true")
      .then((data) => {
        if (!active) return;
        const activeRestaurants = data.filter((restaurant) => restaurant.is_active);
        setRestaurants(activeRestaurants);
        setRestaurantId(chooseRestaurantId(activeRestaurants));
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "Unable to load restaurants.");
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
    void apiRequest<ApiOrder[]>(`/orders/?restaurant_id=${restaurantId}`)
      .then((data) => {
        if (!active) return;
        const mapped = data.map(mapOrder);
        setOrders(mapped);
        setSelectedOrder((selected) => mapped.find((order) => order.id === selected?.id) ?? null);
        setLoadedRestaurantId(restaurantId);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setOrders([]);
          setError(requestError instanceof Error ? requestError.message : "Unable to load orders.");
          setLoadedRestaurantId(restaurantId);
        }
      });
    return () => {
      active = false;
    };
  }, [restaurantId]);

  const loadingOrders = Boolean(restaurantId && loadedRestaurantId !== restaurantId);
  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesStatus = activeFilter === "All" || order.status === activeFilter;
      const matchesSearch = order.displayId.toLowerCase().includes(query) ||
        order.items.some((item) => item.toLowerCase().includes(query));
      return matchesStatus && matchesSearch;
    });
  }, [orders, activeFilter, search]);

  function countStatus(status: OrderStatus) {
    return orders.filter((order) => order.status === status).length;
  }

  async function updateStatus(order: Order, nextStatus: OrderStatus) {
    if (!restaurantId) return;
    setUpdating(true);
    setError("");
    try {
      const updated = await apiRequest<ApiOrder>(`/orders/${order.id}/status/`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      const mapped = mapOrder(updated);
      setOrders((current) => current.map((item) => item.id === mapped.id ? mapped : item));
      setSelectedOrder(mapped);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update order status.");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-violet-600">ORDER MANAGEMENT</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Orders</h1>
          <p className="mt-1 text-sm text-slate-500">Review saved orders and apply valid status transitions.</p>
        </div>
        <label className="flex items-center gap-3 text-sm text-slate-600">
          Restaurant
          <select
            aria-label="Select restaurant"
            value={restaurantId ?? ""}
            disabled={loadingRestaurants || restaurants.length === 0}
            onChange={(event) => {
              setError("");
              const selectedId = Number(event.target.value);
              storeSelectedRestaurantId(selectedId);
              setRestaurantId(selectedId);
            }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-violet-500"
          >
            {restaurants.map((restaurant) => (
              <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}
      {loadingOrders && <p role="status" className="text-sm text-slate-500">Loading orders…</p>}
      {!loadingRestaurants && restaurants.length === 0 && !error && (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-slate-600">
          No restaurant access is available for this account.
        </p>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total orders", value: orders.length, icon: "▤", style: "bg-violet-50 text-violet-700" },
          { label: "Pending", value: countStatus("PENDING"), icon: "◷", style: "bg-amber-50 text-amber-700" },
          { label: "Preparing", value: countStatus("PREPARING"), icon: "♨", style: "bg-blue-50 text-blue-700" },
          { label: "Completed", value: countStatus("COMPLETED"), icon: "✓", style: "bg-emerald-50 text-emerald-700" },
        ].map((stat) => (
          <article key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{stat.label}</p>
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg font-bold ${stat.style}`}>{stat.icon}</span>
            </div>
            <p className="mt-4 text-3xl font-bold text-slate-900">{stat.value}</p>
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900">All orders</h2>
              <p className="mt-1 text-sm text-slate-500">Search orders and manage their status.</p>
            </div>
            <label className="relative block w-full lg:max-w-sm">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search order number or items…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-4 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            </label>
          </div>
          <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
            {statuses.map((status) => {
              const selected = activeFilter === status;
              return (
                <button
                  type="button"
                  key={status}
                  onClick={() => setActiveFilter(status)}
                  className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition ${selected ? "bg-violet-600 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                >
                  {status === "All" ? status : statusLabels[status]}
                  {status !== "All" && <span className="ml-2 opacity-75">{countStatus(status)}</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Order</th>
                <th className="px-6 py-4 font-semibold">Customer</th>
                <th className="px-6 py-4 font-semibold">Items</th>
                <th className="px-6 py-4 font-semibold">Order type</th>
                <th className="px-6 py-4 font-semibold">Total</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="transition hover:bg-slate-50/80">
                  <td className="whitespace-nowrap px-6 py-4">
                    <p className="font-semibold text-slate-900">#{order.displayId}</p>
                    <p className="mt-1 text-xs text-slate-400">{order.time}</p>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-700">Guest / POS order</td>
                  <td className="max-w-64 px-6 py-4 text-slate-500">{order.items.join(", ")}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-slate-600">{order.type}</td>
                  <td className="whitespace-nowrap px-6 py-4 font-semibold text-slate-900">₹{order.total.toFixed(2)}</td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${statusStyles[order.status]}`}>
                      {statusLabels[order.status]}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(order)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-violet-300 hover:text-violet-700"
                    >
                      View details
                    </button>
                  </td>
                </tr>
              ))}
              {!loadingOrders && filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <p className="font-semibold text-slate-700">{orders.length ? "No orders found" : "No orders yet"}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {orders.length ? "Try another search or status filter." : "New customer and POS orders will appear here."}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-200 px-6 py-4 text-xs text-slate-500">
          Showing {filteredOrders.length} of {orders.length} restaurant orders
        </div>
      </section>

      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          onClick={() => setSelectedOrder(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-modal-title"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">Order details</p>
                <h2 id="order-modal-title" className="mt-2 text-xl font-bold text-slate-900">#{selectedOrder.displayId}</h2>
                <p className="mt-1 text-sm text-slate-500">{selectedOrder.time}</p>
              </div>
              <button type="button" aria-label="Close order details" onClick={() => setSelectedOrder(null)} className="rounded-lg px-3 py-2 text-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">×</button>
            </div>
            <div className="mt-6 space-y-4">
              <div>
                <p className="mb-3 text-sm font-semibold text-slate-800">Items ordered</p>
                <ul className="space-y-3">
                  {selectedOrder.items.map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm text-slate-600">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-700">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                <span className="font-semibold text-slate-700">Order total</span>
                <span className="text-xl font-bold text-slate-900">₹{selectedOrder.total.toFixed(2)}</span>
              </div>
              <div>
                <label htmlFor="order-status" className="mb-2 block text-sm font-semibold text-slate-700">Update order status</label>
                <select
                  id="order-status"
                  value={selectedOrder.status}
                  disabled={updating || allowedTransitions[selectedOrder.status].length === 0}
                  onChange={(event) => void updateStatus(selectedOrder, event.target.value as OrderStatus)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-50"
                >
                  <option value={selectedOrder.status}>{statusLabels[selectedOrder.status]}</option>
                  {allowedTransitions[selectedOrder.status].map((status) => (
                    <option key={status} value={status}>{statusLabels[status]}</option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-slate-400">
                  Status changes are validated and saved by the server.
                </p>
              </div>
            </div>
            <button type="button" onClick={() => setSelectedOrder(null)} className="mt-6 w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white transition hover:bg-violet-700">
              Close details
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

export default Orders;
