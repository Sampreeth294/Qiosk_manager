
import { useMemo, useState } from "react";
import type { FormEvent } from "react";

type OrderStatus = "Draft" | "Pending" | "Approved" | "Received" | "Cancelled";

type PurchaseOrder = {
  id: number;
  orderNumber: string;
  supplier: string;
  item: string;
  quantity: number;
  unitPrice: number;
  orderDate: string;
  expectedDate: string;
  status: OrderStatus;
};

const initialOrders: PurchaseOrder[] = [
  {
    id: 1,
    orderNumber: "PO-2026-001",
    supplier: "Fresh Farm Supplies",
    item: "Tomatoes",
    quantity: 20,
    unitPrice: 32,
    orderDate: "2026-10-27",
    expectedDate: "2026-11-01",
    status: "Pending",
  },
  {
    id: 2,
    orderNumber: "PO-2026-002",
    supplier: "Daily Needs Co.",
    item: "Basmati Rice",
    quantity: 50,
    unitPrice: 85,
    orderDate: "2026-10-28",
    expectedDate: "2026-11-02",
    status: "Approved",
  },
  {
    id: 3,
    orderNumber: "PO-2026-003",
    supplier: "Morning Dairy",
    item: "Milk",
    quantity: 30,
    unitPrice: 58,
    orderDate: "2026-10-29",
    expectedDate: "2026-10-30",
    status: "Received",
  },
  {
    id: 4,
    orderNumber: "PO-2026-004",
    supplier: "Spice Route",
    item: "Chilli Powder",
    quantity: 5,
    unitPrice: 210,
    orderDate: "2026-10-30",
    expectedDate: "2026-11-04",
    status: "Draft",
  },
];

const suppliers = [
  "Fresh Farm Supplies",
  "Daily Needs Co.",
  "Green Basket",
  "Morning Dairy",
  "Spice Route",
];

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100";

const formatMoney = (value: number) =>
  `₹${value.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

const statusOptions: OrderStatus[] = [
  "Draft",
  "Pending",
  "Approved",
  "Received",
  "Cancelled",
];

const statusStyles: Record<OrderStatus, string> = {
  Draft: "bg-slate-100 text-slate-700",
  Pending: "bg-amber-50 text-amber-700",
  Approved: "bg-blue-50 text-blue-700",
  Received: "bg-emerald-50 text-emerald-700",
  Cancelled: "bg-rose-50 text-rose-700",
};

export default function PurchaseOrders() {
  const [orders, setOrders] =
    useState<PurchaseOrder[]>(initialOrders);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [notice, setNotice] = useState("");

  const [form, setForm] = useState({
    supplier: suppliers[0],
    item: "",
    quantity: "1",
    unitPrice: "",
    orderDate: new Date().toLocaleDateString("en-CA"),
    expectedDate: "",
  });

  const totalValue = orders
    .filter((order) => order.status !== "Cancelled")
    .reduce((sum, order) => sum + order.quantity * order.unitPrice, 0);

  const pendingCount = orders.filter(
    (order) => order.status === "Pending"
  ).length;

  const receivedCount = orders.filter(
    (order) => order.status === "Received"
  ).length;

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const text = [
        order.orderNumber,
        order.supplier,
        order.item,
      ]
        .join(" ")
        .toLowerCase();

      return (
        text.includes(search.toLowerCase()) &&
        (filterStatus === "All" || order.status === filterStatus)
      );
    });
  }, [orders, search, filterStatus]);

  function createOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const quantity = Number(form.quantity);
    const unitPrice = Number(form.unitPrice);

    if (
      !form.item.trim() ||
      !form.supplier ||
      !Number.isFinite(quantity) ||
      !Number.isFinite(unitPrice) ||
      quantity <= 0 ||
      unitPrice < 0 ||
      !form.orderDate ||
      !form.expectedDate
    ) {
      setNotice("Please enter valid purchase order details.");
      return;
    }

    if (form.expectedDate < form.orderDate) {
      setNotice("Expected delivery cannot be before the order date.");
      return;
    }

    const nextId = Math.max(0, ...orders.map((order) => order.id)) + 1;

    const newOrder: PurchaseOrder = {
      id: nextId,
      orderNumber: `PO-${new Date().getFullYear()}-${String(nextId).padStart(3, "0")}`,
      supplier: form.supplier,
      item: form.item.trim(),
      quantity,
      unitPrice,
      orderDate: form.orderDate,
      expectedDate: form.expectedDate,
      status: "Pending",
    };

    setOrders((current) => [newOrder, ...current]);
    setShowForm(false);
    setNotice("Purchase order created successfully.");

    setForm({
      supplier: suppliers[0],
      item: "",
      quantity: "1",
      unitPrice: "",
      orderDate: new Date().toLocaleDateString("en-CA"),
      expectedDate: "",
    });
  }

  function updateStatus(id: number, status: OrderStatus) {
    setOrders((current) =>
      current.map((order) =>
        order.id === id ? { ...order, status } : order
      )
    );

    setNotice(`Purchase order status changed to ${status}.`);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm text-slate-500">
            Procurement / Purchase Orders
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Purchase Orders
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Create orders and track ingredient deliveries from suppliers.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setNotice("");
            setShowForm((value) => !value);
          }}
          className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
        >
          {showForm ? "Close form" : "+ Create purchase order"}
        </button>
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
          label="Total orders"
          value={orders.length}
          helper="All purchase orders"
          symbol="▦"
        />

        <SummaryCard
          label="Pending orders"
          value={pendingCount}
          helper="Awaiting processing"
          symbol="◷"
        />

        <SummaryCard
          label="Received orders"
          value={receivedCount}
          helper="Deliveries marked received"
          symbol="✓"
        />

        <SummaryCard
          label="Order value"
          value={formatMoney(totalValue)}
          helper="Excludes cancelled orders"
          symbol="₹"
        />
      </div>

      {/* Create order form */}
      {showForm && (
        <form
          onSubmit={createOrder}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="font-bold text-slate-900">
            Create purchase order
          </h2>

          <p className="mb-5 mt-1 text-sm text-slate-500">
            Enter the supplier, ingredient, quantity, and delivery details.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="Supplier">
              <select
                value={form.supplier}
                onChange={(event) =>
                  setForm({ ...form, supplier: event.target.value })
                }
                className={inputClass}
              >
                {suppliers.map((supplier) => (
                  <option key={supplier} value={supplier}>
                    {supplier}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Ingredient / item">
              <input
                required
                value={form.item}
                onChange={(event) =>
                  setForm({ ...form, item: event.target.value })
                }
                placeholder="e.g. Potatoes"
                className={inputClass}
              />
            </FormField>

            <FormField label="Quantity">
              <input
                required
                type="number"
                min="0.01"
                step="any"
                value={form.quantity}
                onChange={(event) =>
                  setForm({ ...form, quantity: event.target.value })
                }
                className={inputClass}
              />
            </FormField>

            <FormField label="Unit price (₹)">
              <input
                required
                type="number"
                min="0"
                step="any"
                value={form.unitPrice}
                onChange={(event) =>
                  setForm({ ...form, unitPrice: event.target.value })
                }
                placeholder="0.00"
                className={inputClass}
              />
            </FormField>

            <FormField label="Order date">
              <input
                required
                type="date"
                value={form.orderDate}
                onChange={(event) =>
                  setForm({ ...form, orderDate: event.target.value })
                }
                className={inputClass}
              />
            </FormField>

            <FormField label="Expected delivery">
              <input
                required
                type="date"
                min={form.orderDate}
                value={form.expectedDate}
                onChange={(event) =>
                  setForm({ ...form, expectedDate: event.target.value })
                }
                className={inputClass}
              />
            </FormField>
          </div>

          <div className="mt-4 rounded-xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Estimated order total</p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {formatMoney(
                Math.max(0, Number(form.quantity) || 0) *
                  Math.max(0, Number(form.unitPrice) || 0)
              )}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="submit"
              className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
            >
              Create order
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

      {/* Orders table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-bold text-slate-900">All purchase orders</h2>

            <p className="mt-1 text-sm text-slate-500">
              {filteredOrders.length} orders displayed
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search order, supplier, item..."
              className={`${inputClass} sm:w-64`}
            />

            <select
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
              className={inputClass}
            >
              <option value="All">All statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4 font-semibold">Order ID</th>
                <th className="px-5 py-4 font-semibold">Supplier / item</th>
                <th className="px-5 py-4 font-semibold">Order date</th>
                <th className="px-5 py-4 font-semibold">Expected delivery</th>
                <th className="px-5 py-4 font-semibold">Quantity</th>
                <th className="px-5 py-4 font-semibold">Total</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 font-semibold">Update status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-semibold text-slate-900">
                    {order.orderNumber}
                  </td>

                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-800">
                      {order.supplier}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {order.item}
                    </p>
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    {order.orderDate}
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    {order.expectedDate}
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    {order.quantity}
                  </td>

                  <td className="px-5 py-4 font-semibold text-slate-900">
                    {formatMoney(order.quantity * order.unitPrice)}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[order.status]}`}
                    >
                      {order.status}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <select
                      aria-label={`Update status for ${order.orderNumber}`}
                      value={order.status}
                      onChange={(event) =>
                        updateStatus(
                          order.id,
                          event.target.value as OrderStatus
                        )
                      }
                      className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs outline-none focus:border-violet-400"
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}

              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center">
                    <p className="font-semibold text-slate-700">
                      No purchase orders found
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

        <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
          Demo data only. Updating an order to Received does not automatically
          update the Inventory page.
        </div>
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  helper,
  symbol,
}: {
  label: string;
  value: string | number;
  helper: string;
  symbol: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>

        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 font-bold text-violet-700">
          {symbol}
        </span>
      </div>

      <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
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
