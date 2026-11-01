import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiRequest } from "../api/apiClient";
import { chooseRestaurantId, storeSelectedRestaurantId } from "../api/restaurantSelection";

type Restaurant = {
  id: number;
  name: string;
  is_active: boolean;
};

type MenuCategory = {
  id: number;
  name: string;
  restaurant: number;
  is_active: boolean;
};

type MenuItem = {
  id: number;
  name: string;
  description?: string;
  category: number;
  price: string | number;
  image_url?: string | null;
  is_active: boolean;
};

type Product = {
  id: number;
  name: string;
  categoryId: number;
  category: string;
  restaurantId: number;
  price: number;
  imageUrl: string | null;
};

type CartItem = {
  product: Product;
  quantity: number;
};

type OrderType = "Dine-in" | "Takeaway";

type CreatedOrderItem = {
  id: number;
  menu_item: number;
  item_name: string;
  unit_price: string | number;
  quantity: number;
  subtotal: string | number;
};

type CreatedOrder = {
  id: number;
  order_number: string;
  display_order_number: string | null;
  restaurant: number;
  restaurant_name: string;
  order_type: string;
  table_number: string;
  status: string;
  payment_status: string;
  total_amount: string | number;
  items: CreatedOrderItem[];
  created_at: string;
};

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);

export default function POS() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  const [restaurantId, setRestaurantId] = useState("");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("All");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>("Dine-in");
  const [tableNumber, setTableNumber] = useState("1");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [receipt, setReceipt] = useState<CreatedOrder | null>(null);

  // Recent orders state
  const [recentOrders, setRecentOrders] = useState<CreatedOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");

  // Load the 10 most recent orders from the backend.
  const loadRecentOrders = useCallback(async () => {
    setOrdersLoading(true);
    setOrdersError("");

    try {
      const data = await apiRequest<CreatedOrder[]>("/orders/");

      setRecentOrders(
        [...data]
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          )
          .slice(0, 10),
      );
    } catch (err) {
      setOrdersError(
        err instanceof Error
          ? err.message
          : "Unable to load recent orders.",
      );
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  // Load recent orders when the POS page opens.
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadRecentOrders();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadRecentOrders]);

  // Load restaurants, categories and menu items from Django.
  useEffect(() => {
    let cancelled = false;

    async function loadInitialData() {
      try {
        const [restaurantData, categoryData, menuData] = await Promise.all([
          apiRequest<Restaurant[]>("/restaurants/"),
          apiRequest<MenuCategory[]>("/categories/"),
          apiRequest<MenuItem[]>("/menu-items/"),
        ]);

        if (cancelled) return;

        setRestaurants(restaurantData);
        setCategories(categoryData);
        setMenuItems(menuData);

        const selected = chooseRestaurantId(restaurantData);
        if (selected) setRestaurantId(String(selected));
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load the restaurant menu.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInitialData();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedRestaurantId = Number(restaurantId);

  const restaurantCategories = useMemo(() => {
    return categories.filter(
      (category) => category.restaurant === selectedRestaurantId,
    );
  }, [categories, selectedRestaurantId]);

  const products = useMemo<Product[]>(() => {
    const categoryMap = new Map(
      categories.map((category) => [category.id, category]),
    );

    return menuItems
      .map((item) => {
        const category = categoryMap.get(item.category);

        if (!category) return null;

        return {
          id: item.id,
          name: item.name,
          categoryId: category.id,
          category: category.name,
          restaurantId: category.restaurant,
          price: Number(item.price),
          imageUrl: item.image_url ?? null,
        };
      })
      .filter((product): product is Product => product !== null)
      .filter(
        (product) => product.restaurantId === selectedRestaurantId,
      );
  }, [categories, menuItems, selectedRestaurantId]);

  const categoryOptions = useMemo(() => {
    return [
      "All",
      ...restaurantCategories.map((category) => String(category.id)),
    ];
  }, [restaurantCategories]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory =
        categoryId === "All" ||
        String(product.categoryId) === categoryId;

      const matchesSearch = product.name.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [products, search, categoryId]);

  const itemCount = cart.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  const subtotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );

  // Tax and discounts are not yet implemented in the backend.
  const total = subtotal;

  function addItem(product: Product) {
    setCart((previous) => {
      const existing = previous.find(
        (item) => item.product.id === product.id,
      );

      if (existing) {
        // Limit each menu item's quantity to 99.
        if (existing.quantity >= 99) {
          return previous;
        }

        return previous.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [...previous, { product, quantity: 1 }];
    });

    setMessage("");
    setError("");
    setReceipt(null);
  }

  function changeQuantity(productId: number, change: number) {
    setCart((previous) =>
      previous
        .map((item) =>
          item.product.id === productId
            ? {
                ...item,
                quantity: Math.min(99, item.quantity + change),
              }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );

    setMessage("");
    setError("");
    setReceipt(null);
  }

  function changeRestaurant(value: string) {
    storeSelectedRestaurantId(Number(value));
    setRestaurantId(value);
    setCategoryId("All");
    setCart([]);
    setReceipt(null);
    setMessage("");
    setError("");
  }

  async function checkout() {
    if (saving) return;

    if (!restaurantId || restaurants.length === 0) {
      setError("Please select an active restaurant.");
      return;
    }

    if (cart.length === 0) {
      setError("Add at least one menu item before creating an order.");
      return;
    }

    if (orderType === "Dine-in" && !tableNumber.trim()) {
      setError("Please select a table number.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    setReceipt(null);

    try {
      const payload = {
        restaurant: selectedRestaurantId,
        order_type:
          orderType === "Dine-in" ? "DINE_IN" : "TAKEAWAY",
        table_number:
          orderType === "Dine-in" ? tableNumber : "",
        items: cart.map((item) => ({
          menu_item: item.product.id,
          quantity: item.quantity,
        })),
      };

      const order = await apiRequest<CreatedOrder>("/orders/create/", {
        method: "POST",
        body: JSON.stringify(payload),
      });


      setReceipt(order);
      setMessage("Order successfully saved to the database.");
      setCart([]);
      setSearch("");
      setCategoryId("All");

      // Refresh the recent orders after successful checkout.
      await loadRecentOrders();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create the order.",
      );
    } finally {
      setSaving(false);
    }
  }

  function printReceipt() {
    if (!receipt) return;

    const receiptWindow = window.open(
      "",
      "_blank",
      "width=420,height=700",
    );

    if (!receiptWindow) {
      setError("Allow pop-ups in your browser to print the receipt.");
      return;
    }

    const safe = (value: string) =>
      value.replace(/[&<>"']/g, (character) => {
        const entities: Record<string, string> = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        };

        return entities[character];
      });

    const rows = receipt.items
      .map(
        (item) =>
          `<li>${safe(item.item_name)} × ${item.quantity} — ${money(Number(item.subtotal))}</li>`,
      )
      .join("");

    receiptWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Order ${safe(receipt.order_number)}</title>
          <meta charset="utf-8" />
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 24px;
              color: #111827;
            }
            h1, p { text-align: center; }
            .muted { color: #6b7280; font-size: 12px; }
            .total { font-size: 18px; font-weight: bold; }
            ul { padding-left: 20px; }
            li { margin: 8px 0; }
          </style>
        </head>
        <body>
          <h1>Qiosk Manager</h1>
          <p class="muted">Order receipt</p>
          <p>Order: ${safe(receipt.display_order_number ?? receipt.order_number)}</p>
          <p>Restaurant: ${safe(receipt.restaurant_name)}</p>
          <p>Type: ${safe(receipt.order_type)}</p>
          ${
            receipt.order_type === "DINE_IN"
              ? `<p>Table: ${safe(receipt.table_number)}</p>`
              : ""
          }
          <ul>${rows}</ul>
          <p>Status: ${safe(receipt.status)}</p>
          <p class="total">Total: ${money(Number(receipt.total_amount))}</p>
          <p class="muted">Payment is not processed by this POS.</p>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `);

    receiptWindow.document.close();
  }

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-indigo-600">
            RESTAURANT OPERATIONS
          </p>

          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            Point of Sale
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Create restaurant orders and save them to the database.
          </p>
        </div>

        <span className="w-fit rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
          Database connected through API
        </span>
      </div>

      {/* General error message */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          {error}
        </div>
      )}

      {/* Success message */}
      {message && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          {message}
        </div>
      )}

      {/* Recent orders */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Recent Orders
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Your 10 most recent orders across restaurants.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadRecentOrders()}
            disabled={ordersLoading}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {ordersLoading ? "Refreshing..." : "Refresh Orders"}
          </button>
        </div>

        {ordersError && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
          >
            {ordersError}
          </div>
        )}

        {ordersLoading && recentOrders.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            Loading recent orders...
          </p>
        ) : recentOrders.length === 0 ? (
          !ordersError && (
            <p className="mt-4 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">
              No orders found yet. Create your first order using the POS.
            </p>
          )
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-3 font-semibold">Order</th>
                  <th className="px-3 py-3 font-semibold">Restaurant</th>
                  <th className="px-3 py-3 font-semibold">Type / Table</th>
                  <th className="px-3 py-3 font-semibold">Date</th>
                  <th className="px-3 py-3 text-right font-semibold">
                    Total
                  </th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                </tr>
              </thead>

              <tbody>
                {recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-800">
                      #{order.display_order_number ?? order.order_number}
                    </td>

                    <td className="px-3 py-3 text-slate-600">
                      {order.restaurant_name}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                      {order.order_type === "DINE_IN"
                        ? "Dine-in"
                        : "Takeaway"}

                      {order.order_type === "DINE_IN" &&
                      order.table_number
                        ? ` · Table ${order.table_number}`
                        : ""}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                      {new Date(order.created_at).toLocaleString("en-IN", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 text-right font-medium text-slate-800">
                      {money(Number(order.total_amount))}
                    </td>

                    <td className="px-3 py-3">
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {order.status.replaceAll("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Successful order receipt */}
      {receipt && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="font-semibold text-emerald-800">
                Order created successfully
              </p>

              <p className="mt-1 break-all text-sm text-emerald-700">
                Order #{receipt.display_order_number ?? receipt.order_number}
              </p>

              <p className="mt-1 text-sm text-emerald-700">
                Total: {money(Number(receipt.total_amount))} · Status:{" "}
                {receipt.status}
              </p>
            </div>

            <button
              type="button"
              onClick={printReceipt}
              className="rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Print Receipt
            </button>
          </div>
        </section>
      )}

      {/* Restaurant menu and current order */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Loading restaurants and menu items...
        </div>
      ) : (
        <>
          {/* Restaurant selection */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <label
              htmlFor="restaurant"
              className="block text-sm font-medium text-slate-700"
            >
              Select Restaurant
            </label>

            <select
              id="restaurant"
              value={restaurantId}
              onChange={(event) => changeRestaurant(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm sm:max-w-md"
            >
              {restaurants.length === 0 && (
                <option value="">No active restaurants found</option>
              )}

              {restaurants.map((restaurant) => (
                <option
                  key={restaurant.id}
                  value={String(restaurant.id)}
                >
                  {restaurant.name}
                </option>
              ))}
            </select>
          </section>

          <div className="grid items-start gap-6 xl:grid-cols-3">
            {/* Menu */}
            <section className="space-y-5 xl:col-span-2">
              {/* Search and categories */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search menu items..."
                    aria-label="Search menu items"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500"
                  />

                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setCategoryId("All");
                    }}
                    className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Reset Filters
                  </button>
                </div>

                <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                  {categoryOptions.map((id) => {
                    const selectedCategory = restaurantCategories.find(
                      (category) => String(category.id) === id,
                    );

                    const label =
                      id === "All" ? "All" : selectedCategory?.name ?? id;

                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setCategoryId(id)}
                        className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${
                          categoryId === id
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Menu products */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addItem(product)}
                    className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-indigo-300 hover:shadow-md"
                  >
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-24 w-full rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-24 items-center justify-center rounded-xl bg-orange-50 text-4xl">
                        🍽️
                      </div>
                    )}

                    <p className="mt-4 text-xs font-medium text-indigo-600">
                      {product.category}
                    </p>

                    <h2 className="mt-1 font-semibold text-slate-900">
                      {product.name}
                    </h2>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900">
                        {money(product.price)}
                      </span>

                      <span className="rounded-lg bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700">
                        + Add
                      </span>
                    </div>
                  </button>
                ))}

                {filteredProducts.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500 sm:col-span-2 lg:col-span-3">
                    No menu items found for this restaurant. Check that it has
                    active categories and active menu items.
                  </div>
                )}
              </div>
            </section>

            {/* Current order / cart */}
            <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Current Order
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {itemCount} item{itemCount === 1 ? "" : "s"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCart([]);
                    setMessage("");
                    setError("");
                  }}
                  disabled={cart.length === 0 || saving}
                  className="text-sm font-medium text-rose-600 hover:text-rose-700 disabled:opacity-40"
                >
                  Clear
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="my-6 rounded-xl bg-slate-50 p-6 text-center">
                  <p className="text-3xl">🛒</p>

                  <p className="mt-3 text-sm font-medium text-slate-700">
                    No items added
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Select a menu item to begin.
                  </p>
                </div>
              ) : (
                <div className="mt-5 max-h-72 space-y-4 overflow-y-auto">
                  {cart.map(({ product, quantity }) => (
                    <div
                      key={product.id}
                      className="border-b border-slate-100 pb-4"
                    >
                      <div className="flex justify-between gap-3">
                        <p className="text-sm font-medium text-slate-800">
                          {product.name}
                        </p>

                        <p className="shrink-0 text-sm font-semibold text-slate-800">
                          {money(product.price * quantity)}
                        </p>
                      </div>

                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-xs text-slate-500">
                          {money(product.price)} each
                        </p>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            aria-label={`Decrease ${product.name}`}
                            onClick={() => changeQuantity(product.id, -1)}
                            disabled={saving}
                            className="h-8 w-8 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                          >
                            −
                          </button>

                          <span className="min-w-4 text-center text-sm font-semibold">
                            {quantity}
                          </span>

                          <button
                            type="button"
                            aria-label={`Increase ${product.name}`}
                            onClick={() => changeQuantity(product.id, 1)}
                            disabled={saving || quantity >= 99}
                            className="h-8 w-8 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Order type */}
              <div className="mt-5 space-y-4 border-t border-slate-100 pt-5">
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Order Type
                  </p>

                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {(["Dine-in", "Takeaway"] as OrderType[]).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setOrderType(type)}
                        disabled={saving}
                        className={`rounded-xl border px-3 py-2.5 text-sm font-medium ${
                          orderType === type
                            ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                            : "border-slate-200 text-slate-600"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Table number for dine-in orders */}
                {orderType === "Dine-in" && (
                  <div>
                    <label
                      htmlFor="table-number"
                      className="text-sm font-medium text-slate-700"
                    >
                      Table
                    </label>

                    <select
                      id="table-number"
                      value={tableNumber}
                      onChange={(event) =>
                        setTableNumber(event.target.value)
                      }
                      disabled={saving}
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                    >
                      {Array.from({ length: 20 }, (_, index) => (
                        <option key={index + 1} value={String(index + 1)}>
                          Table {index + 1}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                  The current backend saves the menu items, quantities, and
                  total. Discounts, tax, customer details, and payment
                  processing are not included in this order API yet.
                </div>

                {/* Order totals */}
                <div className="space-y-3 border-t border-slate-100 pt-4">
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Subtotal</span>
                    <span>{money(subtotal)}</span>
                  </div>

                  <div className="flex justify-between border-t border-slate-100 pt-4 text-lg font-bold text-slate-900">
                    <span>Total</span>
                    <span>{money(total)}</span>
                  </div>
                </div>

                {/* Checkout */}
                <button
                  type="button"
                  onClick={() => void checkout()}
                  disabled={
                    saving ||
                    cart.length === 0 ||
                    !restaurantId
                  }
                  className="w-full rounded-xl bg-indigo-600 px-4 py-4 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {saving ? "Creating Order..." : "Create Order"}
                </button>

                <p className="text-center text-xs leading-5 text-slate-500">
                  No payment is collected by this screen.
                </p>
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}