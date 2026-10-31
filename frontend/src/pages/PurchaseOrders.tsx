
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { apiRequest } from "../api/apiClient";

type OrderStatus =
  | "DRAFT"
  | "PENDING"
  | "APPROVED"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CANCELLED";

type PurchaseOrder = {
  id: number;
  order_number: string;
  supplier_name: string;
  order_date: string;
  expected_date: string | null;
  total_amount: string;
  status: OrderStatus;
  lines: PurchaseOrderLine[];
};

type PurchaseOrderLine = {
  id: number;
  ingredient: number;
  ingredient_name: string;
  unit: string;
  ordered_quantity: string;
  received_quantity: string;
  unit_price: string;
};
type Restaurant = { id: number; name: string };
type Supplier = { id: number; name: string; is_active: boolean };
type Ingredient = {
  id: number;
  name: string;
  unit: string;
  is_active: boolean;
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100";

const formatMoney = (value: number) =>
  `₹${value.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

const statusOptions: OrderStatus[] = [
  "DRAFT",
  "PENDING",
  "APPROVED",
  "PARTIALLY_RECEIVED",
  "RECEIVED",
  "CANCELLED",
];

const statusStyles: Record<OrderStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  PENDING: "bg-amber-50 text-amber-700",
  APPROVED: "bg-blue-50 text-blue-700",
  PARTIALLY_RECEIVED: "bg-violet-50 text-violet-700",
  RECEIVED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-rose-50 text-rose-700",
};

export default function PurchaseOrders() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [restaurantId, setRestaurantId] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    supplier: "",
    ingredient: "",
    quantity: "1",
    unitPrice: "",
    orderDate: new Date().toISOString().slice(0, 10),
    expectedDate: "",
  });

  useEffect(() => {
    apiRequest<Restaurant[]>("/restaurants/?include_inactive=true")
      .then((data) => {
        setRestaurants(data);
        if (data.length > 0) setRestaurantId(String(data[0].id));
        else setLoading(false);
      })
      .catch((error: unknown) => {
        setNotice(error instanceof Error ? error.message : "Unable to load restaurants.");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!restaurantId) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;

      setLoading(true);
      const query = `?restaurant_id=${encodeURIComponent(restaurantId)}`;
      Promise.all([
        apiRequest<PurchaseOrder[]>(`/purchase-orders/${query}`),
        apiRequest<Supplier[]>(`/suppliers/${query}`),
        apiRequest<Ingredient[]>(`/inventory/ingredients/${query}`),
      ])
        .then(([orderData, supplierData, ingredientData]) => {
          if (cancelled) return;
          setOrders(orderData);
          setSuppliers(supplierData.filter((supplier) => supplier.is_active));
          setIngredients(ingredientData.filter((ingredient) => ingredient.is_active));
          setForm((current) => ({
            ...current,
            supplier: current.supplier || String(supplierData[0]?.id ?? ""),
            ingredient: current.ingredient || String(ingredientData[0]?.id ?? ""),
          }));
        })
        .catch((error: unknown) => {
          if (cancelled) return;
          setNotice(error instanceof Error ? error.message : "Unable to load purchase orders.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [restaurantId]);

  const totalValue = orders
    .filter((order) => order.status !== "CANCELLED")
    .reduce((sum, order) => sum + Number(order.total_amount), 0);

  const pendingCount = orders.filter(
    (order) => order.status === "PENDING"
  ).length;

  const receivedCount = orders.filter(
    (order) => order.status === "RECEIVED"
  ).length;

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const text = [
        order.order_number,
        order.supplier_name,
        ...order.lines.map((line) => line.ingredient_name),
      ]
        .join(" ")
        .toLowerCase();

      return (
        text.includes(search.toLowerCase()) &&
        (filterStatus === "All" || order.status === filterStatus)
      );
    });
  }, [orders, search, filterStatus]);

  async function createOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const quantity = Number(form.quantity);
    const unitPrice = Number(form.unitPrice);

    if (
      !form.ingredient ||
      !form.supplier ||
      !restaurantId ||
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

    try {
      await apiRequest<PurchaseOrder>("/purchase-orders/", {
        method: "POST",
        body: JSON.stringify({
          restaurant: Number(restaurantId),
          supplier: Number(form.supplier),
          order_date: form.orderDate,
          expected_date: form.expectedDate || null,
          lines: [{
            ingredient: Number(form.ingredient),
            ordered_quantity: quantity.toFixed(3),
            unit_price: unitPrice.toFixed(2),
          }],
        }),
      });
      await reloadOrders();
      setShowForm(false);
      setNotice("Purchase order created as a draft.");
      setForm((current) => ({
        ...current,
        quantity: "1",
        unitPrice: "",
        orderDate: new Date().toISOString().slice(0, 10),
        expectedDate: "",
      }));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to create purchase order.");
    }
  }

  async function reloadOrders() {
    if (!restaurantId) return;
    const data = await apiRequest<PurchaseOrder[]>(
      `/purchase-orders/?restaurant_id=${encodeURIComponent(restaurantId)}`,
    );
    setOrders(data);
  }

  async function updateStatus(id: number, status: OrderStatus) {
    try {
      await apiRequest<PurchaseOrder>(`/purchase-orders/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await reloadOrders();
      setNotice(`Purchase order status changed to ${statusLabel(status)}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to update purchase order.");
    }
  }

  async function receiveLine(line: PurchaseOrderLine) {
    const remaining = Number(line.ordered_quantity) - Number(line.received_quantity);
    if (remaining <= 0) return;
    const quantity = window.prompt(`Quantity received (${line.unit}; up to ${remaining}):`, remaining.toFixed(3));
    if (quantity === null) return;
    const received = Number(quantity);
    if (!Number.isFinite(received) || received <= 0 || received > remaining) {
      setNotice("Received quantity must be greater than zero and no more than the remaining quantity.");
      return;
    }
    const reason = window.prompt("Delivery note or reason:");
    if (!reason?.trim()) {
      setNotice("A delivery reason is required.");
      return;
    }
    try {
      await apiRequest(`/purchase-orders/lines/${line.id}/receive/`, {
        method: "POST",
        body: JSON.stringify({
          quantity: received.toFixed(3),
          reason: reason.trim(),
          idempotency_key: crypto.randomUUID(),
        }),
      });
      await reloadOrders();
      setNotice("Stock receipt recorded and inventory updated.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to record delivery.");
    }
  }

  function statusLabel(status: OrderStatus) {
    return status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
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

        <div className="flex flex-wrap gap-2">
          <select
            aria-label="Select restaurant"
            value={restaurantId}
            onChange={(event) => setRestaurantId(event.target.value)}
            className={inputClass}
            disabled={restaurants.length === 0}
          >
            {restaurants.length === 0 && <option value="">No assigned restaurant</option>}
            {restaurants.map((restaurant) => (
              <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              setNotice("");
              setShowForm((value) => !value);
            }}
            disabled={!restaurantId}
            className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {showForm ? "Close form" : "+ Create purchase order"}
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
                <option value="">Select a supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Ingredient / item">
              <select
                required
                value={form.ingredient}
                onChange={(event) =>
                  setForm({ ...form, ingredient: event.target.value })
                }
                className={inputClass}
              >
                <option value="">Select an ingredient</option>
                {ingredients.map((ingredient) => (
                  <option key={ingredient.id} value={ingredient.id}>
                    {ingredient.name} ({ingredient.unit})
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Quantity">
              <input
                required
                type="number"
                min="0.001"
                step="0.001"
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
                step="0.01"
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
                    {order.order_number.slice(0, 8).toUpperCase()}
                  </td>

                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-800">
                      {order.supplier_name}
                    </p>
                    {order.lines.map((line) => (
                      <div key={line.id} className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                        <span>
                          {line.ingredient_name}: {line.received_quantity}/{line.ordered_quantity} {line.unit}
                        </span>
                        {["APPROVED", "PARTIALLY_RECEIVED"].includes(order.status) &&
                          Number(line.received_quantity) < Number(line.ordered_quantity) && (
                            <button
                              type="button"
                              onClick={() => receiveLine(line)}
                              className="rounded border border-emerald-200 px-2 py-1 font-semibold text-emerald-700 hover:bg-emerald-50"
                            >
                              Receive
                            </button>
                          )}
                      </div>
                    ))}
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    {order.order_date}
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    {order.expected_date || "—"}
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    {order.lines.reduce((sum, line) => sum + Number(line.ordered_quantity), 0).toFixed(3)}
                  </td>

                  <td className="px-5 py-4 font-semibold text-slate-900">
                    {formatMoney(Number(order.total_amount))}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[order.status]}`}
                    >
                      {statusLabel(order.status)}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <select
                      aria-label={`Update status for ${order.order_number}`}
                      value={order.status}
                      onChange={(event) =>
                        updateStatus(
                          order.id,
                          event.target.value as OrderStatus
                        )
                      }
                      className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs outline-none focus:border-violet-400"
                    >
                      {statusOptions
                        .filter((status) =>
                          status === order.status ||
                          (order.status === "DRAFT" && ["PENDING", "CANCELLED"].includes(status)) ||
                          (order.status === "PENDING" && ["APPROVED", "CANCELLED"].includes(status)) ||
                          (order.status === "APPROVED" && status === "CANCELLED")
                        )
                        .map((status) => (
                        <option key={status} value={status}>
                          {statusLabel(status)}
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
        {loading
          ? "Loading purchase orders…"
          : "Receipts update ingredient stock and create auditable stock movements."}
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
