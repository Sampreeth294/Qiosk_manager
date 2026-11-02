
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api/apiClient";
import { rememberRatingOrder } from "../api/ratingOrderLookup";

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

type ApiMenuItem = {
  id: number;
  name: string;
  description: string;
  category: number;
  price: string | number;
  image_url: string | null;
  is_active: boolean;
};

type MenuItem = {
  id: number;
  name: string;
  category: string;
  categoryId: number;
  description: string;
  price: number;
  imageUrl: string | null;
};

type CreatedOrder = {
  id: number;
  order_number: string;
  display_order_number: string | null;
  restaurant: number;
  restaurant_name: string;
  order_type: "DINE_IN" | "TAKEAWAY";
  table_number: string;
  status: string;
  payment_status: string;
  total_amount: string | number;
  items: {
    id: number;
    menu_item: number;
    item_name: string;
    unit_price: string | number;
    quantity: number;
    subtotal: string | number;
  }[];
  created_at: string;
};

type PaymentMethod = "UPI" | "CARD";

type CartItem = {
  item: MenuItem;
  quantity: number;
};

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(price);

export default function CustomerOrdering() {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [apiMenuItems, setApiMenuItems] = useState<ApiMenuItem[]>([]);
  const [restaurantId, setRestaurantId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Items");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<"Dine-in" | "Takeaway">(
    "Dine-in",
  );
  const [tableNumber, setTableNumber] = useState("1");
  const [showCheckout, setShowCheckout] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("UPI");
  const [demoPaymentAcknowledged, setDemoPaymentAcknowledged] = useState(false);

  const loadCatalog = useCallback(async () => {
    try {
      const [restaurantData, categoryData, menuData] = await Promise.all([
        apiRequest<Restaurant[]>("/restaurants/"),
        apiRequest<MenuCategory[]>("/categories/"),
        apiRequest<ApiMenuItem[]>("/menu-items/"),
      ]);

      const activeRestaurants = restaurantData.filter(
        (restaurant) => restaurant.is_active,
      );
      setRestaurants(activeRestaurants);
      setCategories(categoryData.filter((category) => category.is_active));
      setApiMenuItems(menuData.filter((item) => item.is_active));
      setRestaurantId((currentId) =>
        activeRestaurants.some(
          (restaurant) => String(restaurant.id) === currentId,
        )
          ? currentId
          : String(activeRestaurants[0]?.id ?? ""),
      );
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Unable to load the restaurant menu.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadCatalog);
  }, [loadCatalog]);

  const selectedRestaurantId = Number(restaurantId);
  const restaurantCategories = useMemo(
    () =>
      categories.filter(
        (category) => category.restaurant === selectedRestaurantId,
      ),
    [categories, selectedRestaurantId],
  );
  const products = useMemo<MenuItem[]>(() => {
    const categoryMap = new Map(
      restaurantCategories.map((category) => [category.id, category]),
    );

    return apiMenuItems.flatMap((item) => {
      const category = categoryMap.get(item.category);

      return category
        ? [{
            id: item.id,
            name: item.name,
            category: category.name,
            categoryId: category.id,
            description: item.description,
            price: Number(item.price),
            imageUrl: item.image_url,
          }]
        : [];
    });
  }, [apiMenuItems, restaurantCategories]);
  const categoryOptions = useMemo(
    () => [
      { id: "All Items", name: "All Items" },
      ...restaurantCategories.map((category) => ({
        id: String(category.id),
        name: category.name,
      })),
    ],
    [restaurantCategories],
  );

  const filteredItems = useMemo(() => {
    return products.filter((item) => {
      const matchesCategory =
        selectedCategory === "All Items" ||
        String(item.categoryId) === selectedCategory;

      const query = search.trim().toLowerCase();

      const matchesSearch =
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, search]);

  const cartCount = cart.reduce(
    (total, cartItem) => total + cartItem.quantity,
    0,
  );

  const subtotal = cart.reduce(
    (total, cartItem) =>
      total + cartItem.item.price * cartItem.quantity,
    0,
  );

  const total = subtotal;

  function addToCart(item: MenuItem) {
    const existing = cart.find((cartItem) => cartItem.item.id === item.id);

    if (existing && existing.quantity >= 99) {
      setCheckoutError("You can order up to 99 of each menu item.");
      return;
    }

    setCart((previous) => {
      const currentItem = previous.find(
        (cartItem) => cartItem.item.id === item.id,
      );

      if (currentItem) {
        return previous.map((cartItem) =>
          cartItem.item.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem,
        );
      }

      return [...previous, { item, quantity: 1 }];
    });

    setCheckoutError("");
  }

  function changeQuantity(itemId: number, change: number) {
    const currentItem = cart.find(
      (cartItem) => cartItem.item.id === itemId,
    );

    if (change > 0 && currentItem && currentItem.quantity >= 99) {
      setCheckoutError("You can order up to 99 of each menu item.");
      return;
    }

    setCart((previous) =>
      previous
        .map((cartItem) =>
          cartItem.item.id === itemId
            ? {
                ...cartItem,
                quantity: cartItem.quantity + change,
              }
            : cartItem,
        )
        .filter((cartItem) => cartItem.quantity > 0),
    );

    setCheckoutError("");
  }

  function changeRestaurant(value: string) {
    setRestaurantId(value);
    setSelectedCategory("All Items");
    setCart([]);
    setCheckoutError("");
    setDemoPaymentAcknowledged(false);
  }

  async function placeOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) return;

    if (!restaurantId || restaurants.length === 0) {
      setCheckoutError("Please select an active restaurant.");
      return;
    }

    if (cart.length === 0) {
      setCheckoutError("Add at least one menu item before placing an order.");
      return;
    }

    if (orderType === "Dine-in" && !tableNumber.trim()) {
      setCheckoutError("Please select a table number for dine-in.");
      return;
    }

    setSubmitting(true);
    setCheckoutError("");

    try {
      const order = await apiRequest<CreatedOrder>("/orders/create/", {
        method: "POST",
        body: JSON.stringify({
          restaurant: selectedRestaurantId,
          order_type: orderType === "Dine-in" ? "DINE_IN" : "TAKEAWAY",
          table_number: orderType === "Dine-in" ? tableNumber.trim() : "",
          items: cart.map(({ item, quantity }) => ({
            menu_item: item.id,
            quantity,
          })),
        }),
      });

      if (!order.order_number) {
        throw new Error("The server did not return an order number.");
      }

      rememberRatingOrder(order.display_order_number, order.order_number);
      setCart([]);
      setShowCheckout(false);
      setCreatedOrder(order);
    } catch (error) {
      setCheckoutError(
        error instanceof Error
          ? error.message
          : "Unable to submit your order. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Customer-facing header */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-xl text-white">
              Q
            </div>
            <div>
              <h1 className="text-lg font-bold">
                {restaurants.find(
                  (restaurant) => restaurant.id === selectedRestaurantId,
                )?.name ?? "Kiosk Ordering"}
              </h1>
              <p className="text-xs text-slate-500">
                Fresh food, made with care
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setCheckoutError("");
              setShowCheckout(true);
            }}
            disabled={cart.length === 0 || !restaurantId || loading}
            className="relative flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span aria-hidden="true">🛒</span>
            <span>My Cart</span>
            <span className="rounded-full bg-white px-2 py-0.5 text-xs text-indigo-700">
              {cartCount}
            </span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
          Menu availability and prices are loaded from the restaurant. UPI and card options in checkout are demonstrations only; no payment is processed.
        </div>

        {loadError && (
          <div
            role="alert"
            className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          >
            <span>{loadError}</span>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setLoadError("");
                void loadCatalog();
              }}
              disabled={loading}
              className="font-semibold underline disabled:opacity-50"
            >
              Retry
            </button>
          </div>
        )}

        {/* Welcome banner */}
        <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-700 to-violet-600 p-6 text-white sm:p-10">
          <div className="max-w-2xl">
            <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium">
              YOUR NEXT FAVOURITE MEAL
            </span>

            <h2 className="mt-5 text-3xl font-bold leading-tight sm:text-4xl">
              Good food.
              <br />
              Good mood.
            </h2>

            <p className="mt-3 max-w-md text-sm leading-6 text-indigo-100 sm:text-base">
              Explore our menu, choose your favourites, and build your order.
            </p>

            <button
              type="button"
              onClick={() =>
                document.getElementById("menu-items")?.scrollIntoView({
                  behavior: "smooth",
                })
              }
              className="mt-6 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
            >
              Explore Menu →
            </button>
          </div>
        </section>

        {/* Menu heading and search */}
        <section id="menu-items" className="mt-9">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-medium text-indigo-600">
                MADE FOR YOU
              </p>
              <h2 className="mt-1 text-2xl font-bold">Our Menu</h2>
              <p className="mt-1 text-sm text-slate-500">
                Find something delicious today.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:max-w-sm">
              {restaurants.length > 1 && (
                <label className="text-sm font-medium text-slate-700">
                  Choose a restaurant
                  <select
                    value={restaurantId}
                    onChange={(event) => changeRestaurant(event.target.value)}
                    disabled={loading || submitting}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  >
                    {restaurants.map((restaurant) => (
                      <option key={restaurant.id} value={restaurant.id}>
                        {restaurant.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search food or category..."
                aria-label="Search menu"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>

          {/* Category navigation */}
          {!loading && restaurantCategories.length > 0 && (
            <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
              {categoryOptions.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategory(category.id)}
                  className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-medium transition ${
                    selectedCategory === category.id
                      ? "bg-indigo-600 text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          )}

          {/* Menu grid */}
          {loading ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
              Loading restaurant menu...
            </div>
          ) : loadError ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
              Menu could not be loaded.
            </div>
          ) : restaurants.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <p className="text-lg font-semibold">No active restaurants</p>
              <p className="mt-2 text-sm text-slate-500">
                Please check back when a restaurant is available.
              </p>
            </div>
          ) : !loadError && products.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <p className="text-lg font-semibold">Menu not available</p>
              <p className="mt-2 text-sm text-slate-500">
                This restaurant has no available menu items right now.
              </p>
            </div>
          ) : !loadError && filteredItems.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <p className="text-lg font-semibold">No items found</p>
              <p className="mt-2 text-sm text-slate-500">
                Try another search or category.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map((item) => (
                <article
                  key={item.id}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="relative flex h-40 items-center justify-center bg-gradient-to-br from-orange-50 to-amber-100">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    ) : (
                      <span
                        className="text-7xl transition group-hover:scale-110"
                        aria-hidden="true"
                      >
                        🍽️
                      </span>
                    )}
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium text-indigo-600">
                          {item.category}
                        </p>
                        <h3 className="mt-1 font-semibold text-slate-900">
                          {item.name}
                        </h3>
                      </div>

                      <p className="shrink-0 font-bold text-slate-900">
                        {formatPrice(item.price)}
                      </p>
                    </div>

                    <p className="mt-3 min-h-10 text-sm leading-5 text-slate-500">
                      {item.description}
                    </p>

                    <button
                      type="button"
                      onClick={() => addToCart(item)}
                      disabled={submitting}
                      className="mt-4 w-full rounded-xl border border-indigo-600 px-4 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      + Add to Cart
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Cart summary */}
        <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Your Order</h2>
              <p className="mt-1 text-sm text-slate-500">
                {cartCount} item{cartCount === 1 ? "" : "s"} in your cart
              </p>
            </div>

            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => setCart([])}
                disabled={submitting}
                className="text-sm font-medium text-rose-600 hover:text-rose-700 disabled:opacity-50"
              >
                Clear Cart
              </button>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="mt-6 rounded-xl bg-slate-50 px-4 py-8 text-center">
              <p className="text-3xl">🛍️</p>
              <p className="mt-3 font-medium text-slate-700">
                Your cart is empty
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Add something tasty from the menu above.
              </p>
            </div>
          ) : (
            <>
              <div className="mt-5 divide-y divide-slate-100">
                {cart.map(({ item, quantity }) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-4 py-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt=""
                          className="h-12 w-12 shrink-0 rounded-xl object-cover"
                        />
                      ) : (
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-2xl">
                          🍽️
                        </span>
                      )}
                      <div>
                        <p className="font-medium text-slate-800">
                          {item.name}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {formatPrice(item.price)} each
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-1">
                        <button
                          type="button"
                          aria-label={`Remove one ${item.name}`}
                          onClick={() => changeQuantity(item.id, -1)}
                          disabled={submitting}
                          className="h-8 w-8 rounded-lg text-lg hover:bg-slate-100 disabled:opacity-50"
                        >
                          −
                        </button>

                        <span className="min-w-4 text-center text-sm font-semibold">
                          {quantity}
                        </span>

                        <button
                          type="button"
                          aria-label={`Add one ${item.name}`}
                          onClick={() => changeQuantity(item.id, 1)}
                          disabled={submitting}
                          className="h-8 w-8 rounded-lg text-lg hover:bg-slate-100 disabled:opacity-50"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        aria-label={`Remove ${item.name} from cart`}
                        onClick={() =>
                          setCart((previous) =>
                            previous.filter(
                              (cartItem) => cartItem.item.id !== item.id,
                            ),
                          )
                        }
                        disabled={submitting}
                        className="text-sm font-medium text-rose-600 hover:text-rose-700 disabled:opacity-50"
                      >
                        Remove
                      </button>

                      <p className="w-20 text-right font-semibold">
                        {formatPrice(item.price * quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
                <div className="flex justify-between border-t border-slate-100 pt-4 text-lg font-bold">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCheckoutError("");
                  setShowCheckout(true);
                }}
                disabled={!restaurantId || loading || submitting}
                className="mt-6 w-full rounded-xl bg-indigo-600 px-5 py-4 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue to Checkout →
              </button>
            </>
          )}

          {checkoutError && !showCheckout && (
            <p
              role="alert"
              className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-800"
            >
              {checkoutError}
            </p>
          )}

        </section>
      </main>

      {createdOrder && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4"
          role="presentation"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-receipt-title"
            className="my-auto w-full max-w-sm rounded-lg bg-white p-6 font-mono text-sm text-slate-900 shadow-2xl"
          >
            <header className="border-b border-dashed border-slate-400 pb-4 text-center">
              <p className="text-xs uppercase tracking-widest">Kiosk Manager</p>
              <h2 id="order-receipt-title" className="mt-2 text-lg font-bold">
                Order Receipt
              </h2>
              <p className="mt-1 text-xs">{createdOrder.restaurant_name}</p>
              <p className="mt-2 text-xs">
                {new Date(createdOrder.created_at).toLocaleString()}
              </p>
            </header>

            <div className="space-y-1 border-b border-dashed border-slate-400 py-4 text-xs">
              <p>Order No: <span className="break-all font-bold">{createdOrder.display_order_number ?? createdOrder.order_number}</span></p>
              <p>Type: {createdOrder.order_type === "DINE_IN" ? "Dine-in" : "Takeaway"}</p>
              {createdOrder.order_type === "DINE_IN" && createdOrder.table_number && (
                <p>Table: {createdOrder.table_number}</p>
              )}
              <p>Status: {createdOrder.status}</p>
            </div>

            <div className="border-b border-dashed border-slate-400 py-4">
              <div className="mb-2 grid grid-cols-[1fr_auto_auto] gap-3 text-xs font-bold uppercase">
                <span>Item</span>
                <span>Qty</span>
                <span>Amt</span>
              </div>
              <div className="space-y-2">
                {createdOrder.items.map((item) => (
                  <div key={item.id} className="grid grid-cols-[1fr_auto_auto] gap-3 text-xs">
                    <span className="break-words">{item.item_name}</span>
                    <span>{item.quantity}</span>
                    <span>{formatPrice(Number(item.subtotal))}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-between border-t border-dotted border-slate-400 pt-3 font-bold">
                <span>Total</span>
                <span>{formatPrice(Number(createdOrder.total_amount))}</span>
              </div>
            </div>

            <div className="py-4 text-center text-xs">
              <p>Payment: {createdOrder.payment_status}</p>
              <p className="mt-2">Demo payment only. Please pay at the restaurant.</p>
              <p className="mt-2">Keep this order number to check your order. You can rate your food after it is completed.</p>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate("/food-ratings", {
                  state: {
                    order_number: createdOrder.order_number,
                    display_order_number: createdOrder.display_order_number,
                  },
                })
              }
              className="mb-3 w-full rounded-lg border border-violet-600 px-4 py-3 font-sans text-sm font-bold text-violet-700 transition hover:bg-violet-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
            >
              Rate your food
            </button>
            <button
              type="button"
              onClick={() => navigate("/", { replace: true })}
              className="w-full rounded-lg bg-violet-600 px-4 py-3 font-sans text-sm font-bold text-white transition hover:bg-violet-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
            >
              OK
            </button>
          </section>
        </div>
      )}

      {/* Checkout modal */}
      {showCheckout && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget && !submitting) {
              setShowCheckout(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-title"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 sm:rounded-3xl sm:p-8"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2
                  id="checkout-title"
                  className="text-xl font-bold text-slate-900"
                >
                  Checkout
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Review your order details.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowCheckout(false)}
                disabled={submitting}
                aria-label="Close checkout"
                className="rounded-xl px-3 py-2 text-xl text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-slate-600">
                  Your cart is empty. Add menu items before checkout.
                </p>
                <button
                  type="button"
                  onClick={() => setShowCheckout(false)}
                  className="mt-5 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white"
                >
                  Back to Menu
                </button>
              </div>
            ) : (
              <form onSubmit={placeOrder} className="mt-6 space-y-5">
              <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-800">
                  Your items
                </h3>
                {cart.map(({ item, quantity }) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-800">
                        {item.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {quantity} × {formatPrice(item.price)}
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold text-slate-800">
                      {formatPrice(item.price * quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div>
                  <p className="text-sm font-medium text-slate-700">
                    Order Type
                  </p>

                  <div className="mt-2 grid grid-cols-2 gap-3">
                    {(["Dine-in", "Takeaway"] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setOrderType(type)}
                        disabled={submitting}
                        className={`rounded-xl border p-3 text-sm font-medium disabled:opacity-50 ${
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

                {orderType === "Dine-in" && (
                  <div>
                    <label
                      htmlFor="table-number"
                      className="text-sm font-medium text-slate-700"
                    >
                      Table Number
                    </label>
                    <select
                      id="table-number"
                      value={tableNumber}
                      onChange={(event) =>
                        setTableNumber(event.target.value)
                      }
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    >
                      {Array.from({ length: 20 }, (_, index) => (
                        <option key={index + 1} value={String(index + 1)}>
                          Table {index + 1}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Items ({cartCount})</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="mt-3 flex justify-between font-bold">
                    <span>Total</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                </div>

                <fieldset>
                  <legend className="text-sm font-semibold text-slate-700">Choose a payment option</legend>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    {(["UPI", "CARD"] as const).map((method) => (
                      <button
                        key={method}
                        type="button"
                        aria-pressed={paymentMethod === method}
                        onClick={() => setPaymentMethod(method)}
                        disabled={submitting}
                        className={`rounded-xl border p-3 text-sm font-semibold disabled:opacity-50 ${
                          paymentMethod === method
                            ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                            : "border-slate-200 text-slate-600"
                        }`}
                      >
                        {method === "UPI" ? "UPI / QR" : "Credit / Debit Card"}
                      </button>
                    ))}
                  </div>
                  {paymentMethod === "UPI" ? (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
                      <div aria-hidden="true" className="mx-auto grid h-28 w-28 grid-cols-7 gap-1 rounded bg-white p-2">
                        {Array.from({ length: 49 }, (_, index) => (
                          <span
                            key={index}
                            className={`${((index * 17 + Math.floor(index / 7) * 11) % 5) < 2 ? "bg-slate-900" : "bg-white"}`}
                          />
                        ))}
                      </div>
                      <p className="mt-2 text-xs font-bold uppercase tracking-wide text-amber-900">Sample QR · Not payable</p>
                      <p className="mt-1 text-xs text-amber-800">This decorative QR does not contain payment details and cannot transfer money.</p>
                    </div>
                  ) : (
                    <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                      <p className="font-semibold text-indigo-900">Card checkout demo</p>
                      <p className="mt-1 text-sm text-indigo-800">No card number, CVV, or banking details are collected. Payment is due at the restaurant.</p>
                    </div>
                  )}
                  <label className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-600">
                    <input
                      type="checkbox"
                      checked={demoPaymentAcknowledged}
                      onChange={(event) => setDemoPaymentAcknowledged(event.target.checked)}
                      disabled={submitting}
                      className="mt-1 accent-indigo-600"
                    />
                    <span>I understand this is a demo payment screen. No payment is processed and the order will remain unpaid.</span>
                  </label>
                </fieldset>

                {checkoutError && (
                  <p
                    role="alert"
                    className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800"
                  >
                    {checkoutError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting || loading || !restaurantId || cart.length === 0 || !demoPaymentAcknowledged}
                  className="w-full rounded-xl bg-indigo-600 px-5 py-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Place Order · Pay at Restaurant"}
                </button>

                <p className="text-center text-xs text-slate-500">
                  Selected option: {paymentMethod === "UPI" ? "UPI demo" : "Card demo"}. This application does not process payments.
                </p>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
