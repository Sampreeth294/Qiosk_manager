
import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { apiRequest } from "../api/apiClient";
import { chooseRestaurantId, storeSelectedRestaurantId } from "../api/restaurantSelection";

type InventoryItem = {
  id: number;
  restaurant: number;
  name: string;
  category: string;
  unit: string;
  current_quantity: string;
  minimum_quantity: string;
  unit_cost: string;
  supplier: number | null;
  supplier_name: string | null;
  sku: string;
  is_active: boolean;
};

type Restaurant = { id: number; name: string; is_active: boolean };
type Supplier = { id: number; name: string };
type StockMovement = {
  id: number;
  ingredient_name: string;
  movement_type: string;
  quantity_delta: string;
  unit: string;
  reason: string;
  username: string | null;
  created_at: string;
};

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
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [restaurantId, setRestaurantId] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All categories");
  const [stockFilter, setStockFilter] = useState("All stock");
  const [showAddForm, setShowAddForm] = useState(false);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  const [newItem, setNewItem] = useState({
    name: "",
    category: "Grains",
    unit: "kg",
    opening_quantity: "",
    minimum_quantity: "",
    unit_cost: "",
    supplier: "",
  });

  useEffect(() => {
    apiRequest<Restaurant[]>("/restaurants/?include_inactive=true")
      .then((data) => {
        const activeRestaurants = data.filter((restaurant) => restaurant.is_active);
        setRestaurants(activeRestaurants);
        const selected = chooseRestaurantId(activeRestaurants);
        if (selected) setRestaurantId(String(selected));
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
      const query = `?restaurant_id=${encodeURIComponent(restaurantId)}&include_inactive=true`;
      Promise.all([
        apiRequest<InventoryItem[]>(`/inventory/ingredients/${query}`),
        apiRequest<Supplier[]>(`/suppliers/${query}`),
        apiRequest<StockMovement[]>(`/inventory/movements/?restaurant_id=${encodeURIComponent(restaurantId)}`),
      ])
        .then(([ingredients, supplierData, movementData]) => {
          if (cancelled) return;
          setItems(ingredients);
          setSuppliers(supplierData);
          setMovements(movementData.slice(0, 8));
        })
        .catch((error: unknown) => {
          if (cancelled) return;
          setNotice(error instanceof Error ? error.message : "Unable to load inventory.");
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

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = `${item.name} ${item.supplier_name ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesCategory =
        category === "All categories" || item.category === category;

      const stock = Number(item.current_quantity);
      const minimum = Number(item.minimum_quantity);
      const matchesStock =
        stockFilter === "All stock" ||
        (stockFilter === "Low stock"
          ? stock <= minimum
          : stock > minimum);

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [items, search, category, stockFilter]);

  const lowStockCount = items.filter(
    (item) => Number(item.current_quantity) <= Number(item.minimum_quantity)
  ).length;

  const inventoryValue = items.reduce(
    (total, item) =>
      total + Number(item.current_quantity) * Number(item.unit_cost),
    0
  );

  function showNotice(message: string) {
    setNotice(message);
  }

  async function reloadInventory() {
    if (!restaurantId) return;
    const query = `?restaurant_id=${encodeURIComponent(restaurantId)}&include_inactive=true`;
    const [ingredients, movementData] = await Promise.all([
      apiRequest<InventoryItem[]>(`/inventory/ingredients/${query}`),
      apiRequest<StockMovement[]>(`/inventory/movements/?restaurant_id=${encodeURIComponent(restaurantId)}`),
    ]);
    setItems(ingredients);
    setMovements(movementData.slice(0, 8));
  }

  async function updateStock(id: number, amount: number) {
    const quantity = window.prompt("Quantity to record:", "1.000");
    if (quantity === null) return;
    const parsedQuantity = Number(quantity);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      showNotice("Enter a quantity greater than zero.");
      return;
    }
    const reason = window.prompt(
      amount > 0 ? "Reason for receiving stock:" : "Reason for recording wastage:",
    );
    if (!reason?.trim()) {
      showNotice("A reason is required to record stock movement.");
      return;
    }
    try {
      await apiRequest(`/inventory/ingredients/${id}/${amount > 0 ? "receive" : "wastage"}/`, {
        method: "POST",
        body: JSON.stringify({
          quantity: parsedQuantity.toFixed(3),
          reason: reason.trim(),
          idempotency_key: crypto.randomUUID(),
        }),
      });
      await reloadInventory();
      showNotice(amount > 0 ? "Stock receipt recorded." : "Wastage recorded.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Unable to update stock.");
    }
  }

  async function toggleIngredient(item: InventoryItem) {
    try {
      await apiRequest(`/inventory/ingredients/${item.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !item.is_active }),
      });
      await reloadInventory();
      showNotice(item.is_active ? "Ingredient deactivated." : "Ingredient reactivated.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Unable to update ingredient.");
    }
  }

  async function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const openingQuantity = Number(newItem.opening_quantity || 0);
    const minimum = Number(newItem.minimum_quantity);
    const cost = Number(newItem.unit_cost);

    if (
      !newItem.name.trim() ||
      !restaurantId ||
      !Number.isFinite(openingQuantity) ||
      !Number.isFinite(minimum) ||
      !Number.isFinite(cost) ||
      openingQuantity < 0 ||
      minimum < 0 ||
      cost < 0
    ) {
      showNotice("Please enter valid inventory details.");
      return;
    }

    try {
      await apiRequest<InventoryItem>("/inventory/ingredients/", {
        method: "POST",
        body: JSON.stringify({
          restaurant: Number(restaurantId),
          name: newItem.name.trim(),
          category: newItem.category,
          unit: newItem.unit,
          opening_quantity: openingQuantity.toFixed(3),
          minimum_quantity: minimum.toFixed(3),
          unit_cost: cost.toFixed(2),
          supplier: newItem.supplier ? Number(newItem.supplier) : null,
        }),
      });
      await reloadInventory();
      setNewItem({
        name: "",
        category: "Grains",
        unit: "kg",
        opening_quantity: "",
        minimum_quantity: "",
        unit_cost: "",
        supplier: "",
      });
      setShowAddForm(false);
      showNotice("Inventory item added successfully.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Unable to add ingredient.");
    }
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

        <div className="flex flex-wrap gap-2">
          <select
            aria-label="Select restaurant"
            value={restaurantId}
            onChange={(event) => {
              const selectedId = Number(event.target.value);
              storeSelectedRestaurantId(selectedId);
              setRestaurantId(String(selectedId));
            }}
            className={inputClass}
            disabled={restaurants.length === 0}
          >
            {restaurants.length === 0 && <option value="">No assigned restaurant</option>}
            {restaurants.map((restaurant) => (
              <option key={restaurant.id} value={restaurant.id}>
                {restaurant.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowAddForm((value) => !value)}
            disabled={!restaurantId}
            className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {showAddForm ? "Cancel" : "+ Add inventory item"}
          </button>
        </div>
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
                <option value="g">Grams (g)</option>
                <option value="L">Litres (L)</option>
                <option value="ml">Millilitres (ml)</option>
                <option value="each">Each</option>
              </select>
            </FormField>

            <FormField label="Opening quantity">
              <input
                type="number"
                min="0"
                step="0.001"
                value={newItem.opening_quantity}
                onChange={(e) =>
                  setNewItem({ ...newItem, opening_quantity: e.target.value })
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
                step="0.001"
                value={newItem.minimum_quantity}
                onChange={(e) =>
                  setNewItem({ ...newItem, minimum_quantity: e.target.value })
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
                step="0.01"
                value={newItem.unit_cost}
                onChange={(e) =>
                  setNewItem({ ...newItem, unit_cost: e.target.value })
                }
                placeholder="0.00"
                className={inputClass}
              />
            </FormField>

            <FormField label="Supplier">
              <select
                value={newItem.supplier}
                onChange={(e) =>
                  setNewItem({ ...newItem, supplier: e.target.value })
                }
                className={inputClass}
              >
                <option value="">No supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
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
                const stock = Number(item.current_quantity);
                const minimum = Number(item.minimum_quantity);
                const cost = Number(item.unit_cost);
                const isLow = stock <= minimum;

                const progress =
                  minimum > 0
                    ? Math.min(100, (stock / (minimum * 2)) * 100)
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
                        {item.sku || `ING-${String(item.id).padStart(4, "0")}`}
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
                          {stock.toFixed(3)} {item.unit}
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
                        Minimum: {minimum.toFixed(3)} {item.unit}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {money(cost)}
                    </td>

                    <td className="px-5 py-4 font-medium text-slate-800">
                      {money(stock * cost)}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {item.supplier_name || "—"}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        {item.is_active ? (
                          <>
                            <button
                              type="button"
                              aria-label={`Record wastage for ${item.name}`}
                              onClick={() => updateStock(item.id, -1)}
                              disabled={stock <= 0}
                              className="h-8 w-8 rounded-lg border border-slate-200 font-bold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              −
                            </button>
                            <button
                              type="button"
                              aria-label={`Receive stock for ${item.name}`}
                              onClick={() => updateStock(item.id, 1)}
                              className="h-8 w-8 rounded-lg border border-violet-200 bg-violet-50 font-bold text-violet-700 hover:bg-violet-100"
                            >
                              +
                            </button>
                          </>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => toggleIngredient(item)}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                        >
                          {item.is_active ? "Deactivate" : "Reactivate"}
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
            Stock changes are saved with an audit trail.
          </span>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4">
          <h3 className="font-bold text-slate-900">Recent stock movements</h3>
          <p className="mt-1 text-sm text-slate-500">Latest receipts, adjustments, and wastage.</p>
        </div>
        <div className="divide-y divide-slate-100">
          {movements.map((movement) => (
            <div key={movement.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
              <div>
                <span className="font-medium text-slate-800">{movement.ingredient_name}</span>
                <span className="ml-2 text-slate-500">{movement.reason}</span>
              </div>
              <div className="text-right">
                <span className={Number(movement.quantity_delta) > 0 ? "font-semibold text-emerald-700" : "font-semibold text-rose-700"}>
                  {Number(movement.quantity_delta) > 0 ? "+" : ""}
                  {movement.quantity_delta} {movement.unit}
                </span>
                <div className="text-xs text-slate-500">
                  {new Date(movement.created_at).toLocaleString()} · {movement.username || "System"}
                </div>
              </div>
            </div>
          ))}
          {!loading && movements.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-slate-500">No stock movements recorded.</p>
          )}
          {loading && <p className="px-5 py-8 text-center text-sm text-slate-500">Loading inventory…</p>}
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
