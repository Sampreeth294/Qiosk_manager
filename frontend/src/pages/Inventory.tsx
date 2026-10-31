
import { useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";

type InventoryItem = {
  id: number;
  name: string;
  category: string;
  unit: string;
  stock: number;
  minimum: number;
  cost: number;
  supplier: string;
};

const initialItems: InventoryItem[] = [
  { id: 1, name: "Basmati Rice", category: "Grains", unit: "kg", stock: 28, minimum: 10, cost: 85, supplier: "Fresh Farm Supplies" },
  { id: 2, name: "Cooking Oil", category: "Essentials", unit: "L", stock: 7, minimum: 12, cost: 145, supplier: "Daily Needs Co." },
  { id: 3, name: "Tomatoes", category: "Vegetables", unit: "kg", stock: 5, minimum: 8, cost: 32, supplier: "Green Basket" },
  { id: 4, name: "Paneer", category: "Dairy", unit: "kg", stock: 9, minimum: 4, cost: 320, supplier: "Fresh Farm Supplies" },
  { id: 5, name: "Wheat Flour", category: "Grains", unit: "kg", stock: 22, minimum: 10, cost: 42, supplier: "Daily Needs Co." },
  { id: 6, name: "Onions", category: "Vegetables", unit: "kg", stock: 3, minimum: 8, cost: 38, supplier: "Green Basket" },
  { id: 7, name: "Milk", category: "Dairy", unit: "L", stock: 16, minimum: 6, cost: 58, supplier: "Morning Dairy" },
  { id: 8, name: "Chilli Powder", category: "Spices", unit: "kg", stock: 4, minimum: 3, cost: 210, supplier: "Spice Route" },
];

const categories = [
  "All categories",
  "Grains",
  "Vegetables",
  "Dairy",
  "Essentials",
  "Spices",
];

const money = (amount: number) =>
  `₹${amount.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

const inputClass =
  "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100";

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>(initialItems);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All categories");
  const [stockFilter, setStockFilter] = useState("All stock");
  const [showAddForm, setShowAddForm] = useState(false);
  const [notice, setNotice] = useState("");

  const [newItem, setNewItem] = useState({
    name: "",
    category: "Grains",
    unit: "kg",
    stock: "",
    minimum: "",
    cost: "",
    supplier: "",
  });

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = `${item.name} ${item.supplier}`
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesCategory =
        category === "All categories" || item.category === category;

      const matchesStock =
        stockFilter === "All stock" ||
        (stockFilter === "Low stock"
          ? item.stock <= item.minimum
          : item.stock > item.minimum);

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [items, search, category, stockFilter]);

  const lowStockCount = items.filter(
    (item) => item.stock <= item.minimum
  ).length;

  const inventoryValue = items.reduce(
    (total, item) => total + item.stock * item.cost,
    0
  );

  function showNotice(message: string) {
    setNotice(message);
  }

  function updateStock(id: number, amount: number) {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              stock: Math.max(0, item.stock + amount),
            }
          : item
      )
    );

    showNotice(
      amount > 0
        ? "Stock quantity increased."
        : "Stock quantity decreased."
    );
  }

  function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const stock = Number(newItem.stock);
    const minimum = Number(newItem.minimum);
    const cost = Number(newItem.cost);

    if (
      !newItem.name.trim() ||
      !newItem.supplier.trim() ||
      !Number.isFinite(stock) ||
      !Number.isFinite(minimum) ||
      !Number.isFinite(cost) ||
      stock < 0 ||
      minimum < 0 ||
      cost < 0
    ) {
      showNotice("Please enter valid inventory details.");
      return;
    }

    const item: InventoryItem = {
      id: Math.max(0, ...items.map((existing) => existing.id)) + 1,
      name: newItem.name.trim(),
      category: newItem.category,
      unit: newItem.unit,
      stock,
      minimum,
      cost,
      supplier: newItem.supplier.trim(),
    };

    setItems((current) => [...current, item]);

    setNewItem({
      name: "",
      category: "Grains",
      unit: "kg",
      stock: "",
      minimum: "",
      cost: "",
      supplier: "",
    });

    setShowAddForm(false);
    showNotice("Inventory item added successfully.");
  }

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-slate-500">
            Management / Inventory
          </p>

          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Inventory Management
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Track ingredients, monitor stock levels, and manage suppliers.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm((value) => !value)}
          className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
        >
          {showAddForm ? "Cancel" : "+ Add inventory item"}
        </button>
      </div>

      {/* Notification */}
      {notice && (
        <div
          role="status"
          className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
        >
          <span>{notice}</span>

          <button
            onClick={() => setNotice("")}
            className="ml-4 font-bold"
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total inventory items"
          value={String(items.length)}
          helper="Tracked ingredients"
          symbol="▦"
        />

        <SummaryCard
          label="Low-stock items"
          value={String(lowStockCount)}
          helper="At or below minimum level"
          symbol="⚠"
          alert={lowStockCount > 0}
        />

        <SummaryCard
          label="Estimated stock value"
          value={money(inventoryValue)}
          helper="Based on current quantity"
          symbol="₹"
        />

        <SummaryCard
          label="Categories"
          value={String(new Set(items.map((item) => item.category)).size)}
          helper="Ingredient groups"
          symbol="◫"
        />
      </div>

      {/* Add inventory form */}
      {showAddForm && (
        <form
          onSubmit={addItem}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="mb-5">
            <h3 className="font-bold text-slate-900">
              Add inventory item
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Enter the ingredient and stock information below.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FormField label="Item name">
              <input
                required
                value={newItem.name}
                onChange={(e) =>
                  setNewItem({ ...newItem, name: e.target.value })
                }
                placeholder="e.g. Potatoes"
                className={inputClass}
              />
            </FormField>

            <FormField label="Category">
              <select
                value={newItem.category}
                onChange={(e) =>
                  setNewItem({ ...newItem, category: e.target.value })
                }
                className={inputClass}
              >
                {categories.slice(1).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Unit">
              <select
                value={newItem.unit}
                onChange={(e) =>
                  setNewItem({ ...newItem, unit: e.target.value })
                }
                className={inputClass}
              >
                <option value="kg">Kilograms (kg)</option>
                <option value="L">Litres (L)</option>
                <option value="pcs">Pieces</option>
                <option value="pack">Packs</option>
              </select>
            </FormField>

            <FormField label="Current quantity">
              <input
                required
                type="number"
                min="0"
                step="any"
                value={newItem.stock}
                onChange={(e) =>
                  setNewItem({ ...newItem, stock: e.target.value })
                }
                placeholder="0"
                className={inputClass}
              />
            </FormField>

            <FormField label="Minimum quantity">
              <input
                required
                type="number"
                min="0"
                step="any"
                value={newItem.minimum}
                onChange={(e) =>
                  setNewItem({ ...newItem, minimum: e.target.value })
                }
                placeholder="0"
                className={inputClass}
              />
            </FormField>

            <FormField label="Cost per unit (₹)">
              <input
                required
                type="number"
                min="0"
                step="any"
                value={newItem.cost}
                onChange={(e) =>
                  setNewItem({ ...newItem, cost: e.target.value })
                }
                placeholder="0.00"
                className={inputClass}
              />
            </FormField>

            <FormField label="Supplier">
              <input
                required
                value={newItem.supplier}
                onChange={(e) =>
                  setNewItem({ ...newItem, supplier: e.target.value })
                }
                placeholder="Supplier name"
                className={inputClass}
              />
            </FormField>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Save item
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Inventory table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="font-bold text-slate-900">Stock overview</h3>

            <p className="mt-1 text-sm text-slate-500">
              {filteredItems.length} of {items.length} items
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search item or supplier..."
              className={`${inputClass} sm:w-60`}
            />

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputClass}
            >
              {categories.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className={inputClass}
            >
              <option value="All stock">All stock</option>
              <option value="Low stock">Low stock</option>
              <option value="Healthy stock">Healthy stock</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Ingredient</th>
                <th className="px-5 py-3 font-semibold">Category</th>
                <th className="px-5 py-3 font-semibold">Stock level</th>
                <th className="px-5 py-3 font-semibold">Unit cost</th>
                <th className="px-5 py-3 font-semibold">Stock value</th>
                <th className="px-5 py-3 font-semibold">Supplier</th>
                <th className="px-5 py-3 text-right font-semibold">
                  Quick update
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => {
                const isLow = item.stock <= item.minimum;

                const progress =
                  item.minimum > 0
                    ? Math.min(100, (item.stock / (item.minimum * 2)) * 100)
                    : 100;

                return (
                  <tr
                    key={item.id}
                    className="transition hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">
                        {item.name}
                      </div>

                      <div className="mt-0.5 text-xs text-slate-500">
                        SKU-{String(item.id).padStart(4, "0")}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        {item.category}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-semibold ${
                            isLow ? "text-rose-600" : "text-slate-800"
                          }`}
                        >
                          {item.stock} {item.unit}
                        </span>

                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            isLow
                              ? "bg-rose-50 text-rose-700"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {isLow ? "Low stock" : "In stock"}
                        </span>
                      </div>

                      <div className="mt-2 h-1.5 w-28 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${
                            isLow ? "bg-rose-500" : "bg-emerald-500"
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>

                      <div className="mt-1 text-xs text-slate-400">
                        Minimum: {item.minimum} {item.unit}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {money(item.cost)}
                    </td>

                    <td className="px-5 py-4 font-medium text-slate-800">
                      {money(item.stock * item.cost)}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {item.supplier}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          aria-label={`Deduct one ${item.name}`}
                          onClick={() => updateStock(item.id, -1)}
                          disabled={item.stock <= 0}
                          className="h-8 w-8 rounded-lg border border-slate-200 font-bold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          −
                        </button>

                        <button
                          type="button"
                          aria-label={`Add one ${item.name}`}
                          onClick={() => updateStock(item.id, 1)}
                          className="h-8 w-8 rounded-lg border border-violet-200 bg-violet-50 font-bold text-violet-700 hover:bg-violet-100"
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
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <div className="font-semibold text-slate-700">
                      No inventory items found
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      Try another search or change your filters.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-100 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Stock status is based on each item's minimum quantity.
          </span>

          <span>
            Demo only: changes are not saved to the database.
          </span>
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
  alert = false,
}: {
  label: string;
  value: string;
  helper: string;
  symbol: string;
  alert?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>

        <span
          className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold ${
            alert
              ? "bg-rose-50 text-rose-600"
              : "bg-violet-50 text-violet-700"
          }`}
        >
          {symbol}
        </span>
      </div>

      <div className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
        {value}
      </div>

      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
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
