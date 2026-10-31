
import { useEffect, useState } from "react";

type DisplayOrder = {
  id: number;
  orderNumber: string;
  items: string[];
  status: "Preparing" | "Ready";
  createdAt: string;
};

const initialOrders: DisplayOrder[] = [
  {
    id: 1,
    orderNumber: "104",
    items: ["Paneer Butter Masala", "Jeera Rice"],
    status: "Ready",
    createdAt: "10:42 AM",
  },
  {
    id: 2,
    orderNumber: "105",
    items: ["Masala Dosa", "Filter Coffee"],
    status: "Preparing",
    createdAt: "10:45 AM",
  },
  {
    id: 3,
    orderNumber: "106",
    items: ["Veg Biryani", "Raita"],
    status: "Preparing",
    createdAt: "10:47 AM",
  },
  {
    id: 4,
    orderNumber: "107",
    items: ["Idli Sambar"],
    status: "Ready",
    createdAt: "10:49 AM",
  },
  {
    id: 5,
    orderNumber: "108",
    items: ["Veg Fried Rice", "Lime Soda"],
    status: "Preparing",
    createdAt: "10:51 AM",
  },
  {
    id: 6,
    orderNumber: "109",
    items: ["Chole Bhature"],
    status: "Preparing",
    createdAt: "10:53 AM",
  },
];

export default function LiveOrderDisplay() {
  const [orders, setOrders] = useState(initialOrders);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [completedOrders, setCompletedOrders] = useState<string[]>([]);
  const [showDemoControls, setShowDemoControls] = useState(true);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const preparingOrders = orders.filter(
    (order) =>
      order.status === "Preparing" &&
      !completedOrders.includes(order.orderNumber)
  );

  const readyOrders = orders.filter(
    (order) =>
      order.status === "Ready" &&
      !completedOrders.includes(order.orderNumber)
  );

  function markAsReady(orderNumber: string) {
    setOrders((current) =>
      current.map((order) =>
        order.orderNumber === orderNumber
          ? { ...order, status: "Ready" }
          : order
      )
    );
  }

  function markAsCollected(orderNumber: string) {
    setCompletedOrders((current) =>
      current.includes(orderNumber)
        ? current
        : [...current, orderNumber]
    );
  }

  function addDemoOrder() {
    const nextNumber =
      Math.max(
        109,
        ...orders.map((order) => Number(order.orderNumber))
      ) + 1;

    const newOrder: DisplayOrder = {
      id: Date.now(),
      orderNumber: String(nextNumber),
      items: ["Veg Sandwich", "Fresh Juice"],
      status: "Preparing",
      createdAt: new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setOrders((current) => [...current, newOrder]);
  }

  function resetDemo() {
    setOrders(initialOrders);
    setCompletedOrders([]);
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-white sm:p-6 lg:p-8">
      {/* Header */}
      <header className="flex flex-col justify-between gap-4 border-b border-slate-800 pb-6 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 animate-pulse rounded-full bg-green-400" />
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-400">
              Order Status
            </p>
          </div>

          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
            Your meal is on its way!
          </h1>

          <p className="mt-2 text-slate-400">
            Please check your order number below.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 sm:text-right">
          <p className="text-sm text-slate-400">Current time</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">
            {currentTime.toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {currentTime.toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "short",
            })}
          </p>
        </div>
      </header>

      {/* Order columns */}
      <main className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Preparing */}
        <section className="overflow-hidden rounded-2xl border border-blue-900 bg-slate-900">
          <div className="flex items-center justify-between bg-blue-600 px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-2xl font-black sm:text-3xl">
                Preparing
              </h2>
              <p className="mt-1 text-sm text-blue-100">
                Your order is being prepared
              </p>
            </div>

            <span className="flex h-12 min-w-12 items-center justify-center rounded-xl bg-white text-xl font-black text-blue-700">
              {preparingOrders.length}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
            {preparingOrders.map((order) => (
              <article
                key={order.id}
                className="rounded-xl border border-slate-700 bg-slate-800 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Order number
                    </p>
                    <p className="mt-1 text-4xl font-black">
                      #{order.orderNumber}
                    </p>
                  </div>
                  <span className="text-3xl">👨‍🍳</span>
                </div>

                <div className="mt-4 border-t border-slate-700 pt-3">
                  <p className="text-sm font-semibold text-slate-300">
                    Order items
                  </p>
                  <ul className="mt-2 space-y-1">
                    {order.items.map((item) => (
                      <li
                        key={item}
                        className="text-sm text-slate-400"
                      >
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <p className="mt-4 text-xs text-slate-500">
                  Received at {order.createdAt}
                </p>

                {showDemoControls && (
                  <button
                    onClick={() => markAsReady(order.orderNumber)}
                    className="mt-4 w-full rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-bold hover:bg-blue-500"
                  >
                    Mark as Ready
                  </button>
                )}
              </article>
            ))}

            {preparingOrders.length === 0 && (
              <p className="col-span-full py-10 text-center text-slate-400">
                No orders are being prepared.
              </p>
            )}
          </div>
        </section>

        {/* Ready */}
        <section className="overflow-hidden rounded-2xl border border-green-900 bg-slate-900">
          <div className="flex items-center justify-between bg-green-600 px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-2xl font-black sm:text-3xl">
                Ready for Pickup
              </h2>
              <p className="mt-1 text-sm text-green-100">
                Please collect your order
              </p>
            </div>

            <span className="flex h-12 min-w-12 items-center justify-center rounded-xl bg-white text-xl font-black text-green-700">
              {readyOrders.length}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
            {readyOrders.map((order) => (
              <article
                key={order.id}
                className="rounded-xl border border-green-800 bg-green-950/40 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-green-300">
                      Order number
                    </p>
                    <p className="mt-1 text-4xl font-black">
                      #{order.orderNumber}
                    </p>
                  </div>
                  <span className="text-3xl">🔔</span>
                </div>

                <div className="mt-4 border-t border-green-900 pt-3">
                  <p className="text-sm font-semibold text-green-200">
                    Order items
                  </p>
                  <ul className="mt-2 space-y-1">
                    {order.items.map((item) => (
                      <li
                        key={item}
                        className="text-sm text-green-100/80"
                      >
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <p className="mt-4 text-xs text-green-300/70">
                  Received at {order.createdAt}
                </p>

                {showDemoControls && (
                  <button
                    onClick={() => markAsCollected(order.orderNumber)}
                    className="mt-4 w-full rounded-lg bg-green-500 px-3 py-2.5 text-sm font-bold text-green-950 hover:bg-green-400"
                  >
                    Mark as Collected
                  </button>
                )}
              </article>
            ))}

            {readyOrders.length === 0 && (
              <p className="col-span-full py-10 text-center text-slate-400">
                No orders are ready for pickup.
              </p>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-8 flex flex-col justify-between gap-4 border-t border-slate-800 pt-5 sm:flex-row sm:items-center">
        <p className="text-sm text-slate-400">
          Thank you for dining with us!
        </p>

        {showDemoControls && (
          <div className="flex flex-wrap gap-3">
            <button
              onClick={addDemoOrder}
              className="rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold hover:bg-slate-700"
            >
              + Add Demo Order
            </button>

            <button
              onClick={resetDemo}
              className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-900"
            >
              Reset Demo
            </button>
          </div>
        )}
      </footer>

      <div className="mt-6 text-center">
        <button
          onClick={() => setShowDemoControls((current) => !current)}
          className="text-xs text-slate-500 underline hover:text-slate-300"
        >
          {showDemoControls
            ? "Hide demo controls"
            : "Show demo controls"}
        </button>
      </div>
    </div>
  );
}
