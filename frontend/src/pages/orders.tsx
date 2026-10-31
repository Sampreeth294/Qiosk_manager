
import { useMemo, useState } from "react";

type OrderStatus = "Pending" | "Preparing" | "Ready" | "Completed" | "Cancelled";

type Order = {
  id: string;
  customer: string;
  items: string[];
  total: number;
  status: OrderStatus;
  time: string;
  type: "Dine-in" | "Takeaway";
};

const demoOrders: Order[] = [
  {
    id: "ORD-1001",
    customer: "Rahul Sharma",
    items: ["Paneer Butter Masala", "Butter Naan × 2"],
    total: 320,
    status: "Pending",
    time: "10:15 AM",
    type: "Dine-in",
  },
  {
    id: "ORD-1002",
    customer: "Priya Kumar",
    items: ["Veg Fried Rice", "Gobi Manchurian"],
    total: 260,
    status: "Preparing",
    time: "10:22 AM",
    type: "Takeaway",
  },
  {
    id: "ORD-1003",
    customer: "Arjun Rao",
    items: ["Masala Dosa", "Filter Coffee"],
    total: 140,
    status: "Ready",
    time: "10:28 AM",
    type: "Dine-in",
  },
  {
    id: "ORD-1004",
    customer: "Sneha Patel",
    items: ["Veg Biryani", "Fresh Lime Soda"],
    total: 230,
    status: "Completed",
    time: "10:32 AM",
    type: "Takeaway",
  },
  {
    id: "ORD-1005",
    customer: "Kiran Reddy",
    items: ["Idli × 2", "Vada"],
    total: 100,
    status: "Cancelled",
    time: "10:40 AM",
    type: "Dine-in",
  },
];

const statuses: Array<"All" | OrderStatus> = [
  "All",
  "Pending",
  "Preparing",
  "Ready",
  "Completed",
  "Cancelled",
];

const statusStyles: Record<OrderStatus, string> = {
  Pending: "bg-amber-50 text-amber-700 ring-amber-200",
  Preparing: "bg-blue-50 text-blue-700 ring-blue-200",
  Ready: "bg-violet-50 text-violet-700 ring-violet-200",
  Completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
};

function Orders() {
  const [orders, setOrders] = useState<Order[]>(demoOrders);
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStatus =
        activeFilter === "All" || order.status === activeFilter;

      const matchesSearch =
        order.id.toLowerCase().includes(query) ||
        order.customer.toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [orders, activeFilter, search]);

  const countStatus = (status: OrderStatus) =>
    orders.filter((order) => order.status === status).length;

  function updateStatus(id: string, status: OrderStatus) {
    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === id ? { ...order, status } : order,
      ),
    );

    setSelectedOrder((currentOrder) =>
      currentOrder?.id === id
        ? { ...currentOrder, status }
        : currentOrder,
    );
  }

  return (
    <div className="space-y-6">
      {/* Demo notice */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <span className="text-lg">ⓘ</span>
        <div>
          <p className="text-sm font-semibold text-amber-900">
            Demo data
          </p>
          <p className="mt-1 text-sm text-amber-800">
            These are sample orders for testing the interface. Changes
            are temporary and are not saved to the backend.
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total orders",
            value: orders.length,
            icon: "▤",
            style: "bg-violet-50 text-violet-700",
          },
          {
            label: "Pending",
            value: countStatus("Pending"),
            icon: "◷",
            style: "bg-amber-50 text-amber-700",
          },
          {
            label: "Preparing",
            value: countStatus("Preparing"),
            icon: "♨",
            style: "bg-blue-50 text-blue-700",
          },
          {
            label: "Completed",
            value: countStatus("Completed"),
            icon: "✓",
            style: "bg-emerald-50 text-emerald-700",
          },
        ].map((stat) => (
          <article
            key={stat.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{stat.label}</p>
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg font-bold ${stat.style}`}
              >
                {stat.icon}
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold text-slate-900">
              {stat.value}
            </p>
          </article>
        ))}
      </section>

      {/* Order list */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                All orders
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Search orders and manage their status.
              </p>
            </div>

            <label className="relative block w-full lg:max-w-sm">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                ⌕
              </span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search order ID or customer..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-4 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            </label>
          </div>

          {/* Status filters */}
          <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
            {statuses.map((status) => {
              const selected = activeFilter === status;

              return (
                <button
                  key={status}
                  onClick={() => setActiveFilter(status)}
                  className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition ${
                    selected
                      ? "bg-violet-600 text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {status}
                  {status !== "All" && (
                    <span className="ml-2 opacity-75">
                      {countStatus(status)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Responsive table */}
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
                <tr
                  key={order.id}
                  className="transition hover:bg-slate-50/80"
                >
                  <td className="whitespace-nowrap px-6 py-4">
                    <p className="font-semibold text-slate-900">
                      {order.id}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {order.time}
                    </p>
                  </td>

                  <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-700">
                    {order.customer}
                  </td>

                  <td className="max-w-64 px-6 py-4 text-slate-500">
                    {order.items.join(", ")}
                  </td>

                  <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                    {order.type}
                  </td>

                  <td className="whitespace-nowrap px-6 py-4 font-semibold text-slate-900">
                    ₹{order.total.toFixed(2)}
                  </td>

                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${statusStyles[order.status]}`}
                    >
                      {order.status}
                    </span>
                  </td>

                  <td className="whitespace-nowrap px-6 py-4">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-violet-300 hover:text-violet-700"
                    >
                      View details
                    </button>
                  </td>
                </tr>
              ))}

              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <p className="font-semibold text-slate-700">
                      No orders found
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Try another search or status filter.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-200 px-6 py-4 text-xs text-slate-500">
          Showing {filteredOrders.length} of {orders.length} sample orders
        </div>
      </section>

      {/* Order details modal */}
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
                <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
                  Order details
                </p>
                <h3
                  id="order-modal-title"
                  className="mt-2 text-xl font-bold text-slate-900"
                >
                  {selectedOrder.id}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedOrder.time}
                </p>
              </div>

              <button
                aria-label="Close order details"
                onClick={() => setSelectedOrder(null)}
                className="rounded-lg px-3 py-2 text-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Customer</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {selectedOrder.customer}
                </p>
              </div>

              <div>
                <p className="mb-3 text-sm font-semibold text-slate-800">
                  Items ordered
                </p>

                <ul className="space-y-3">
                  {selectedOrder.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-3 text-sm text-slate-600"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                        •
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                <span className="font-semibold text-slate-700">
                  Order total
                </span>
                <span className="text-xl font-bold text-slate-900">
                  ₹{selectedOrder.total.toFixed(2)}
                </span>
              </div>

              <div>
                <label
                  htmlFor="order-status"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Update order status
                </label>

                <select
                  id="order-status"
                  value={selectedOrder.status}
                  onChange={(event) =>
                    updateStatus(
                      selectedOrder.id,
                      event.target.value as OrderStatus,
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                >
                  {statuses
                    .filter((status) => status !== "All")
                    .map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                </select>

                <p className="mt-2 text-xs text-slate-400">
                  This status change is temporary demo state.
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedOrder(null)}
              className="mt-6 w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white transition hover:bg-violet-700"
            >
              Close details
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

export default Orders;
