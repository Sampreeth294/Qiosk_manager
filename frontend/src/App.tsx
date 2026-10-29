
import { useState } from "react";

function App() {
  const [activePage, setActivePage] = useState("Dashboard");

  const menuItems = [
    "Dashboard",
    "Orders",
    "Menu",
    "Categories",
    "Inventory",
    "Settings",
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside className="fixed inset-y-0 left-0 w-64 bg-slate-950 p-6 text-white">
        <h1 className="text-2xl font-bold">Qiosk Manager</h1>
        <p className="mt-2 text-sm text-slate-400">
          Restaurant Management
        </p>

        <nav className="mt-10 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item}
              onClick={() => setActivePage(item)}
              className={`block w-full rounded-lg px-4 py-3 text-left ${
                activePage === item
                  ? "bg-violet-600 text-white"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              {item}
            </button>
          ))}
        </nav>
      </aside>

      <main className="ml-64 p-8">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">{activePage}</h2>
            <p className="mt-1 text-slate-500">
              Manage your restaurant from one place.
            </p>
          </div>

          <span className="rounded-full bg-white px-4 py-2 shadow-sm">
            Admin
          </span>
        </header>

        {activePage === "Dashboard" ? (
          <>
            <section className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "Today's Orders",
                  value: "0",
                  color: "text-violet-600",
                },
                {
                  label: "Today's Revenue",
                  value: "₹0.00",
                  color: "text-emerald-600",
                },
                {
                  label: "Menu Items",
                  value: "0",
                  color: "text-blue-600",
                },
                {
                  label: "Low Stock Items",
                  value: "0",
                  color: "text-amber-600",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <p className="text-sm text-slate-500">{stat.label}</p>
                  <p className={`mt-4 text-3xl font-bold ${stat.color}`}>
                    {stat.value}
                  </p>
                </div>
              ))}
            </section>

            <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold">Recent Orders</h3>
              <p className="mt-2 text-slate-500">
                Orders will appear here when we connect the dashboard to Django.
              </p>
              <div className="mt-6 rounded-lg bg-slate-50 p-8 text-center text-slate-400">
                No orders yet
              </div>
            </section>
          </>
        ) : (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h3 className="text-xl font-semibold">
              {activePage} Management
            </h3>
            <p className="mt-2 text-slate-500">
              This section will be implemented in the next development steps.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
