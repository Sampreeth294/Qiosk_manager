
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import { useAuth } from "./auth/useAuth";
import { apiRequest } from "./api/apiClient";
import { chooseRestaurantId, storeSelectedRestaurantId } from "./api/restaurantSelection";
import MenuPage from "./pages/Menu";
import Categories from "./pages/Categories";
import Restaurants from "./pages/Restaurants";
import Orders from "./pages/orders";
import Settings from "./pages/Settings";
import Reports from "./pages/Reports";
import KitchenDisplay from "./pages/KitchenDisplay";
import CustomerOrdering from "./pages/CustomerOrdering";
import POS from "./pages/POS";
import MenuVoting from "./pages/MenuVoting";
import CustomerRatings from "./pages/CustomerRatings";
import LiveOrderDisplay from "./pages/LiveOrderDisplay";
import Inventory from "./pages/Inventory";
import PurchaseOrders from "./pages/PurchaseOrders";
import Suppliers from "./pages/Suppliers";
import Expenses from "./pages/Expenses";
import StaffManagement from "./pages/StaffManagement";
import DiscountsOffers from "./pages/DiscountsOffers";
import CustomerManagement from "./pages/CustomerManagement";
import AdminLogin from "./pages/AdminLogin";
import FoodRatingForm from "./pages/FoodRatingForm";
import CustomerEntry from "./pages/CustomerEntry";
import {
  InitialSetupPage,
  InvitationAcceptPage,
  PasswordChangePage,
  PasswordResetConfirmPage,
  PasswordResetRequestPage,
} from "./pages/AdminAccountPages";

const navigation = [
  { name: "Dashboard", path: "/admin", symbol: "▦", group: "OVERVIEW" },
  { name: "Orders", path: "/admin/orders", symbol: "▤", group: "OVERVIEW" },
  {
    name: "Kitchen Display",
    path: "/admin/kitchen",
    symbol: "🍳",
    group: "OVERVIEW",
  },
  {
    name: "Live Display",
    path: "/admin/live-display",
    symbol: "📺",
    group: "OVERVIEW",
  },
  {
    name: "Customer Ordering",
    path: "/order",
    symbol: "🛒",
    group: "OVERVIEW",
  },
  { name: "POS", path: "/admin/pos", symbol: "₹", group: "OVERVIEW" },
  {
    name: "Restaurants",
    path: "/admin/restaurants",
    symbol: "⌂",
    group: "MANAGEMENT",
  },
  { name: "Menu", path: "/admin/menu", symbol: "☷", group: "MANAGEMENT" },
  {
    name: "Categories",
    path: "/admin/categories",
    symbol: "▧",
    group: "MANAGEMENT",
  },
  {
    name: "Inventory",
    path: "/admin/inventory",
    symbol: "▣",
    group: "MANAGEMENT",
  },
  {
    name: "Menu Voting",
    path: "/admin/menu-voting",
    symbol: "🗳️",
    group: "MANAGEMENT",
  },
  {
    name: "Ratings",
    path: "/admin/ratings",
    symbol: "⭐",
    group: "MANAGEMENT",
  },
  {
    name: "Reports",
    path: "/admin/reports",
    symbol: "📊",
    group: "MANAGEMENT",
  },
  { name: "Settings", path: "/admin/settings", symbol: "⚙", group: "SYSTEM" },
  { name: "Change Password", path: "/admin/password", symbol: "🔒", group: "SYSTEM" },
  {
    name: "Purchase Orders",
    path: "/admin/purchase-orders",
    symbol: "▤",
    group: "MANAGEMENT",
  },
  {
    name: "Suppliers",
    path: "/admin/suppliers",
    symbol: "⇄",
    group: "MANAGEMENT",
  },
  {
    name: "Expenses",
    path: "/admin/expenses",
    symbol: "₹",
    group: "FINANCE",
  },
  {
    name: "Staff Management",
    path: "/admin/staff",
    symbol: "👥",
    group: "MANAGEMENT",
  },
  {
    name: "Discounts & Offers",
    path: "/admin/discounts",
    symbol: "%",
    group: "MARKETING",
  },
  {
    name: "Customers",
    path: "/admin/customers",
    symbol: "👥",
    group: "MANAGEMENT",
  },
];

function App() {
  return (
    <Routes>
      <Route path="/" element={<CustomerEntry />} />
      <Route path="/order" element={<CustomerOrdering />} />
      <Route path="/live-display" element={<LiveOrderDisplay />} />
      <Route path="/menu-voting" element={<MenuVoting />} />
      <Route path="/food-ratings" element={<FoodRatingForm />} />
      <Route path="/ratings" element={<FoodRatingForm />} />
      <Route
        path="/admin/*"
        element={
          <AuthProvider>
            <AdminRoutes />
          </AuthProvider>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function AdminRoutes() {
  return (
    <Routes>
      <Route path="login" element={<AdminLogin />} />
      <Route path="setup" element={<InitialSetupPage />} />
      <Route path="invite/:token" element={<InvitationAcceptPage />} />
      <Route path="password-reset" element={<PasswordResetRequestPage />} />
      <Route path="password-reset/confirm" element={<PasswordResetConfirmPage />} />
      <Route
        path="*"
        element={
          <RequireAuthentication>
            <AdminLayout />
          </RequireAuthentication>
        }
      />
    </Routes>
  );
}

function RequireAuthentication({ children }: { children: React.ReactNode }) {
  const { status, error, refreshSession } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600">
        Checking your sign-in session...
      </div>
    );
  }

  if (status === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <section className="max-w-md rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-bold text-slate-900">
            Unable to check your session
          </h1>
          <p role="alert" className="mt-2 text-sm text-rose-700">
            {error}
          </p>
          <button
            type="button"
            onClick={() => void refreshSession()}
            className="mt-5 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
          >
            Try again
          </button>
        </section>
      </main>
    );
  }

  if (status !== "authenticated") {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{ from: location }}
      />
    );
  }

  return children;
}

const pageDescriptions: Record<string, string> = {
  Dashboard: "Here's what's happening at your restaurant today.",
  Orders: "View and manage customer orders.",
  Restaurants: "Manage your restaurant locations and details.",
  Menu: "Manage menu items, prices, and availability.",
  Categories: "Organize your menu into categories.",
  Inventory: "Monitor stock levels and inventory.",
  "Kitchen Display": "View and manage orders being prepared.",
  "Live Display": "Show live order updates to customers.",
  "Customer Ordering": "Open the public customer ordering page.",
  POS: "Process in-person sales at the point of sale.",
  "Menu Voting": "Manage customer menu votes.",
  Ratings: "Review customer ratings and feedback.",
  Reports: "Review restaurant performance reports.",
  Settings: "Manage your application preferences.",
};

function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [logoutError, setLogoutError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const currentPath = location.pathname.replace(/\/+$/, "") || "/";
  const currentNavigation = navigation.find(
    (item) => item.path === currentPath,
  );
  const activePage = currentNavigation?.name ?? "Not Found";

  function navigateToPage(page: string) {
    const destination = navigation.find((item) => item.name === page);
    if (destination) navigate(destination.path);
  }

  async function handleLogout() {
    setLogoutError("");
    setLoggingOut(true);

    try {
      await logout();
      navigate("/admin/login", { replace: true });
    } catch (requestError) {
      setLogoutError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to sign out. Please try again.",
      );
    } finally {
      setLoggingOut(false);
    }
  }

  function renderPage() {
    switch (activePage) {
      case "Dashboard":
        return <Dashboard onNavigate={navigateToPage} />;
      case "Restaurants":
        return <Restaurants />;
      case "Menu":
        return <MenuPage />;
      case "Categories":
        return <Categories />;
      case "Orders":
        return <Orders />;
      case "Settings":
        return <Settings />;
      case "Change Password":
        return <PasswordChangePage />;
      case "Reports":
        return <Reports />;
      case "Kitchen Display":
        return <KitchenDisplay />;
      case "POS":
        return <POS />;
      case "Menu Voting":
        return <MenuVoting management />;
      case "Ratings":
        return <CustomerRatings />;
      case "Live Display":
        return <LiveOrderDisplay />;
      case "Inventory":
        return <Inventory />;
      case "Purchase Orders":
        return <PurchaseOrders />;
      case "Suppliers":
        return <Suppliers />;
      case "Expenses":
        return <Expenses />;
      case "Staff Management":
        return <StaffManagement />;
      case "Discounts & Offers":
        return <DiscountsOffers />;
      case "Customers":
        return <CustomerManagement />;
      default:
        return (
          <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900">
              Page not found
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              This admin page does not exist.
            </p>
            <Link
              to="/admin"
              className="mt-5 inline-block text-sm font-semibold text-violet-700 hover:underline"
            >
              Return to dashboard
            </Link>
          </section>
        );
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-white/10 bg-slate-950 text-white">
        <div className="border-b border-white/10 px-6 py-6">
          <div className="flex items-center gap-3">
<<<<<<< HEAD
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600 text-xl font-bold">
              K
            </div>

            <div>
              <h1 className="text-lg font-bold tracking-tight">
                Kiosk Manager
=======
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-xl font-black text-slate-950 shadow-lg shadow-amber-500/25">
              Q
            </div>

            <div>
              <h1 className="text-lg font-black tracking-tight text-white">
                RVCE Canteen
>>>>>>> 89d3e54 (Save my local changes)
              </h1>
              <p className="text-xs font-semibold text-amber-400">
                Operations Manager
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-7 overflow-y-auto px-4 py-6">
          {["OVERVIEW", "MANAGEMENT", "FINANCE", "MARKETING", "SYSTEM"].map((group) => (
            <div key={group}>
              <p className="mb-3 px-3 text-[10px] font-bold tracking-[0.18em] text-slate-400">
                {group}
              </p>

              <div className="space-y-1">
                {navigation
                  .filter((item) => item.group === group)
                  .map((item) => {
                    const isActive = currentPath === item.path;

                    return (
                      <button
                        key={item.name}
                        onClick={() => navigate(item.path)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
                          isActive
                            ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-lg shadow-amber-500/25"
                            : "text-slate-300 hover:bg-slate-800 hover:text-white"
                        }`}
                      >
                        <span className="flex h-6 w-6 items-center justify-center text-lg">
                          {item.symbol}
                        </span>

                        <span>{item.name}</span>

                        {isActive && (
                          <span className="ml-auto h-2 w-2 rounded-full bg-slate-950" />
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="rounded-xl border border-white/10 bg-slate-900 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/20 text-sm font-bold text-amber-400 border border-amber-500/30">
                {user?.username.slice(0, 1).toUpperCase() ?? "A"}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">
                  {user?.username ?? "Staff Session"}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  RVCE Canteen Staff
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={loggingOut}
              className="mt-3 w-full rounded-lg border border-white/15 bg-slate-800 px-3 py-2 text-left text-xs font-bold text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-50"
            >
              {loggingOut ? "Signing out..." : "Sign out"}
            </button>
            {logoutError && (
              <p role="alert" className="mt-2 text-xs text-rose-300">
                {logoutError}
              </p>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="min-h-screen min-w-0 pl-64">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-900/90 px-8 py-5 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4">
            <div>
<<<<<<< HEAD
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Kiosk Manager</span>
                <span>/</span>
                <span className="font-medium text-violet-600">
                  {activePage}
                </span>
=======
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                <span>RV College of Engineering Canteen</span>
                <span className="text-slate-500">/</span>
                <span className="text-slate-300">{activePage}</span>
>>>>>>> 89d3e54 (Save my local changes)
              </div>

              <h2 className="mt-1 text-2xl font-black tracking-tight text-white">
                {activePage}
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                {pageDescriptions[activePage]}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/menu-voting"
                className="hidden sm:flex items-center gap-2 rounded-xl border border-emerald-400/50 bg-emerald-950/60 px-3.5 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-900/70 transition"
              >
                <span>🗳️ Tomorrow's Poll</span>
              </Link>
              <Link
                to="/order"
                target="_blank"
                rel="noreferrer"
                className="hidden sm:flex items-center gap-2 rounded-xl border border-amber-400/50 bg-amber-950/60 px-3.5 py-2 text-xs font-bold text-amber-300 hover:bg-amber-900/70 transition"
              >
                <span>🍽️ Customer Kiosk ↗</span>
              </Link>
              <Link
                to="/live-display"
                target="_blank"
                rel="noreferrer"
                className="hidden sm:flex items-center gap-2 rounded-xl border border-sky-400/50 bg-sky-950/60 px-3.5 py-2 text-xs font-bold text-sky-300 hover:bg-sky-900/70 transition"
              >
                <span>📟 Live Display ↗</span>
              </Link>
            </div>
          </div>
        </header>

        <div className="p-5 sm:p-8">
          {renderPage()}
        </div>

<<<<<<< HEAD
        <footer className="px-8 pb-6 text-center text-xs text-slate-400">
          Kiosk Manager · Restaurant Management System
=======
        <footer className="px-8 pb-6 text-center text-xs text-slate-500">
          RV College of Engineering Canteen Management System • Bengaluru
>>>>>>> 89d3e54 (Save my local changes)
        </footer>
      </main>
    </div>
  );
}

function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <section className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold text-violet-700">404</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          The page you requested does not exist.
        </p>
        <div className="mt-6 flex justify-center gap-4 text-sm font-semibold">
          <Link to="/order" className="text-violet-700 hover:underline">
            Customer ordering
          </Link>
          <Link to="/admin/login" className="text-violet-700 hover:underline">
            Admin sign in
          </Link>
        </div>
      </section>
    </main>
  );
}

type DashboardProps = {
  onNavigate: (page: string) => void;
};

type DashboardStat = {
  label: string;
  value: string;
  description: string;
  color: string;
  icon: string;
  page: string;
};
type DashboardReport = {
  restaurant_id: number;
  summary: { revenue: number; orders: number; average_order_value: number; pending_orders: number; completed_orders: number; cancelled_orders: number };
  status_counts: Record<string, number>;
  current_status_counts: Record<string, number>;
  sales_series: { label: string; value: number }[];
  inventory_summary: { low_stock_items: number; total_items: number };
  menu_summary: { active_items: number };
  purchase_summary: { orders: number; pending: number; receipts: number };
  voting_summary: { eligible_options: number; target_date: string; votes_for_tomorrow: number };
  rating_summary: { average: number; count: number };
  expense_summary: { total: number; count: number; by_category: { category: string; total: number; count: number }[] };
};
type DashboardOrder = {
  id: number;
  order_number: string;
  status: string;
  total_amount: string;
  created_at: string;
};
type DashboardRestaurant = { id: number; name: string; is_active: boolean };

function Dashboard({ onNavigate }: DashboardProps) {
  const [restaurants, setRestaurants] = useState<DashboardRestaurant[]>([]);
  const [restaurantId, setRestaurantId] = useState<number | null>(null);
  const [stats, setStats] = useState<DashboardStat[]>([]);
  const [salesSeries, setSalesSeries] = useState<{ label: string; value: number }[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [recentOrders, setRecentOrders] = useState<DashboardOrder[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");
  const [dashboardConnection, setDashboardConnection] = useState<"connecting" | "live" | "polling">("connecting");
  const dashboardRequestId = useRef(0);

  useEffect(() => {
    let active = true;
    void apiRequest<DashboardRestaurant[]>("/restaurants/?include_inactive=true")
      .then((data) => {
        if (!active) return;
        const activeRestaurants = data.filter((restaurant) => restaurant.is_active);
        setRestaurants(activeRestaurants);
        const selected = chooseRestaurantId(activeRestaurants);
        setRestaurantId(selected);
        if (activeRestaurants.length === 0) setDashboardLoading(false);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setDashboardError(requestError instanceof Error ? requestError.message : "Unable to load restaurant access.");
        setDashboardLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const refreshDashboard = useCallback(async () => {
    if (!restaurantId) return;
    const requestId = ++dashboardRequestId.current;
    setDashboardLoading(true);
    setDashboardError("");
    try {
      const [report, orders] = await Promise.all([
        apiRequest<DashboardReport>(`/reports/summary/?restaurant_id=${restaurantId}&range=today`),
        apiRequest<DashboardOrder[]>(`/orders/?restaurant_id=${restaurantId}`),
      ]);
      if (requestId !== dashboardRequestId.current) return;
      if (report.restaurant_id !== restaurantId) {
        throw new Error("The dashboard response does not match the selected restaurant.");
      }
      setSalesSeries(report.sales_series);
      setStatusCounts(report.status_counts);
        setStats([
          {
            label: "Today's Orders",
            value: report.summary.orders.toLocaleString(),
            description: "Created during the restaurant's local business day",
            color: "bg-violet-50 text-violet-700",
            icon: "▤",
            page: "Orders",
          },
          {
            label: "Pending Now",
            value: (report.current_status_counts.PENDING ?? 0).toLocaleString(),
            description: "Current orders awaiting confirmation",
            color: "bg-amber-50 text-amber-700",
            icon: "◷",
            page: "Orders",
          },
          {
            label: "Confirmed Now",
            value: (report.current_status_counts.CONFIRMED ?? 0).toLocaleString(),
            description: "Current confirmed orders",
            color: "bg-violet-50 text-violet-700",
            icon: "✓",
            page: "Orders",
          },
          {
            label: "Preparing Now",
            value: (report.current_status_counts.PREPARING ?? 0).toLocaleString(),
            description: "Current kitchen orders",
            color: "bg-amber-50 text-amber-700",
            icon: "♨",
            page: "Kitchen Display",
          },
          {
            label: "Ready Now",
            value: (report.current_status_counts.READY ?? 0).toLocaleString(),
            description: "Current orders ready for pickup",
            color: "bg-emerald-50 text-emerald-700",
            icon: "✓",
            page: "Orders",
          },
          {
            label: "Completed Today",
            value: (report.status_counts.COMPLETED ?? 0).toLocaleString(),
            description: "Completed orders created today; completion time is not stored",
            color: "bg-emerald-50 text-emerald-700",
            icon: "✓",
            page: "Orders",
          },
          {
            label: "Cancelled Today",
            value: report.summary.cancelled_orders.toLocaleString(),
            description: "Orders created today and currently cancelled",
            color: "bg-rose-50 text-rose-700",
            icon: "×",
            page: "Orders",
          },
          {
            label: "Today's Revenue",
            value: `₹${report.summary.revenue.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`,
            description: `Average order ₹${report.summary.average_order_value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`,
            color: "bg-emerald-50 text-emerald-700",
            icon: "₹",
            page: "Reports",
          },
          {
            label: "Today's Expenses",
            value: `₹${report.expense_summary.total.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`,
            description: `${report.expense_summary.count} recorded transactions`,
            color: "bg-rose-50 text-rose-700",
            icon: "↘",
            page: "Expenses",
          },
          {
            label: "Low Stock Items",
            value: report.inventory_summary.low_stock_items.toLocaleString(),
            description: `${report.inventory_summary.total_items} tracked items`,
            color: "bg-amber-50 text-amber-700",
            icon: "▣",
            page: "Inventory",
          },
          {
            label: "Pending Purchase Orders",
            value: report.purchase_summary.pending.toLocaleString(),
            description: `${report.purchase_summary.orders} total purchase orders`,
            color: "bg-blue-50 text-blue-700",
            icon: "▧",
            page: "Purchase Orders",
          },
          {
            label: "Active Menu Items",
            value: report.menu_summary.active_items.toLocaleString(),
            description: "Available menu choices",
            color: "bg-indigo-50 text-indigo-700",
            icon: "☷",
            page: "Menu",
          },
          {
            label: "Votes for Tomorrow",
            value: report.voting_summary.votes_for_tomorrow.toLocaleString(),
            description: `${report.voting_summary.eligible_options} eligible choices · ${report.voting_summary.target_date}`,
            color: "bg-violet-50 text-violet-700",
            icon: "🗳️",
            page: "Menu Voting",
          },
          {
            label: "Food Rating Average",
            value: report.rating_summary.average.toFixed(1),
            description: `${report.rating_summary.count} completed-order ratings`,
            color: "bg-amber-50 text-amber-700",
            icon: "★",
            page: "Ratings",
          },
        ]);
        setRecentOrders(orders.slice(0, 5));
    } catch (requestError) {
      if (requestId !== dashboardRequestId.current) return;
      setDashboardError(requestError instanceof Error ? requestError.message : "Unable to load dashboard data.");
      setStats([]);
      setSalesSeries([]);
      setStatusCounts({});
      setRecentOrders([]);
    } finally {
      if (requestId === dashboardRequestId.current) setDashboardLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId) return;
    let disposed = false;
    let socket: WebSocket | null = null;
    let reconnectTimer = 0;
    let reconnectDelay = 3000;
    const pollTimer = window.setInterval(() => {
      if (!disposed) void refreshDashboard();
    }, 30_000);

    const connect = () => {
      if (disposed) return;
      const scheme = window.location.protocol === "https:" ? "wss:" : "ws:";
      socket = new WebSocket(
        `${scheme}//${window.location.host}/ws/orders/?restaurant_id=${restaurantId}`,
      );
      socket.onopen = () => {
        if (disposed) return;
        reconnectDelay = 3000;
        setDashboardConnection("live");
        void refreshDashboard();
      };
      socket.onmessage = () => {
        if (!disposed) void refreshDashboard();
      };
      socket.onclose = (event) => {
        if (disposed) return;
        setDashboardConnection("polling");
        if (event.code === 4401 || event.code === 4403 || event.code === 1008) return;
        reconnectTimer = window.setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, 30_000);
      };
      socket.onerror = () => socket?.close();
    };

    const initialRefreshTimer = window.setTimeout(() => {
      void refreshDashboard();
    }, 0);
    connect();
    return () => {
      disposed = true;
      window.clearTimeout(initialRefreshTimer);
      window.clearInterval(pollTimer);
      window.clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [restaurantId, refreshDashboard]);

  return (
    <div className="space-y-8">
      {/* Welcome Hero Banner with RVCE Canteen branding */}
      <section className="relative overflow-hidden rounded-3xl border-2 border-amber-500/30 bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <p className="text-xs font-black uppercase tracking-widest text-amber-400">
            RV College of Engineering • Campus Food Court Operations
          </p>
        </div>

        <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h3 className="text-2xl font-black text-white sm:text-4xl">
              Canteen Management Dashboard
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Live orders, kitchen workflow, inventory controls, and student opinions for tomorrow's menu.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onNavigate("Menu Voting")}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:brightness-110 active:scale-95"
            >
              <span>🗳️ Tomorrow's Menu Decisions</span>
              <span>→</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate("POS")}
              className="flex items-center gap-2 rounded-2xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-amber-400/25 transition hover:brightness-110 active:scale-95"
            >
              <span>₹ Open POS Counter</span>
            </button>
          </div>
        </div>
      </section>

      {/* Flagship: Tomorrow's Menu Student Opinion Card for Admin */}
      <section className="rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-r from-slate-900 via-emerald-950/20 to-slate-900 p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-3xl font-black text-emerald-400 border border-emerald-400/40">
              🗳️
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-400/20 border border-emerald-400/40 px-2.5 py-0.5 text-[10px] font-black uppercase text-emerald-300">
                  Student Poll
                </span>
                <p className="text-xs font-bold text-slate-400">Main Kiosk Theme</p>
              </div>
              <h4 className="mt-1 text-2xl font-black text-white">Tomorrow's Menu Decisions</h4>
              <p className="text-xs text-slate-300">
                Students are actively voting Like 👍 / Dislike 👎 on candidate dishes for tomorrow.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate("Menu Voting")}
            className="rounded-2xl border-2 border-emerald-400 bg-emerald-500 px-6 py-3.5 text-base font-black text-slate-950 shadow-xl shadow-emerald-500/30 hover:brightness-110 transition active:scale-95"
          >
            Review Student Votes & Approve Dishes →
          </button>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-xl font-black text-white">
              Today's Live Overview
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              Live order status and business metrics for the selected active restaurant.
            </p>
            <p className="mt-1 text-xs font-bold text-amber-400" aria-live="polite">
              ● {dashboardConnection === "live" ? "Live order updates connected" : dashboardConnection === "polling" ? "Live updates polling active" : "Connecting..."}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Canteen Outlet
              <select
                className="mt-1 block min-w-56 rounded-xl border border-white/20 bg-slate-900 px-4 py-3 text-sm font-bold text-white outline-none focus:border-amber-400"
                value={restaurantId ?? ""}
                onChange={(event) => {
                  setDashboardLoading(true);
                  setDashboardError("");
                  const selectedId = Number(event.target.value);
                  storeSelectedRestaurantId(selectedId);
                  setRestaurantId(selectedId);
                }}
                disabled={!restaurants.length}
              >
                {restaurants.map((restaurant) => (
                  <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => void refreshDashboard()}
              disabled={!restaurantId || dashboardLoading}
              className="rounded-xl border border-white/20 bg-slate-800 px-4 py-3 text-sm font-bold text-white hover:bg-slate-700 disabled:opacity-60"
            >
              {dashboardLoading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        {dashboardError && (
          <p role="alert" className="mb-4 rounded-2xl border border-rose-500 bg-rose-950/80 p-4 text-sm font-bold text-rose-300">
            {dashboardError}
          </p>
        )}

        {dashboardLoading ? (
          <p className="rounded-3xl border border-white/10 bg-slate-900/80 p-12 text-center text-lg font-bold text-slate-400 backdrop-blur">
            Loading today's dashboard…
          </p>
        ) : restaurants.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-white/20 bg-slate-900/80 p-12 text-center text-slate-400">
            No active restaurant access is available.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {stats.map((stat) => (
              <button
                key={stat.label}
                type="button"
                onClick={() => onNavigate(stat.page)}
                className="rounded-3xl border border-white/15 bg-slate-900/90 p-6 text-left shadow-xl backdrop-blur-xl transition hover:border-amber-400 hover:scale-[1.01]"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {stat.label}
                  </p>

                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-slate-800 text-xl font-bold text-amber-400"
                  >
                    {stat.icon}
                  </div>
                </div>

                <p className="mt-4 text-4xl font-black tracking-tight text-white">
                  {stat.value}
                </p>

                <p className="mt-2 text-xs text-slate-400">
                  {stat.description}
                </p>
              </button>
            ))}
          </div>
        )}

        {!dashboardLoading && stats.length > 0 && (
          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <section className="rounded-3xl border border-white/15 bg-slate-900/90 p-6 shadow-xl backdrop-blur-xl">
              <h4 className="text-lg font-black text-white">Sales Revenue · Last 7 Days</h4>
              <div
                role="img"
                aria-label="Daily sales totals for the last seven days"
                className="mt-6 flex h-44 items-end justify-around gap-3 border-b border-white/10 pb-3"
              >
                {salesSeries.map((point) => {
                  const highest = Math.max(...salesSeries.map((item) => item.value), 1);
                  const height = Math.max(6, (point.value / highest) * 100);
                  return (
                    <div key={point.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                      <div
                        title={`₹${point.value.toLocaleString("en-IN")}`}
                        className="w-full max-w-10 rounded-t-xl bg-gradient-to-t from-amber-600 to-amber-400 shadow-lg shadow-amber-500/20"
                        style={{ height: `${height}%` }}
                      />
                      <span className="text-xs font-bold text-slate-400">{point.label}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-3xl border border-white/15 bg-slate-900/90 p-6 shadow-xl backdrop-blur-xl">
              <h4 className="text-lg font-black text-white">Orders by Status · Today</h4>
              <div className="mt-6 flex flex-wrap gap-2.5">
                {Object.entries(statusCounts).map(([orderStatus, count]) => (
                  <span key={orderStatus} className="rounded-2xl border border-white/15 bg-slate-950/80 px-4 py-2.5 text-xs font-bold text-amber-300">
                    {orderStatus.replaceAll("_", " ")}: <strong className="text-white text-sm">{count}</strong>
                  </span>
                ))}
              </div>
            </section>
          </div>
        )}
      </section>

      {/* Quick Actions Grid */}
      <section>
        <h3 className="text-xl font-black text-white">
          Operations & Management Modules
        </h3>
        <p className="mt-1 text-sm text-slate-400">
          Jump to key canteen control sections.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "Tomorrow's Menu Poll",
              description: "Review student likes/dislikes & approve dishes to cook tomorrow.",
              action: "Open voting admin",
              page: "Menu Voting",
              symbol: "🗳️",
              highlight: true,
            },
            {
              title: "POS Counter Terminal",
              description: "Rapid counter ordering, bill generation, and token printing.",
              action: "Open POS",
              page: "POS",
              symbol: "₹",
            },
            {
              title: "Kitchen Display (KDS)",
              description: "Live kitchen order tickets for preparation and status dispatch.",
              action: "Open kitchen",
              page: "Kitchen Display",
              symbol: "🍳",
            },
            {
              title: "Live Token Board",
              description: "Customer-facing display showing Preparing and Ready tokens.",
              action: "Open display",
              page: "Live Display",
              symbol: "📟",
            },
            {
              title: "Menu Items",
              description: "Maintain items, prices, descriptions & dish photos.",
              action: "Open menu",
              page: "Menu",
              symbol: "🍲",
            },
            {
              title: "Menu Categories",
              description: "Organize items into Breakfast, Lunch, Snacks, etc.",
              action: "Open categories",
              page: "Categories",
              symbol: "📂",
            },
            {
              title: "Inventory & Stock",
              description: "Monitor ingredient quantities, adjustments, and wastage.",
              action: "Open inventory",
              page: "Inventory",
              symbol: "📦",
            },
            {
              title: "Customer Ratings",
              description: "Inspect customer dish feedback and star ratings.",
              action: "Open ratings",
              page: "Ratings",
              symbol: "⭐",
            },
            {
              title: "Reports & Analytics",
              description: "Revenue reports, sales breakdown, and export CSV.",
              action: "Open reports",
              page: "Reports",
              symbol: "📊",
            },
          ].map((item) => (
            <button
              key={item.page}
              onClick={() => onNavigate(item.page)}
              className={`rounded-3xl border p-6 text-left shadow-xl transition-all duration-200 hover:-translate-y-1 ${
                item.highlight
                  ? "border-emerald-400/80 bg-gradient-to-b from-slate-900 to-emerald-950/30 hover:border-emerald-400 shadow-[0_10px_30px_rgba(16,185,129,0.2)]"
                  : "border-white/15 bg-slate-900/90 hover:border-amber-400"
              }`}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-2xl text-amber-400 border border-white/10">
                {item.symbol}
              </span>

              <h4 className="mt-4 text-xl font-black text-white">
                {item.title}
              </h4>

              <p className="mt-1.5 min-h-10 text-xs font-medium leading-relaxed text-slate-300">
                {item.description}
              </p>

              <span className="mt-4 inline-block text-xs font-black uppercase tracking-wider text-amber-400">
                {item.action} →
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Recent Orders Section */}
      <section className="rounded-3xl border border-white/15 bg-slate-900/90 p-6 shadow-xl backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <h3 className="text-xl font-black text-white">Recent Orders</h3>
            <p className="mt-1 text-xs text-slate-400">
              Live orders placed through customer kiosk, online, or POS.
            </p>
          </div>

          <button
            onClick={() => onNavigate("Orders")}
            className="rounded-xl border border-white/20 bg-slate-800 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-700"
          >
            View all orders →
          </button>
        </div>

        {dashboardLoading ? (
          <p className="mt-5 py-6 text-center text-sm text-slate-400">Loading orders…</p>
        ) : recentOrders.length === 0 ? (
          <p className="mt-5 rounded-2xl border border-dashed border-white/15 bg-slate-950/50 px-5 py-10 text-center text-sm text-slate-400">
            No orders have been placed for this canteen yet.
          </p>
        ) : (
          <ul className="mt-5 divide-y divide-white/5">
            {recentOrders.map((order) => (
              <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                <span className="font-mono font-black text-amber-400">#{order.order_number.slice(0, 8).toUpperCase()}</span>
                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-slate-200 border border-white/10">{order.status}</span>
                <span className="font-bold text-white">₹{Number(order.total_amount).toFixed(2)}</span>
                <time className="text-xs text-slate-400">{new Date(order.created_at).toLocaleTimeString()}</time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default App;
