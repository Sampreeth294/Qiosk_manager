import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api/apiClient";

type Restaurant = { id: number; name: string };
type DisplayOrder = {
  public_number: string;
  status: "CONFIRMED" | "PREPARING" | "READY";
  created_at: string;
};
type DisplayResponse = {
  restaurant: Restaurant;
  orders: DisplayOrder[];
};
type ConnectionState = "connecting" | "connected" | "disconnected" | "reconnecting" | "polling";

const publicStatuses: DisplayOrder["status"][] = [
  "CONFIRMED",
  "PREPARING",
  "READY",
];

export default function LiveOrderDisplay() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restaurantId, setRestaurantId] = useState<number | null>(() => {
    const rawId = new URLSearchParams(window.location.search).get("restaurant_id");
    return rawId && /^\d+$/.test(rawId) ? Number(rawId) : null;
  });
  const [orders, setOrders] = useState<DisplayOrder[]>([]);
  const [restaurantName, setRestaurantName] = useState("");
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    void apiRequest<Restaurant[]>("/public/restaurants/")
      .then((availableRestaurants) => {
        setRestaurants(availableRestaurants);
        setRestaurantId((current) =>
          current && availableRestaurants.some((restaurant) => restaurant.id === current)
            ? current
            : availableRestaurants[0]?.id ?? null,
        );
        if (availableRestaurants.length === 0) setLoading(false);
      })
      .catch((requestError: unknown) => {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load restaurants.",
        );
        setLoading(false);
      });
  }, []);

  const refreshOrders = useCallback(async () => {
    if (!restaurantId) return;
    try {
      const response = await apiRequest<DisplayResponse>(
        `/public/live-display/?restaurant_id=${restaurantId}`,
      );
      setOrders(response.orders);
      setRestaurantName(response.restaurant.name);
      setError("");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to refresh order status.",
      );
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId) {
      return;
    }

    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set("restaurant_id", String(restaurantId));
    window.history.replaceState({}, "", currentUrl);
    const initialLoadTimer = window.setTimeout(() => {
      void refreshOrders();
    }, 0);

    const pollTimer = window.setInterval(() => {
      void refreshOrders();
    }, 15000);
    const scheme = window.location.protocol === "https:" ? "wss:" : "ws:";
    let reconnectTimer: number | undefined;
    let reconnectAttempts = 0;
    let closedByEffect = false;
    let socket: WebSocket | undefined;

    const connect = () => {
      if (closedByEffect) return;
      setConnection((current) =>
        current === "connected" ? "reconnecting" : "connecting",
      );
      let currentSocket: WebSocket;
      try {
        currentSocket = new WebSocket(
          `${scheme}//${window.location.host}/ws/public/orders/?restaurant_id=${restaurantId}`,
        );
      } catch {
        setConnection("disconnected");
        reconnectTimer = window.setTimeout(connect, 3000);
        return;
      }
      socket = currentSocket;
      currentSocket.onopen = () => {
        reconnectAttempts = 0;
        setConnection("connected");
      };
      currentSocket.onmessage = (message) => {
        try {
          const event = JSON.parse(message.data) as {
            event: string;
            order?: DisplayOrder;
            public_number?: string;
          };
          if (event.event === "order.hidden" && event.public_number) {
            setOrders((current) =>
              current.filter((order) => order.public_number !== event.public_number),
            );
            return;
          }
          if (event.order && publicStatuses.includes(event.order.status)) {
            setOrders((current) => [
              event.order!,
              ...current.filter(
                (order) => order.public_number !== event.order?.public_number,
              ),
            ]);
          }
        } catch {
          setError("Received an invalid live order update. Polling remains active.");
        }
      };
      currentSocket.onclose = () => {
        if (closedByEffect) return;
        reconnectAttempts += 1;
        setConnection(reconnectAttempts >= 2 ? "polling" : "reconnecting");
        reconnectTimer = window.setTimeout(connect, 3000);
      };
      currentSocket.onerror = () => {
        setConnection("disconnected");
        currentSocket.close();
      };
    };

    connect();
    const clockTimer = window.setInterval(() => setNow(new Date()), 1000);
    return () => {
      closedByEffect = true;
      window.clearTimeout(initialLoadTimer);
      window.clearInterval(pollTimer);
      window.clearInterval(clockTimer);
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [restaurantId, refreshOrders]);

  const byStatus = (status: DisplayOrder["status"]) =>
    orders.filter((order) => order.status === status);
  const connectionLabel: Record<ConnectionState, string> = {
    connecting: "Connecting",
    connected: "Live updates connected",
    disconnected: "Live connection unavailable",
    reconnecting: "Reconnecting; automatic refresh is active",
    polling: "Automatic refresh active",
  };
  const statusLabels: Record<DisplayOrder["status"], string> = {
    CONFIRMED: "⏳ Confirmed",
    PREPARING: "🍳 Preparing in Kitchen",
    READY: "✅ Ready for Pickup",
  };
  const statusColors: Record<DisplayOrder["status"], string> = {
    CONFIRMED: "border-2 border-indigo-400/70 bg-slate-900/90 shadow-lg text-indigo-300",
    PREPARING: "border-2 border-amber-400 bg-amber-950/80 shadow-[0_0_30px_rgba(251,191,36,0.3)] text-amber-300",
    READY: "border-4 border-emerald-400 bg-emerald-950/95 shadow-[0_0_40px_rgba(52,211,153,0.5)] text-emerald-300 kiosk-token-glow",
  };

  return (
    <main className="min-h-screen bg-canteen-order p-4 text-white sm:p-8 backdrop-blur-xl">
      <header className="flex flex-col justify-between gap-5 border-b border-amber-500/20 bg-slate-950/80 p-6 rounded-3xl shadow-2xl backdrop-blur-xl sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-3">
            <Link
              to="/order"
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400 text-slate-950 font-black text-xl hover:scale-105 transition"
              title="Return to Order Screen"
            >
              ←
            </Link>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-300">
                RV College of Engineering Canteen • Pickup Counter
              </p>
              <h1 className="mt-1 text-3xl font-black sm:text-5xl text-white">
                {restaurantName || "Live Order Token Display"}
              </h1>
            </div>
          </div>
          <p className="mt-2 text-slate-300 text-base">
            Watch your counter token number below. When it appears in <strong>Ready for Pickup</strong>, collect it at the counter.
          </p>
          <p className="mt-2 text-sm font-bold text-amber-300" aria-live="polite">
            ● {connectionLabel[connection]}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:items-end">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="display-restaurant">
            Canteen Outlet
          </label>
          <select
            id="display-restaurant"
            className="min-w-60 rounded-xl border border-amber-400/40 bg-slate-900 px-4 py-3 text-white font-bold outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
            value={restaurantId ?? ""}
            onChange={(event) => {
              setLoading(true);
              setRestaurantId(Number(event.target.value));
            }}
            disabled={!restaurants.length}
          >
            {restaurants.map((restaurant) => (
              <option value={restaurant.id} key={restaurant.id}>
                {restaurant.name}
              </option>
            ))}
          </select>
          <p className="text-3xl font-mono font-black tabular-nums text-amber-400">
            {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </p>
        </div>
      </header>

      {error && (
        <div role="alert" className="mt-5 rounded-xl border border-rose-800 bg-rose-950 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      )}

      {!restaurants.length && !loading && (
        <p className="mt-10 rounded-xl border border-slate-800 p-8 text-center text-slate-300">
          No active restaurants are available for public order display.
        </p>
      )}

      {loading ? (
        <p className="py-16 text-center text-xl text-slate-300">Loading live order status…</p>
      ) : (
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {publicStatuses.map((status) => {
            const statusOrders = byStatus(status);
            return (
              <section key={status} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-sm">
                <header className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
                  <h2 className="text-xl font-extrabold sm:text-2xl">{statusLabels[status]}</h2>
                  <span className="rounded-lg bg-white px-3 py-1 text-lg font-black text-slate-900">
                    {statusOrders.length}
                  </span>
                </header>
                <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-1">
                  {statusOrders.map((order) => (
                    <article
                      key={order.public_number}
                      className={`rounded-xl border p-5 text-center ${statusColors[status]}`}
                    >
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
                        Order number
                      </p>
                      <p className="mt-1 text-5xl font-black tracking-wider">
                        #{order.public_number}
                      </p>
                    </article>
                  ))}
                  {statusOrders.length === 0 && (
                    <p className="py-8 text-center text-slate-400">
                      No orders in this status.
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
      <footer className="mt-8 border-t border-slate-800 pt-4 text-center text-xs text-slate-500">
        This public screen displays order numbers and status only.
      </footer>
    </main>
  );
}
