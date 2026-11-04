import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { Link, useNavigate } from "react-router-dom";
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

type PaymentMethod = "UPI" | "CASH_COUNTER" | "CARD";

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

// Helper to provide canteen image fallback based on item name
function resolveItemImage(name: string, apiUrl: string | null): string {
  if (apiUrl) return apiUrl;
  const n = name.toLowerCase();
  if (n.includes("masala dosa") || n.includes("dosa")) return "/images/masala_dosa.jpg";
  if (n.includes("idli") || n.includes("idly")) return "/images/idli.jpg";
  if (n.includes("vada")) return "/images/vada.jpg";
  if (n.includes("chow chow")) return "/images/chow_chow_bath.jpg";
  if (n.includes("poori") || n.includes("puri")) return "/images/poori.jpg";
  if (n.includes("pongal")) return "/images/pongal.jpg";
  if (n.includes("bisi bele")) return "/images/bisi_bele_bath.jpg";
  if (n.includes("lemon rice")) return "/images/lemon_rice.jpg";
  if (n.includes("curd rice")) return "/images/curd_rice.jpg";
  if (n.includes("sambar") || n.includes("rice")) return "/images/rice_sambar.jpg";
  if (n.includes("chapati")) return "/images/chapati.jpg";
  if (n.includes("parotta") || n.includes("parota")) return "/images/parotta.jpg";
  if (n.includes("gobi")) return "/images/gobi.jpg";
  if (n.includes("bhel")) return "/images/bhel_puri.jpg";
  if (n.includes("masala puri")) return "/images/masala_puri.png";
  if (n.includes("pani puri") || n.includes("panipuri")) return "/images/panipuri.jpg";
  if (n.includes("mysore") || n.includes("bhajji")) return "/images/mysore_bhajji.jpg";
  if (n.includes("nipattu")) return "/images/nipattu_masala.jpg";
  if (n.includes("vanilla")) return "/images/Vanilla_Ice_Cream.jpg";
  if (n.includes("strawberry")) return "/images/strawberry_ice_cream.jpg";
  if (n.includes("chocolate sauce") || n.includes("syrup")) return "/images/Ice_cream_with_chocolate_syrup.jpg";
  if (n.includes("kulfi")) return "/images/kulfi.jpg";
  if (n.includes("choco") || n.includes("bar")) return "/images/chocolate_bar.jpg";
  if (n.includes("coffee")) return "/images/coffee.jpg";
  if (n.includes("tea") || n.includes("chai")) return "/images/tea.jpg";
  if (n.includes("lemonade")) return "/images/lemanade.jpg";
  if (n.includes("coco") || n.includes("coke")) return "/images/coco_cola.jpg";
  if (n.includes("thums")) return "/images/thumsup.jpg";
  return "/images/canteen_blurred.jpg";
}

// Category icons for high-visibility kiosk tabs
const categoryIcons: Record<string, string> = {
  "All Items": "🍽️",
  Breakfast: "🥞",
  Lunch: "🍛",
  Snacks: "🥟",
  "Ice Creams": "🍨",
  Beverages: "☕",
};

export default function CustomerOrdering() {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [apiMenuItems, setApiMenuItems] = useState<ApiMenuItem[]>([]);
  const [restaurantId, setRestaurantId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Items");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<"Dine-in" | "Takeaway">("Dine-in");
  const [tableNumber, setTableNumber] = useState("1");
  const [showCheckout, setShowCheckout] = useState(false);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("UPI");
  const [isListening, setIsListening] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  // Live clock for kiosk header
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadCatalog = useCallback(async () => {
    try {
      const [restaurantData, categoryData, menuData] = await Promise.all([
        apiRequest<Restaurant[]>("/restaurants/"),
        apiRequest<MenuCategory[]>("/categories/"),
        apiRequest<ApiMenuItem[]>("/menu-items/"),
      ]);

      const activeRestaurants = restaurantData.filter((r) => r.is_active);
      setRestaurants(activeRestaurants);
      setCategories(categoryData.filter((c) => c.is_active));
      setApiMenuItems(menuData.filter((m) => m.is_active));
      setRestaurantId((currentId) =>
        activeRestaurants.some((r) => String(r.id) === currentId)
          ? currentId
          : String(activeRestaurants[0]?.id ?? ""),
      );
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Unable to load the canteen menu.",
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
    () => categories.filter((c) => c.restaurant === selectedRestaurantId),
    [categories, selectedRestaurantId],
  );

  const products = useMemo<MenuItem[]>(() => {
    const categoryMap = new Map(restaurantCategories.map((c) => [c.id, c]));

    return apiMenuItems.flatMap((item) => {
      const category = categoryMap.get(item.category);
      return category
        ? [
            {
              id: item.id,
              name: item.name,
              category: category.name,
              categoryId: category.id,
              description: item.description,
              price: Number(item.price),
              imageUrl: resolveItemImage(item.name, item.image_url),
            },
          ]
        : [];
    });
  }, [apiMenuItems, restaurantCategories]);

  const categoryOptions = useMemo(
    () => [
      { id: "All Items", name: "All Items" },
      ...restaurantCategories.map((c) => ({
        id: String(c.id),
        name: c.name,
      })),
    ],
    [restaurantCategories],
  );

  const filteredItems = useMemo(() => {
    return products.filter((item) => {
      const matchesCategory =
        selectedCategory === "All Items" || String(item.categoryId) === selectedCategory;

      const query = search.trim().toLowerCase();
      const matchesSearch =
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, search]);

  const cartCount = cart.reduce((total, cartItem) => total + cartItem.quantity, 0);
  const total = cart.reduce((sum, cartItem) => sum + cartItem.item.price * cartItem.quantity, 0);

  function addToCart(item: MenuItem) {
    const existing = cart.find((cartItem) => cartItem.item.id === item.id);
    if (existing && existing.quantity >= 99) {
      setCheckoutError("Maximum 99 quantity allowed per item.");
      return;
    }

    setCart((previous) => {
      const currentItem = previous.find((cartItem) => cartItem.item.id === item.id);
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
    const currentItem = cart.find((cartItem) => cartItem.item.id === itemId);
    if (change > 0 && currentItem && currentItem.quantity >= 99) {
      setCheckoutError("Maximum 99 quantity allowed per item.");
      return;
    }

    setCart((previous) =>
      previous
        .map((cartItem) =>
          cartItem.item.id === itemId
            ? { ...cartItem, quantity: cartItem.quantity + change }
            : cartItem,
        )
        .filter((cartItem) => cartItem.quantity > 0),
    );
    setCheckoutError("");
  }

  function getItemCartQuantity(itemId: number): number {
    return cart.find((c) => c.item.id === itemId)?.quantity ?? 0;
  }

  // Voice Search Function ported directly from canteen kiosk user_dashboard.html
  function handleVoiceSearch() {
    type AnyWindow = Window & {
      SpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        maxAlternatives: number;
        onresult: (e: { results: { [key: number]: { [key: number]: { transcript: string } } } }) => void;
        onerror: () => void;
        onend: () => void;
        start: () => void;
      };
      webkitSpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        maxAlternatives: number;
        onresult: (e: { results: { [key: number]: { [key: number]: { transcript: string } } } }) => void;
        onerror: () => void;
        onend: () => void;
        start: () => void;
      };
    };

    const win = window as unknown as AnyWindow;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice search is not supported in this browser. Please type in the search bar.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-IN";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      setIsListening(true);

      recognition.onresult = (event) => {
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript) {
          setSearch(transcript);
        }
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  }

  async function placeOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    if (!restaurantId || restaurants.length === 0) {
      setCheckoutError("Please select a restaurant.");
      return;
    }

    if (cart.length === 0) {
      setCheckoutError("Your cart is empty. Please add items.");
      return;
    }

    if (orderType === "Dine-in" && !tableNumber.trim()) {
      setCheckoutError("Please specify a table number.");
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
      setShowCartDrawer(false);
      setCreatedOrder(order);
    } catch (error) {
      setCheckoutError(
        error instanceof Error ? error.message : "Unable to place order. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-canteen-order text-slate-100">
      {/* 10-Foot Distance Optimized Header Bar */}
      <header className="sticky top-0 z-30 border-b border-amber-500/20 bg-slate-950/85 px-4 py-4 shadow-2xl backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          {/* Brand & Kiosk Station info */}
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-2xl font-black text-slate-950 shadow-lg shadow-amber-500/25 transition hover:scale-105"
              title="Return to Welcome Screen"
            >
              Q
            </Link>

            <div>
<<<<<<< HEAD
              <h1 className="text-lg font-bold">
                {restaurants.find(
                  (restaurant) => restaurant.id === selectedRestaurantId,
                )?.name ?? "Kiosk Ordering"}
              </h1>
              <p className="text-xs text-slate-500">
                Fresh food, made with care
=======
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">
                  {restaurants.find((r) => r.id === selectedRestaurantId)?.name ?? "RVCE Canteen"}
                </h1>
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-300/90 sm:text-sm">
                RV College of Engineering • {currentTime}
>>>>>>> 89d3e54 (Save my local changes)
              </p>
            </div>
          </div>

          {/* Quick Action Navigation Buttons */}
          <div className="flex items-center gap-3">
            <Link
              to="/menu-voting"
              className="flex items-center gap-2 rounded-2xl border-2 border-emerald-400/80 bg-emerald-950/70 px-4 py-3 text-sm font-black text-emerald-300 shadow backdrop-blur transition hover:bg-emerald-900/80"
              title="Vote on Tomorrow's Menu"
            >
              <span>🗳️ Tomorrow's Menu Poll</span>
            </Link>

            <Link
              to="/live-display"
              className="hidden items-center gap-2 rounded-xl border border-white/20 bg-slate-900/80 px-4 py-3 text-sm font-bold text-sky-400 shadow backdrop-blur transition hover:bg-slate-800 sm:flex"
            >
              <span>📟 Live Display</span>
            </Link>

            {/* Prominent Cart Trigger Button (High Visibility from 10ft) */}
            <button
              type="button"
              onClick={() => {
                setCheckoutError("");
                setShowCartDrawer(true);
              }}
              disabled={loading}
              className={`flex items-center gap-3 rounded-2xl px-5 py-3.5 text-base font-extrabold shadow-xl transition-all duration-200 active:scale-95 ${
                cartCount > 0
                  ? "bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 text-slate-950 shadow-amber-500/30 hover:brightness-110"
                  : "border border-white/20 bg-slate-900/80 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <span className="text-xl">🛒</span>
              <span>My Tray</span>
              <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-slate-950 px-2 text-xs font-black text-amber-400 shadow">
                {cartCount}
              </span>
              {cartCount > 0 && (
                <span className="hidden font-black text-slate-950 sm:inline">
                  • {formatPrice(total)}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Kiosk Content Container */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-8">
        {/* Restaurant selector if multiple */}
        {restaurants.length > 1 && (
          <div className="mb-6 flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/70 p-4 backdrop-blur-md">
            <span className="text-base font-bold text-amber-300">Selected Canteen:</span>
            <select
              value={restaurantId}
              onChange={(e) => {
                setRestaurantId(e.target.value);
                setSelectedCategory("All Items");
                setCart([]);
              }}
              className="rounded-xl border border-amber-400/40 bg-slate-900 px-4 py-2.5 text-base font-bold text-white outline-none focus:ring-2 focus:ring-amber-400"
            >
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Search & Voice Search Controls - High Usability from 10ft */}
        <section className="mb-8 rounded-3xl border border-white/15 bg-slate-950/75 p-5 shadow-2xl backdrop-blur-xl sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {/* Search input */}
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-slate-400">
                🔍
              </span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search food by name (e.g. Masala Dosa, Coffee)..."
                className="w-full rounded-2xl border-2 border-white/20 bg-slate-900/90 py-4 pl-14 pr-12 text-lg font-bold text-white placeholder-slate-400 shadow-inner outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-slate-700 p-1.5 text-xs text-white hover:bg-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Voice Search Button (Canteen Voice Recognition) */}
            <button
              type="button"
              onClick={handleVoiceSearch}
              className={`flex shrink-0 items-center justify-center gap-3 rounded-2xl px-6 py-4 text-base font-black shadow-xl transition-all duration-200 active:scale-95 ${
                isListening
                  ? "voice-listening bg-rose-600 text-white"
                  : "border-2 border-amber-400/80 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 hover:brightness-110"
              }`}
              title="Click and speak food name"
            >
              <span className="text-2xl">{isListening ? "🔴" : "🎤"}</span>
              <span>{isListening ? "Listening..." : "Speak to Order"}</span>
            </button>
          </div>

          {/* 10-Foot Distance Category Tabs */}
          {!loading && restaurantCategories.length > 0 && (
            <div className="mt-6 flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
              {categoryOptions.map((cat) => {
                const icon = categoryIcons[cat.name] || "🍽️";
                const isSelected = selectedCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex shrink-0 items-center gap-2.5 rounded-2xl px-6 py-3.5 text-base font-extrabold tracking-wide transition-all duration-200 ${
                      isSelected
                        ? "bg-amber-400 text-slate-950 shadow-[0_0_25px_rgba(250,204,21,0.5)] scale-105"
                        : "border border-white/15 bg-slate-900/80 text-slate-300 hover:border-amber-400/50 hover:bg-slate-800"
                    }`}
                  >
                    <span className="text-xl">{icon}</span>
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Load Error alert */}
        {loadError && (
          <div className="mb-8 flex items-center justify-between rounded-2xl border border-rose-500 bg-rose-950/80 p-5 text-rose-200 backdrop-blur-md">
            <span className="text-lg font-bold">{loadError}</span>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setLoadError("");
                void loadCatalog();
              }}
              className="rounded-xl bg-rose-600 px-4 py-2 font-bold text-white hover:bg-rose-500"
            >
              Retry
            </button>
          </div>
        )}

        {/* Menu Items Grid - 10-Foot Visibility Scale */}
        <section>
          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-16 text-center backdrop-blur-xl">
              <span className="text-5xl animate-bounce">🍲</span>
              <p className="mt-4 text-2xl font-bold text-amber-300">Loading Canteen Menu...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-3xl border border-white/15 bg-slate-950/80 p-16 text-center backdrop-blur-xl">
              <span className="text-5xl">🔍</span>
              <p className="mt-4 text-2xl font-bold text-white">No items found</p>
              <p className="mt-2 text-base text-slate-400">
                Try searching for something else or tap another category above.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSelectedCategory("All Items");
                }}
                className="mt-6 rounded-2xl bg-amber-500 px-6 py-3 font-bold text-slate-950 hover:bg-amber-400"
              >
                Show All Menu Items
              </button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
              {filteredItems.map((item) => {
                const qtyInCart = getItemCartQuantity(item.id);

                return (
                  <article
                    key={item.id}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border-2 border-white/15 bg-slate-900/90 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 hover:border-amber-400 hover:shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
                  >
                    {/* Dish Photo Container */}
                    <div className="relative h-60 w-full overflow-hidden bg-slate-950">
                      <img
                        src={item.imageUrl || "/images/canteen_blurred.jpg"}
                        alt={item.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-108"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-black/30" />

                      {/* Category Tag & Pure Veg Indicator */}
                      <div className="absolute left-4 top-4 flex items-center gap-2">
                        <span className="flex h-7 items-center gap-1.5 rounded-full border border-emerald-400/50 bg-slate-950/85 px-3 text-xs font-black text-emerald-400 shadow backdrop-blur">
                          <span className="h-2 w-2 rounded-full bg-emerald-400" />
                          VEG
                        </span>
                        <span className="rounded-full border border-white/20 bg-slate-950/80 px-3 py-1 text-xs font-bold text-slate-300 shadow backdrop-blur">
                          {item.category}
                        </span>
                      </div>

                      {/* Huge Price Badge on Image (Visible from 10ft) */}
                      <div className="absolute bottom-4 right-4 rounded-2xl border border-amber-400/50 bg-slate-950/90 px-4 py-2 shadow-2xl backdrop-blur-md">
                        <span className="kiosk-glow-amber text-3xl font-black text-amber-400">
                          {formatPrice(item.price)}
                        </span>
                      </div>
                    </div>

                    {/* Dish Details */}
                    <div className="flex flex-1 flex-col justify-between p-6">
                      <div>
                        <h3 className="kiosk-text-shadow text-2xl font-black text-white sm:text-3xl">
                          {item.name}
                        </h3>
                        <p className="mt-2 line-clamp-2 text-base font-medium leading-relaxed text-slate-300">
                          {item.description}
                        </p>
                      </div>

                      {/* 10-Foot Touch Target Order Controls */}
                      <div className="mt-6 pt-4 border-t border-white/10">
                        {qtyInCart === 0 ? (
                          <button
                            type="button"
                            onClick={() => addToCart(item)}
                            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 py-4 text-xl font-black text-slate-950 shadow-lg shadow-amber-500/25 transition-all duration-200 hover:brightness-110 active:scale-95"
                          >
                            <span className="text-2xl">+</span>
                            <span>Add to Tray</span>
                          </button>
                        ) : (
                          <div className="flex items-center justify-between rounded-2xl border-2 border-amber-400/70 bg-slate-950/90 p-2 shadow-xl">
                            <button
                              type="button"
                              onClick={() => changeQuantity(item.id, -1)}
                              className="flex h-12 w-14 items-center justify-center rounded-xl bg-rose-600/90 text-2xl font-black text-white transition hover:bg-rose-500 active:scale-90"
                              title="Decrease quantity"
                            >
                              −
                            </button>

                            <div className="text-center">
                              <span className="text-2xl font-black text-amber-400">{qtyInCart}</span>
                              <span className="block text-[11px] font-bold uppercase text-slate-400">in tray</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => changeQuantity(item.id, 1)}
                              className="flex h-12 w-14 items-center justify-center rounded-xl bg-emerald-600/90 text-2xl font-black text-white transition hover:bg-emerald-500 active:scale-90"
                              title="Increase quantity"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Floating 10-Foot Distance Bottom Bar when items exist in Tray */}
      {cartCount > 0 && !showCheckout && (
        <div className="sticky bottom-0 z-20 border-t-2 border-amber-400 bg-slate-950/95 px-6 py-4 shadow-[0_-15px_40px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400 text-3xl font-black text-slate-950 shadow-lg shadow-amber-400/30">
                🛒
              </span>
              <div>
                <p className="text-base font-bold text-slate-300">
                  {cartCount} item{cartCount === 1 ? "" : "s"} added
                </p>
                <p className="kiosk-glow-amber text-3xl font-black text-amber-400 sm:text-4xl">
                  Total: {formatPrice(total)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCart([])}
                className="rounded-2xl border border-white/20 bg-slate-900 px-5 py-4 text-base font-bold text-rose-400 hover:bg-rose-950/50"
              >
                Clear
              </button>

              <button
                type="button"
                onClick={() => {
                  setCheckoutError("");
                  setShowCheckout(true);
                }}
                className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-500 px-8 py-4 text-xl font-black text-slate-950 shadow-2xl shadow-emerald-500/40 transition hover:brightness-110 active:scale-95"
              >
                <span>Proceed to Checkout</span>
                <span className="text-2xl">→</span>
              </button>
<<<<<<< HEAD
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
=======
>>>>>>> 89d3e54 (Save my local changes)
            </div>
          </div>
        </div>
      )}

      {/* Cart Tray Drawer Modal */}
      {showCartDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm">
          <div className="relative flex h-full w-full max-w-md flex-col bg-slate-900 border-l border-white/10 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h2 className="text-2xl font-black text-white">Your Tray ({cartCount})</h2>
              <button
                type="button"
                onClick={() => setShowCartDrawer(false)}
                className="rounded-xl bg-slate-800 p-2 text-xl font-bold text-slate-300 hover:bg-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {cart.length === 0 ? (
                <div className="py-20 text-center">
                  <span className="text-5xl">🛍️</span>
                  <p className="mt-4 text-xl font-bold text-slate-300">Tray is empty</p>
                  <p className="mt-2 text-sm text-slate-400">Add food from the menu to get started.</p>
                </div>
              ) : (
                cart.map(({ item, quantity }) => (
                  <div key={item.id} className="flex items-center justify-between rounded-2xl bg-slate-950/70 p-4 border border-white/10">
                    <div className="flex items-center gap-3">
                      <img src={item.imageUrl || "/images/canteen_blurred.jpg"} alt="" className="h-14 w-14 rounded-xl object-cover" />
                      <div>
                        <p className="font-bold text-white text-base">{item.name}</p>
                        <p className="text-sm font-semibold text-amber-400">{formatPrice(item.price)} each</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => changeQuantity(item.id, -1)}
                        className="h-9 w-9 rounded-lg bg-slate-800 text-lg font-bold hover:bg-slate-700"
                      >
                        −
                      </button>
                      <span className="min-w-6 text-center font-bold text-base">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => changeQuantity(item.id, 1)}
                        className="h-9 w-9 rounded-lg bg-slate-800 text-lg font-bold hover:bg-slate-700"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t border-white/10 pt-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg text-slate-300 font-bold">Total Amount:</span>
                  <span className="text-3xl font-black text-amber-400">{formatPrice(total)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowCartDrawer(false);
                    setShowCheckout(true);
                  }}
                  className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 py-4 text-xl font-black text-slate-950 shadow-xl hover:brightness-110"
                >
                  Proceed to Checkout →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout & UPI Payment Modal (Styled with Canteen Payment Background) */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/85 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-xl rounded-3xl border-2 border-amber-400/50 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-2xl sm:p-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-amber-400">Canteen Checkout</span>
                <h2 className="text-3xl font-black text-white">Complete Your Order</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowCheckout(false)}
                className="rounded-xl bg-slate-800 p-2.5 text-xl font-bold text-slate-300 hover:bg-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={placeOrder} className="mt-6 space-y-6">
              {/* Dine-In or Takeaway Selection */}
              <div>
                <label className="block text-base font-bold text-slate-200 mb-2">Dining Preference</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setOrderType("Dine-in")}
                    className={`flex items-center justify-center gap-2 rounded-2xl py-4 text-lg font-black transition ${
                      orderType === "Dine-in"
                        ? "border-2 border-amber-400 bg-amber-500 text-slate-950 shadow-lg"
                        : "border border-white/20 bg-slate-800 text-white hover:bg-slate-700"
                    }`}
                  >
                    <span>🍽️</span>
                    <span>Dine-In</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOrderType("Takeaway")}
                    className={`flex items-center justify-center gap-2 rounded-2xl py-4 text-lg font-black transition ${
                      orderType === "Takeaway"
                        ? "border-2 border-amber-400 bg-amber-500 text-slate-950 shadow-lg"
                        : "border border-white/20 bg-slate-800 text-white hover:bg-slate-700"
                    }`}
                  >
                    <span>🛍️</span>
                    <span>Takeaway / Parcel</span>
                  </button>
                </div>
              </div>

              {/* Table Number if Dine-in */}
              {orderType === "Dine-in" && (
                <div>
                  <label htmlFor="table-input" className="block text-base font-bold text-slate-200 mb-2">
                    Table / Counter Seat Number
                  </label>
                  <div className="flex items-center gap-2">
                    {["1", "2", "3", "4", "5", "6"].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setTableNumber(num)}
                        className={`h-12 w-12 rounded-xl text-lg font-black transition ${
                          tableNumber === num
                            ? "bg-amber-400 text-slate-950"
                            : "bg-slate-800 text-white border border-white/10 hover:bg-slate-700"
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                    <input
                      id="table-input"
                      type="text"
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                      placeholder="Other"
                      className="h-12 w-24 rounded-xl border border-white/20 bg-slate-800 px-3 text-center text-lg font-bold text-white outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              )}

              {/* Payment Method - Includes UPI QR Code (from Canteen Zip) */}
              <div>
                <label className="block text-base font-bold text-slate-200 mb-2">Select Payment Method</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("UPI")}
                    className={`rounded-2xl p-4 text-left border-2 transition ${
                      paymentMethod === "UPI"
                        ? "border-emerald-400 bg-emerald-950/40 text-white"
                        : "border-white/15 bg-slate-800 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-black">📱 UPI QR Scan</span>
                      <span className="text-xs font-bold text-emerald-400">Instant</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">GPay, PhonePe, Paytm, BHIM</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("CASH_COUNTER")}
                    className={`rounded-2xl p-4 text-left border-2 transition ${
                      paymentMethod === "CASH_COUNTER"
                        ? "border-amber-400 bg-amber-950/40 text-white"
                        : "border-white/15 bg-slate-800 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-black">💵 Pay at Counter</span>
                      <span className="text-xs font-bold text-amber-400">Cash / Card</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">Pay when collecting token</p>
                  </button>
                </div>

                {/* Simulated UPI QR Code Preview from Canteen Zip */}
                {paymentMethod === "UPI" && (
                  <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-white/15 bg-white p-5 text-center text-slate-900 shadow-xl">
                    <p className="text-sm font-black text-slate-700">Scan & Pay ₹{total.toFixed(2)}</p>
                    <img
                      src="/images/fake_upi_qr.png"
                      alt="UPI QR Code"
                      className="my-2 h-44 w-44 rounded-xl border-2 border-slate-300 shadow-md"
                    />
                    <p className="text-xs font-mono font-bold text-slate-600">UPI ID: bmscanteen@upi</p>
                    <p className="mt-1 text-[11px] font-semibold text-emerald-700">
                      ✓ Instant counter token generated upon tap below
                    </p>
                  </div>
                )}
              </div>

              {checkoutError && (
                <p role="alert" className="rounded-xl border border-rose-500 bg-rose-950/80 p-4 text-base font-bold text-rose-300">
                  {checkoutError}
                </p>
              )}

              {/* Submit CTA */}
              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xl font-bold text-slate-300">Amount Due:</span>
                  <span className="text-3xl font-black text-amber-400">{formatPrice(total)}</span>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-500 py-5 text-2xl font-black text-slate-950 shadow-2xl shadow-emerald-500/40 transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Placing Order..." : "✅ Confirm & Generate Token"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Confirmation & 10-Foot Glowing Token Modal */}
      {createdOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-canteen-success bg-slate-950/90 p-4 backdrop-blur-xl"
          role="presentation"
        >
          <div className="relative my-auto w-full max-w-lg rounded-3xl border-4 border-yellow-400/80 bg-slate-950/95 p-8 text-center text-white shadow-[0_0_80px_rgba(0,0,0,0.95)]">
            <span className="text-5xl">🎉</span>
            <p className="mt-2 text-sm font-extrabold uppercase tracking-widest text-emerald-400">
              Payment & Order Successful!
            </p>
            <h2 className="mt-1 text-3xl font-black text-white">Food is Being Prepared</h2>

            {/* Massive Glowing Token Badge - 10-Foot Distance Hero */}
            <div className="kiosk-token-glow my-6 inline-block w-full rounded-3xl border-4 border-yellow-400 bg-slate-900/90 p-6 shadow-2xl">
              <span className="text-xs font-black uppercase tracking-[0.25em] text-yellow-300">
                YOUR COUNTER TOKEN NUMBER
              </span>
              <p className="mt-2 font-mono text-6xl sm:text-7xl font-black tracking-wider text-yellow-400">
                #{createdOrder.display_order_number ?? createdOrder.order_number.slice(0, 6).toUpperCase()}
              </p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-1.5 border border-emerald-400/40 text-sm font-bold text-emerald-300">
                <span>⏱️ Estimated Prep Time: 10–15 Minutes</span>
              </div>
            </div>

            {/* Order Details & Receipt Content */}
            <div id="thermal-receipt" className="rounded-2xl border border-white/15 bg-white p-5 text-left font-mono text-sm text-slate-900 shadow">
              <div className="border-b border-dashed border-slate-400 pb-3 text-center">
                <p className="font-bold text-base">🧾 RV COLLEGE OF ENGINEERING CANTEEN</p>
                <p className="text-xs text-slate-600">Token: #{createdOrder.display_order_number ?? createdOrder.order_number.slice(0, 6)}</p>
                <p className="text-xs text-slate-500">{new Date(createdOrder.created_at).toLocaleString()}</p>
              </div>

              <div className="my-3 space-y-1.5 border-b border-dashed border-slate-400 pb-3 text-xs">
                <div className="flex justify-between font-bold">
                  <span>Item</span>
                  <span>Qty × Price</span>
                  <span>Total</span>
                </div>
                {createdOrder.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-slate-800">
                    <span className="max-w-[140px] truncate">{item.item_name}</span>
                    <span>{item.quantity} × {formatPrice(Number(item.unit_price))}</span>
                    <span className="font-bold">{formatPrice(Number(item.subtotal))}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between font-black text-base text-slate-950">
                <span>Grand Total:</span>
                <span>{formatPrice(Number(createdOrder.total_amount))}</span>
              </div>
              <p className="mt-3 text-center text-[11px] text-slate-500">
                Please collect your order at the pickup counter when your token is called.
              </p>
            </div>

            {/* Actions: Print Receipt, Rate Food, Next Order */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 rounded-2xl border-2 border-white/30 bg-slate-800 py-4 text-base font-extrabold text-white transition hover:bg-slate-700"
              >
                🖨️ Print Receipt
              </button>

              <button
                type="button"
                onClick={() => {
                  navigate("/food-ratings", {
                    state: {
                      order_number: createdOrder.order_number,
                      display_order_number: createdOrder.display_order_number,
                    },
                  });
                }}
                className="flex-1 rounded-2xl border-2 border-yellow-400/80 bg-yellow-500 py-4 text-base font-extrabold text-slate-950 transition hover:bg-yellow-400"
              >
                ⭐ Rate Your Meal
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setCreatedOrder(null);
                setSearch("");
                setSelectedCategory("All Items");
              }}
              className="mt-4 inline-block text-sm font-bold text-amber-300 underline underline-offset-4 hover:text-white"
            >
              ← Place Another Order
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
