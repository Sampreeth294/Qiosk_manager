
import { useMemo, useState } from "react";

type MenuItem = {
  id: number;
  name: string;
  category: string;
  description: string;
  price: number;
  emoji: string;
  popular?: boolean;
  available: boolean;
};

type CartItem = {
  item: MenuItem;
  quantity: number;
};

const menuItems: MenuItem[] = [
  {
    id: 1,
    name: "Masala Dosa",
    category: "South Indian",
    description: "Crispy dosa filled with spiced potato masala.",
    price: 100,
    emoji: "🥞",
    popular: true,
    available: true,
  },
  {
    id: 2,
    name: "Idli Vada",
    category: "South Indian",
    description: "Soft steamed idlis with crispy vada and chutney.",
    price: 60,
    emoji: "🍘",
    available: true,
  },
  {
    id: 3,
    name: "Paneer Butter Masala",
    category: "North Indian",
    description: "Paneer in a creamy tomato and butter gravy.",
    price: 200,
    emoji: "🍛",
    popular: true,
    available: true,
  },
  {
    id: 4,
    name: "Butter Naan",
    category: "North Indian",
    description: "Soft naan brushed with butter.",
    price: 40,
    emoji: "🫓",
    available: true,
  },
  {
    id: 5,
    name: "Veg Fried Rice",
    category: "Chinese",
    description: "Wok-tossed rice with fresh vegetables.",
    price: 150,
    emoji: "🍚",
    popular: true,
    available: true,
  },
  {
    id: 6,
    name: "Gobi Manchurian",
    category: "Chinese",
    description: "Crispy cauliflower tossed in Indo-Chinese sauce.",
    price: 130,
    emoji: "🥦",
    available: true,
  },
  {
    id: 7,
    name: "Veg Biryani",
    category: "Rice & Biryani",
    description: "Aromatic basmati rice with vegetables and spices.",
    price: 160,
    emoji: "🍲",
    popular: true,
    available: true,
  },
  {
    id: 8,
    name: "Filter Coffee",
    category: "Beverages",
    description: "Traditional South Indian filter coffee.",
    price: 35,
    emoji: "☕",
    available: true,
  },
  {
    id: 9,
    name: "Fresh Lime Soda",
    category: "Beverages",
    description: "Refreshing lime drink served chilled.",
    price: 50,
    emoji: "🍋",
    available: true,
  },
];

const categories = [
  "All Items",
  ...Array.from(new Set(menuItems.map((item) => item.category))),
];

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);

export default function CustomerOrdering() {
  const [selectedCategory, setSelectedCategory] = useState("All Items");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [orderType, setOrderType] = useState<"Dine-in" | "Takeaway">(
    "Dine-in",
  );
  const [tableNumber, setTableNumber] = useState("1");
  const [showCheckout, setShowCheckout] = useState(false);
  const [confirmation, setConfirmation] = useState("");

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesCategory =
        selectedCategory === "All Items" ||
        item.category === selectedCategory;

      const query = search.trim().toLowerCase();

      const matchesSearch =
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query);

      return matchesCategory && matchesSearch && item.available;
    });
  }, [selectedCategory, search]);

  const cartCount = cart.reduce(
    (total, cartItem) => total + cartItem.quantity,
    0,
  );

  const subtotal = cart.reduce(
    (total, cartItem) =>
      total + cartItem.item.price * cartItem.quantity,
    0,
  );

  // Illustrative 5% tax for this frontend demo.
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + tax;

  function addToCart(item: MenuItem) {
    setCart((previous) => {
      const existing = previous.find(
        (cartItem) => cartItem.item.id === item.id,
      );

      if (existing) {
        return previous.map((cartItem) =>
          cartItem.item.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem,
        );
      }

      return [...previous, { item, quantity: 1 }];
    });

    setConfirmation("");
  }

  function changeQuantity(itemId: number, change: number) {
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

    setConfirmation("");
  }

  function placeDemoOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (cart.length === 0) return;

    // Demo only: no order is sent to the backend.
    const demoOrderNumber = `DEMO-${Date.now().toString().slice(-6)}`;

    setConfirmation(
      `Demo order ${demoOrderNumber} created on this page. No real order was submitted.`,
    );

    setCart([]);
    setShowCheckout(false);
    setCustomerName("");
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
              <h1 className="text-lg font-bold">Qiosk Restaurant</h1>
              <p className="text-xs text-slate-500">
                Fresh food, made with care
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowCheckout(true)}
            className="relative flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
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
        {/* Demo notice */}
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Preview mode — menu and prices are sample data. Orders are not sent
          to the restaurant.
        </div>

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

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search food or category..."
              aria-label="Search menu"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:max-w-sm"
            />
          </div>

          {/* Category navigation */}
          <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-medium transition ${
                  selectedCategory === category
                    ? "bg-indigo-600 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Menu grid */}
          {filteredItems.length === 0 ? (
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
                    <span className="text-7xl transition group-hover:scale-110">
                      {item.emoji}
                    </span>

                    {item.popular && (
                      <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-semibold text-orange-700 shadow-sm">
                        ★ Popular
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
                      className="mt-4 w-full rounded-xl border border-indigo-600 px-4 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-600 hover:text-white"
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
                className="text-sm font-medium text-rose-600 hover:text-rose-700"
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
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-2xl">
                        {item.emoji}
                      </span>
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
                          className="h-8 w-8 rounded-lg text-lg hover:bg-slate-100"
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
                          className="h-8 w-8 rounded-lg text-lg hover:bg-slate-100"
                        >
                          +
                        </button>
                      </div>

                      <p className="w-20 text-right font-semibold">
                        {formatPrice(item.price * quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>

                <div className="flex justify-between text-sm text-slate-600">
                  <span>Estimated tax (5% demo rate)</span>
                  <span>{formatPrice(tax)}</span>
                </div>

                <div className="flex justify-between border-t border-slate-100 pt-4 text-lg font-bold">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCheckout(true)}
                className="mt-6 w-full rounded-xl bg-indigo-600 px-5 py-4 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                Continue to Checkout →
              </button>
            </>
          )}

          {confirmation && (
            <p
              role="status"
              className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"
            >
              {confirmation}
            </p>
          )}
        </section>
      </main>

      {/* Checkout modal */}
      {showCheckout && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
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
                aria-label="Close checkout"
                className="rounded-xl px-3 py-2 text-xl text-slate-500 hover:bg-slate-100"
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
              <form onSubmit={placeDemoOrder} className="mt-6 space-y-5">
                <div>
                  <label
                    htmlFor="customer-name"
                    className="text-sm font-medium text-slate-700"
                  >
                    Customer Name
                  </label>
                  <input
                    id="customer-name"
                    required
                    value={customerName}
                    onChange={(event) =>
                      setCustomerName(event.target.value)
                    }
                    placeholder="Enter your name"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500"
                  />
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
                        className={`rounded-xl border p-3 text-sm font-medium ${
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
                    <span>Estimated Total</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Tax is illustrative and may not reflect the applicable tax
                    treatment.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-indigo-600 px-5 py-4 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Place Demo Order
                </button>

                <p className="text-center text-xs text-slate-500">
                  Demo only. No payment will be collected and no real order
                  will be submitted.
                </p>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
