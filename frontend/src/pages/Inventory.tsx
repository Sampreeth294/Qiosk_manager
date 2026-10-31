
import { useMemo, useState } from "react";

type InventoryItem = {
  id: number;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  minimumStock: number;
  costPerUnit: number;
};

const initialItems: InventoryItem[] = [
  { id: 1, name: "Basmati Rice", category: "Grains", quantity: 25, unit: "kg", minimumStock: 10, costPerUnit: 90 },
  { id: 2, name: "Paneer", category: "Dairy", quantity: 4, unit: "kg", minimumStock: 8, costPerUnit: 320 },
  { id: 3, name: "Cooking Oil", category: "Oils", quantity: 12, unit: "L", minimumStock: 5, costPerUnit: 150 },
  { id: 4, name: "Tomatoes", category: "Vegetables", quantity: 3, unit: "kg", minimumStock: 6, costPerUnit: 40 },
  { id: 5, name: "Wheat Flour", category: "Grains", quantity: 18, unit: "kg", minimumStock: 7, costPerUnit: 45 },
  { id: 6, name: "Milk", category: "Dairy", quantity: 2, unit: "L", minimumStock: 5, costPerUnit: 60 },
  { id: 7, name: "Onions", category: "Vegetables", quantity: 14, unit: "kg", minimumStock: 5, costPerUnit: 35 },
];

type InventoryForm = {
  name: string;
  category: string;
  quantity: string;
  unit: string;
  minimumStock: string;
  costPerUnit: string;
};

const emptyForm: InventoryForm = {
  name: "",
  category: "Vegetables",
  quantity: "",
  unit: "kg",
  minimumStock: "",
  costPerUnit: "",
};

function Inventory() {
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [stockFilter, setStockFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<InventoryForm>(emptyForm);
  const [error, setError] = useState("");

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(items.map((item) => item.category)))],
    [items],
  );

  const lowStockCount = items.filter(
    (item) => item.quantity <= item.minimumStock,
  ).length;

  const totalStockValue = items.reduce(
    (total, item) => total + item.quantity * item.costPerUnit,
    0,
  );

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = item.name
        .toLowerCase()
        .includes(search.trim().toLowerCase());

      const matchesCategory =
        categoryFilter === "All" || item.category === categoryFilter;

      const isLowStock = item.quantity <= item.minimumStock;

      const matchesStock =
        stockFilter === "All" ||
        (stockFilter === "Low stock" && isLowStock) ||
        (stockFilter === "In stock" && !isLowStock);

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [items, search, categoryFilter, stockFilter]);

  function addItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const quantity = Number(form.quantity);
    const minimumStock = Number(form.minimumStock);
    const costPerUnit = Number(form.costPerUnit);

    if (
      !form.name.trim() ||
      !form.unit.trim() ||
      form.quantity.trim() === "" ||
      form.minimumStock.trim() === "" ||
      form.costPerUnit.trim() === "" ||
      !Number.isFinite(quantity) ||
      !Number.isFinite(minimumStock) ||
      !Number.isFinite(costPerUnit) ||
      quantity < 0 ||
      minimumStock < 0 ||
      costPerUnit < 0
    ) {
      setError("Enter valid item details and non-negative numeric values.");
      return;
    }

    setItems((current) => [
      ...current,
      {
        id: Date.now(),
        name: form.name.trim(),
        category: form.category,
        quantity,
        unit: form.unit.trim(),
        minimumStock,
        costPerUnit,
      },
    ]);

    setForm(emptyForm);
    setShowForm(false);
  }

  function changeQuantity(id: number, amount: number) {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(0, item.quantity + amount) }
          : item,
      ),
    );
  }

  function stockLabel(item: InventoryItem) {
    if (item.quantity === 0) return "Out of stock";
    if (item.quantity <= item.minimumStock) return "Low stock";
    return "In stock";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            Inventory overview
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Monitor ingredients and update stock levels.
          </p>
        </div>

        <button
          onClick={() => {
            setError("");
            setShowForm(true);
          }}
          className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-700"
        >
          + Add inventory item
        </button>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-900">
          Demo inventory data
        </p>
        <p className="mt-1 text-sm text-amber-800">
          Items and stock updates are stored in temporary page state only.
          They are not saved to the backend.
        </p>
      </div>

      {/* Summary cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Inventory items",
            value: items.length,
            icon: "▣",
            style: "bg-violet-50 text-violet-700",
          },
          {
            label: "Low stock alerts",
            value: lowStockCount,
            icon: "!",
            style: "bg-amber-50 text-amber-700",
          },
          {
            label: "Out of stock",
            value: items.filter((item) => item.quantity === 0).length,
            icon: "×",
            style: "bg-rose-50 text-rose-700",
          },
          {
            label: "Estimated stock value",
            value: `₹${totalStockValue.toLocaleString("en-IN", {
              maximumFractionDigits: 2,
            })}`,
            icon: "₹",
            style: "bg-emerald-50 text-emerald-700",
          },
        ].map((stat) => (
          <article
            key={stat.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-slate-500">{stat.label}</p>
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold ${stat.style}`}
              >
                {stat.icon}
              </span>
            </div>
            <p className="mt-4 break-words text-2xl font-bold text-slate-900">
              {stat.value}
            </p>
          </article>
        ))}
      </section>

      {/* Low stock alerts */}
      {lowStockCount > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 font-bold text-amber-700">
              !
            </span>
            <div>
              <h3 className="font-bold text-slate-900">
                Stock needs attention
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {lowStockCount} item(s) are at or below their minimum stock level.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {items
                  .filter((item) => item.quantity <= item.minimumStock)
                  .map((item) => (
                    <span
                      key={item.id}
                      className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800"
                    >
                      {item.name}: {item.quantity} {item.unit}
                    </span>
                  ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Inventory table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="font-bold text-slate-900">Stock items</h3>
            <p className="mt-1 text-sm text-slate-500">
              Search, filter, and adjust stock quantities.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search item..."
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400"
            />

            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category === "All" ? "All categories" : category}
                </option>
              ))}
            </select>

            <select
              value={stockFilter}
              onChange={(event) => setStockFilter(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400"
            >
              <option value="All">All stock levels</option>
              <option value="Low stock">Low stock</option>
              <option value="In stock">In stock</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Item</th>
                <th className="px-5 py-4">Category</th>
                <th className="px-5 py-4">Quantity</th>
                <th className="px-5 py-4">Minimum stock</th>
                <th className="px-5 py-4">Unit cost</th>
                <th className="px-5 py-4">Stock value</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Adjust</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => {
                const label = stockLabel(item);
                const statusClass =
                  label === "Out of stock"
                    ? "bg-rose-50 text-rose-700"
                    : label === "Low stock"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-emerald-50 text-emerald-700";

                return (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-semibold text-slate-900">
                      {item.name}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {item.category}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-800">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {item.minimumStock} {item.unit}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                      ₹{item.costPerUnit.toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-800">
                      ₹{(item.quantity * item.costPerUnit).toLocaleString("en-IN", {
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${statusClass}`}
                      >
                        {label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          aria-label={`Decrease ${item.name} stock`}
                          onClick={() => changeQuantity(item.id, -1)}
                          disabled={item.quantity === 0}
                          className="h-8 w-8 rounded-lg border border-slate-200 font-bold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          −
                        </button>
                        <button
                          aria-label={`Increase ${item.name} stock`}
                          onClick={() => changeQuantity(item.id, 1)}
                          className="h-8 w-8 rounded-lg border border-slate-200 font-bold text-violet-700 hover:bg-violet-50"
                        >
                          +
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center">
                    <p className="font-semibold text-slate-700">
                      No inventory items found
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Change the filters or add a new item.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-200 px-5 py-4 text-xs text-slate-500">
          Showing {filteredItems.length} of {items.length} items
        </div>
      </section>

      {/* Add inventory modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          onClick={() => setShowForm(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="inventory-form-title"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3
                  id="inventory-form-title"
                  className="text-xl font-bold text-slate-900"
                >
                  Add inventory item
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Enter the ingredient and stock details.
                </p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                aria-label="Close form"
                className="rounded-lg px-3 py-2 text-lg text-slate-400 hover:bg-slate-100"
              >
                ×
              </button>
            </div>

            <form onSubmit={addItem} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Item name
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder="e.g. Potatoes"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(event) =>
                      setForm({ ...form, category: event.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-violet-400"
                  >
                    {["Vegetables", "Grains", "Dairy", "Oils", "Spices", "Other"].map(
                      (category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Unit
                  </label>
                  <select
                    value={form.unit}
                    onChange={(event) =>
                      setForm({ ...form, unit: event.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-violet-400"
                  >
                    {["kg", "g", "L", "ml", "pcs", "pack"].map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Current quantity
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="any"
                    value={form.quantity}
                    onChange={(event) =>
                      setForm({ ...form, quantity: event.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-violet-400"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Minimum stock
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="any"
                    value={form.minimumStock}
                    onChange={(event) =>
                      setForm({ ...form, minimumStock: event.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-violet-400"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Cost per unit (₹)
                </label>
                <input
                  required
                  type="number"
                  min="0"
                  step="any"
                  value={form.costPerUnit}
                  onChange={(event) =>
                    setForm({ ...form, costPerUnit: event.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-400"
                />
              </div>

              {error && (
                <p role="alert" className="text-sm text-rose-600">
                  {error}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-700"
                >
                  Add item
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default Inventory;
