
import { useEffect, useState } from "react";
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
      <Route path="/" element={<Navigate to="/order" replace />} />
      <Route path="/order" element={<CustomerOrdering />} />
      <Route path="/live-display" element={<LiveOrderDisplay />} />
      <Route path="/menu-voting" element={<MenuVoting />} />
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
  summary: { revenue: number; orders: number; average_order_value: number; pending_orders: number };
  status_counts: Record<string, number>;
  sales_series: { label: string; value: number }[];
  inventory_summary: { low_stock_items: number; total_items: number };
  menu_summary: { active_items: number };
  purchase_summary: { orders: number; pending: number; receipts: number };
  voting_summary: { eligible_options: number; votes_today: number };
};
type DashboardOrder = {
  id: number;
  order_number: string;
  status: string;
  total_amount: string;
  created_at: string;
};

function Dashboard({ onNavigate }: DashboardProps) {
  const [restaurants, setRestaurants] = useState<{ id: number; name: string }[]>([]);
  const [restaurantId, setRestaurantId] = useState<number | null>(null);
  const [stats, setStats] = useState<DashboardStat[]>([]);
  const [salesSeries, setSalesSeries] = useState<{ label: string; value: number }[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [recentOrders, setRecentOrders] = useState<DashboardOrder[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");

  useEffect(() => {
    void apiRequest<{ id: number; name: string }[]>("/restaurants/?include_inactive=true")
      .then((data) => {
        setRestaurants(data);
        setRestaurantId(data[0]?.id ?? null);
        if (data.length === 0) setDashboardLoading(false);
      })
      .catch((requestError: unknown) => {
        setDashboardError(requestError instanceof Error ? requestError.message : "Unable to load restaurant access.");
        setDashboardLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!restaurantId) {
      return;
    }

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    void Promise.all([
      apiRequest<DashboardReport>(`/reports/summary/?restaurant_id=${restaurantId}&start_date=${today}&end_date=${today}`),
      apiRequest<DashboardOrder[]>(`/orders/?restaurant_id=${restaurantId}`),
    ])
      .then(([report, orders]) => {
        setSalesSeries(report.sales_series);
        setStatusCounts(report.status_counts);
        setStats([
          {
            label: "Today's Orders",
            value: report.summary.orders.toLocaleString(),
            description: `${report.summary.pending_orders} pending`,
            color: "bg-violet-50 text-violet-700",
            icon: "▤",
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
            label: "Today's Menu Votes",
            value: report.voting_summary.votes_today.toLocaleString(),
            description: `${report.voting_summary.eligible_options} eligible choices`,
            color: "bg-orange-50 text-orange-700",
            icon: "🗳️",
            page: "Menu Voting",
          },
        ]);
        setRecentOrders(orders.slice(0, 5));
      })
      .catch((requestError: unknown) => {
        setDashboardError(requestError instanceof Error ? requestError.message : "Unable to load dashboard data.");
        setStats([]);
        setSalesSeries([]);
        setStatusCounts({});
        setRecentOrders([]);
      })
      .finally(() => setDashboardLoading(false));
  }, [restaurantId, restaurants.length]);

  return (
    <div className="space-y-8">
      {/* Welcome section */}
      <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-violet-700 to-indigo-700 p-7 text-white shadow-sm sm:p-9">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-violet-200">
            RESTAURANT OPERATIONS
          </p>

          <h3 className="mt-3 text-2xl font-bold sm:text-3xl">
            Welcome to your workspace
          </h3>

          <p className="mt-3 max-w-xl text-sm leading-6 text-violet-100">
            Monitor live restaurant activity and open your operational modules from one workspace.
          </p>

          <button
            onClick={() => onNavigate("Restaurants")}
            className="mt-6 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
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
              Sales, stock, purchase orders, and voting for the selected restaurant.
            </p>
          </div>
          <label className="text-sm font-semibold text-slate-700">
            Restaurant
            <select
              className="ml-2 rounded-lg border border-slate-300 bg-white px-3 py-2"
              value={restaurantId ?? ""}
              onChange={(event) => {
                setDashboardLoading(true);
                setDashboardError("");
                setRestaurantId(Number(event.target.value));
              }}
              disabled={!restaurants.length}
            >
              {restaurants.map((restaurant) => (
                <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>
              ))}
            </select>
          </label>
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
        ) : stats.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
            No restaurant access or dashboard data is available for this account.
          </p>
        ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {stats.map((stat) => (
            <button
              key={stat.label}
              type="button"
              onClick={() => onNavigate(stat.page)}
              className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
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

              <p className="mt-2 text-xs text-slate-400">
                {stat.description}
              </p>
            </button>
          ))}
        </div>
        )}
        {!dashboardLoading && stats.length > 0 && (
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
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
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h4 className="font-bold text-slate-900">Orders by status · today</h4>
            <div className="mt-4 flex flex-wrap gap-2">
              {Object.entries(statusCounts).map(([orderStatus, count]) => (
                <span key={orderStatus} className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
                  {orderStatus}: {count}
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
