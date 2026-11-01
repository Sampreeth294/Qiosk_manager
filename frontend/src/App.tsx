
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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-slate-800 bg-slate-950 text-white">
        <div className="border-b border-slate-800 px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600 text-xl font-bold">
              Q
            </div>

            <div>
              <h1 className="text-lg font-bold tracking-tight">
                Qiosk Manager
              </h1>
              <p className="mt-1 text-xs text-slate-400">
                Restaurant operations
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-7 overflow-y-auto px-4 py-6">
          {["OVERVIEW", "MANAGEMENT", "FINANCE", "MARKETING", "SYSTEM"].map((group) => (
            <div key={group}>
              <p className="mb-3 px-3 text-[10px] font-bold tracking-[0.18em] text-slate-500">
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
                        className={`flex w-full items-center gap-3 rounded-xl  px-3 py-3 text-left text-sm font-medium transition ${
                          isActive
                            ? "bg-violet-600 text-white shadow-lg shadow-violet-950/30"
                            : "text-slate-400 hover:bg-slate-800 hover:text-white"
                        }`}
                      >
                        <span className="flex h-6 w-6 items-center justify-center text-lg">
                          {item.symbol}
                        </span>

                        <span>{item.name}</span>

                        {isActive && (
                          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white" />
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-800 p-4">
          <div className="rounded-xl bg-slate-900 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500/20 text-sm font-bold text-violet-300">
                {user?.username.slice(0, 1).toUpperCase() ?? "?"}
              </div>

              <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {user?.username ?? "Signed in"}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Staff session
              </p>
            </div>
            </div>
            <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={loggingOut}
            className="mt-3 w-full rounded-lg border border-slate-700 px-3 py-2 text-left text-xs font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-50"
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
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-8 py-5 backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Qiosk Manager</span>
                <span>/</span>
                <span className="font-medium text-violet-600">
                  {activePage}
                </span>
              </div>

              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                {activePage}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {pageDescriptions[activePage]}
              </p>
            </div>

            <div className="hidden items-center gap-3 sm:flex">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2">
                <p className="text-xs text-slate-500">Workspace</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-800">
                  Admin panel
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="p-5 sm:p-8">
          {renderPage()}
        </div>

        <footer className="px-8 pb-6 text-center text-xs text-slate-400">
          Qiosk Manager · Restaurant Management System
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
      {/* Welcome section */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-bold uppercase tracking-wide text-violet-700">Restaurant operations</p>
        <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h3 className="text-2xl font-bold text-slate-900 sm:text-3xl">Welcome to your workspace</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Monitor restaurant activity and open operational modules from one workspace.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("Restaurants")}
            className="shrink-0 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-700"
          >
            Manage restaurants →
          </button>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Today's business overview
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Live order status and business metrics for the selected active restaurant.
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500" aria-live="polite">
              {dashboardConnection === "live" ? "Live order updates connected" : dashboardConnection === "polling" ? "Live updates unavailable · refreshing every 30 seconds" : "Connecting to live order updates"}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="text-sm font-semibold text-slate-700">
              Restaurant
              <select
                className="mt-1 block min-w-56 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-violet-500"
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
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {dashboardLoading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        {dashboardError && (
          <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {dashboardError}
          </p>
        )}
        {dashboardLoading ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">
            Loading today's dashboard…
          </p>
        ) : restaurants.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
            {dashboardError
              ? "Restaurant access could not be loaded. Retry after checking your connection."
              : "No active restaurant access is available. Ask an owner to activate a restaurant membership."}
          </p>
        ) : dashboardError ? (
          <div className="rounded-2xl border border-dashed border-rose-200 bg-white p-8 text-center text-slate-600">
            Dashboard data is unavailable. Use Refresh to try again.
          </div>
        ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {stats.map((stat) => (
            <button
              key={stat.label}
              type="button"
              onClick={() => onNavigate(stat.page)}
              className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-violet-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-slate-500">
                  {stat.label}
                </p>

                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg font-bold ${stat.color}`}
                >
                  {stat.icon}
                </div>
              </div>

              <p className="mt-5 text-3xl font-bold tracking-tight text-slate-900">
                {stat.value}
              </p>

              <p className="mt-2 text-xs text-slate-500">
                {stat.description}
              </p>
            </button>
          ))}
        </div>
        )}
        {!dashboardLoading && stats.length > 0 && (
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h4 className="font-bold text-slate-900">Sales · last 7 days</h4>
            <div
              role="img"
              aria-label="Daily sales totals for the last seven days"
              className="mt-5 flex h-40 items-end justify-around gap-3 border-b border-slate-200 pb-2"
            >
              {salesSeries.map((point) => {
                const highest = Math.max(...salesSeries.map((item) => item.value), 1);
                const height = Math.max(4, (point.value / highest) * 100);
                return (
                  <div key={point.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                    <div
                      title={`₹${point.value.toLocaleString("en-IN")}`}
                      className="w-full max-w-10 rounded-t-md bg-violet-500"
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-xs text-slate-500">{point.label}</span>
                  </div>
                );
              })}
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h4 className="font-bold text-slate-900">Orders by status · today</h4>
            <div className="mt-4 flex flex-wrap gap-2">
              {Object.entries(statusCounts).map(([orderStatus, count]) => (
                <span key={orderStatus} className="rounded-full bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700">
                  {orderStatus.replaceAll("_", " ")}: {count}
                </span>
              ))}
            </div>
          </section>
        </div>
        )}
      </section>

      {/* Quick actions */}
      <section>
        <h3 className="text-lg font-bold text-slate-900">
          Quick actions
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Jump to your existing management pages.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            {
              title: "Restaurants",
              description: "Manage restaurant details and locations.",
              action: "Open restaurants",
              page: "Restaurants",
              symbol: "⌂",
            },
            {
              title: "Menu management",
              description: "Maintain items, prices, and availability.",
              action: "Open menu",
              page: "Menu",
              symbol: "☷",
            },
            {
              title: "Categories",
              description: "Organize items into menu categories.",
              action: "Open categories",
              page: "Categories",
              symbol: "▧",
            },
          ].map((item) => (
            <button
              key={item.page}
              onClick={() => onNavigate(item.page)}
              className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-violet-300 hover:shadow-md"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-xl text-violet-700">
                {item.symbol}
              </span>

              <h4 className="mt-4 font-bold text-slate-900">
                {item.title}
              </h4>

              <p className="mt-2 min-h-10 text-sm leading-5 text-slate-500">
                {item.description}
              </p>

              <span className="mt-4 inline-block text-sm font-semibold text-violet-700">
                {item.action} →
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Orders placeholder */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900">Recent orders</h3>
            <p className="mt-1 text-sm text-slate-500">
              Most recently created orders for the selected restaurant.
            </p>
          </div>

          <button
            onClick={() => onNavigate("Orders")}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            View orders →
          </button>
        </div>

        {dashboardLoading ? (
          <p className="mt-5 py-6 text-center text-sm text-slate-500">Loading orders…</p>
        ) : recentOrders.length === 0 ? (
          <p className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
            No orders have been placed for this restaurant yet.
          </p>
        ) : (
          <ul className="mt-5 divide-y divide-slate-100">
            {recentOrders.map((order) => (
              <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="font-semibold">#{order.order_number.slice(0, 8).toUpperCase()}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{order.status}</span>
                <span className="text-sm text-slate-600">₹{Number(order.total_amount).toFixed(2)}</span>
                <time className="text-xs text-slate-500">{new Date(order.created_at).toLocaleTimeString()}</time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default App;
