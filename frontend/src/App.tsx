
import { useState } from "react";
import MenuPage from "./pages/Menu";
import Categories from "./pages/Categories";
import Restaurants from "./pages/Restaurants";
import Orders from "./pages/Orders";
import Settings from "./pages/Settings";
import Reports from "./pages/Reports";
import KitchenDisplay from "./pages/KitchenDisplay";
import CustomerOrdering from "./pages/CustomerOrdering";
import POS from "./pages/POS";
import MenuVoting from "./pages/MenuVoting";
import CustomerRatings from "./pages/CustomerRatings";
import LiveOrderDisplay from "./pages/LiveOrderDisplay";
import Inventory from "./pages/Inventory";

const navigation = [

{ name: "Dashboard", symbol: "▦", group: "OVERVIEW" },
  { name: "Orders", symbol: "▤", group: "OVERVIEW" },
  { name: "Kitchen Display", symbol: "🍳", group: "OVERVIEW" },
  { name: "Live Display", symbol: "📺", group: "OVERVIEW" },
  { name: "Customer Ordering", symbol: "🛒", group: "OVERVIEW" },
  { name: "POS", symbol: "₹", group: "OVERVIEW" },
  { name: "Restaurants", symbol: "⌂", group: "MANAGEMENT" },
  { name: "Menu", symbol: "☷", group: "MANAGEMENT" },
  { name: "Categories", symbol: "▧", group: "MANAGEMENT" },
  { name: "Inventory", symbol: "▣", group: "MANAGEMENT" },
  { name: "Menu Voting", symbol: "🗳️", group: "MANAGEMENT" },
  { name: "Ratings", symbol: "⭐", group: "MANAGEMENT" },
  { name: "Reports", symbol: "📊", group: "MANAGEMENT" },
  { name: "Settings", symbol: "⚙", group: "SYSTEM" },
  { name: "Inventory", symbol: "▣", group: "MANAGEMENT" },
];

function App() {
  const [activePage, setActivePage] = useState("Dashboard");

  const pageDescriptions: Record<string, string> = {
    Dashboard: "Here's what's happening at your restaurant today.",
    Orders: "View and manage customer orders.",
    Restaurants: "Manage your restaurant locations and details.",
    Menu: "Manage menu items, prices, and availability.",
    Categories: "Organize your menu into categories.",
    Inventory: "Monitor stock levels and inventory.",
    Settings: "Manage your application preferences.",
  };

  const renderPage = () => {
    switch (activePage) {
      case "Dashboard":
        return <Dashboard onNavigate={setActivePage} />;

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
      case "KitchenDisplay":
        return <KitchenDisplay />;  
      case "CustomerOrdering":
        return <CustomerOrdering />;  
      case "POS":
        return <POS />; 
      case "MenuVoting":
        return <MenuVoting />;
      case "CustomerRatings":
        return <CustomerRatings />;  
      case "LiveOrderDisplay":
        return <LiveOrderDisplay />;  
      case "Inventory": 
        return <Inventory />;

    

        return (
          <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-2xl text-violet-700">
              {navigation.find((item) => item.name === activePage)?.symbol}
            </div>

            <h3 className="mt-5 text-xl font-bold text-slate-900">
              {activePage} Management
            </h3>

            <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">
              This module is not implemented yet. It will be connected
              to the existing project APIs as development continues.
            </p>
          </section>
        );

      default:
        return null;
    }
  };

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
          {["OVERVIEW", "MANAGEMENT", "SYSTEM"].map((group) => (
            <div key={group}>
              <p className="mb-3 px-3 text-[10px] font-bold tracking-[0.18em] text-slate-500">
                {group}
              </p>

              <div className="space-y-1">
                {navigation
                  .filter((item) => item.group === group)
                  .map((item) => {
                    const isActive = activePage === item.name;

                    return (
                      <button
                        key={item.name}
                        onClick={() => setActivePage(item.name)}
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
                A
              </div>

              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">Administrator</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Management workspace
                </p>
              </div>
            </div>
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

type DashboardProps = {
  onNavigate: (page: string) => void;
};

function Dashboard({ onNavigate }: DashboardProps) {
  const stats = [
    {
      label: "Today's Orders",
      value: "—",
      description: "Awaiting API integration",
      color: "bg-violet-50 text-violet-700",
      icon: "▤",
    },
    {
      label: "Today's Revenue",
      value: "—",
      description: "Awaiting API integration",
      color: "bg-emerald-50 text-emerald-700",
      icon: "₹",
    },
    {
      label: "Menu Items",
      value: "—",
      description: "Awaiting live count",
      color: "bg-blue-50 text-blue-700",
      icon: "☷",
    },
    {
      label: "Low Stock Items",
      value: "—",
      description: "Inventory module pending",
      color: "bg-amber-50 text-amber-700",
      icon: "▣",
    },
  ];

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
            Manage your restaurants, organize your menu, and prepare
            your operations for customer orders from one place.
          </p>

          <button
            onClick={() => onNavigate("Restaurants")}
            className="mt-6 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
          >
            Manage restaurants →
          </button>
        </div>
      </section>

      {/* Statistics */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Business overview
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Live statistics will appear after integration.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <article
              key={stat.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
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
            </article>
          ))}
        </div>
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
              The order list has not been connected to live data yet.
            </p>
          </div>

          <button
            onClick={() => onNavigate("Orders")}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            View orders →
          </button>
        </div>

        <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl text-slate-400 shadow-sm">
            ▤
          </div>

          <p className="mt-3 text-sm font-semibold text-slate-700">
            No live order data displayed
          </p>

          <p className="mt-1 text-xs text-slate-500">
            This section needs API integration before it can show real orders.
          </p>
        </div>
      </section>
    </div>
  );
}

export default App;
