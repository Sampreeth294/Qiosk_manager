import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../api/apiClient";
import { chooseRestaurantId, storeSelectedRestaurantId } from "../api/restaurantSelection";

type Restaurant = { id: number; name: string; is_active: boolean };
type RatingSummary = {
  average_rating: number;
  rating_count: number;
  dishes: { menu_item_id: number; menu_item__name: string; average: number; count: number }[];
  recent: { id: number; menu_item: number; menu_item_name: string; rating: number; comment: string; created_at: string }[];
};

function Stars({ value }: { value: number }) {
  return (
    <span aria-label={`${value} out of 5 stars`} className="whitespace-nowrap text-amber-500">
      {"★".repeat(value)}<span className="text-slate-300">{"★".repeat(5 - value)}</span>
    </span>
  );
}

export default function CustomerRatings() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restaurantId, setRestaurantId] = useState<number | null>(null);
  const [summary, setSummary] = useState<RatingSummary | null>(null);
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);
  const [loadedRestaurantId, setLoadedRestaurantId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    void apiRequest<Restaurant[]>("/restaurants/?include_inactive=true")
      .then((data) => {
        if (!active) return;
        const activeRestaurants = data.filter((restaurant) => restaurant.is_active);
        setRestaurants(activeRestaurants);
        setRestaurantId(chooseRestaurantId(activeRestaurants));
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "Unable to load restaurant access.");
      })
      .finally(() => {
        if (active) setLoadingRestaurants(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!restaurantId) return;
    let active = true;
    void apiRequest<RatingSummary>(`/food-ratings/?restaurant_id=${restaurantId}`)
      .then((data) => {
        if (!active) return;
        setSummary(data);
        setLoadedRestaurantId(restaurantId);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setSummary(null);
          setError(requestError instanceof Error ? requestError.message : "Unable to load rating summaries.");
          setLoadedRestaurantId(restaurantId);
        }
      });
    return () => {
      active = false;
    };
  }, [restaurantId]);

  const loading = Boolean(restaurantId && loadedRestaurantId !== restaurantId);
  const recent = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (summary?.recent ?? []).filter((item) =>
      item.menu_item_name.toLowerCase().includes(query) || item.comment.toLowerCase().includes(query),
    );
  }, [search, summary]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-violet-700">Customer experience</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Food Ratings &amp; Feedback</h1>
          <p className="mt-1 text-sm text-slate-500">Verified ratings from completed orders. Customer identity is not included.</p>
        </div>
        <label className="text-sm font-semibold text-slate-700">
          Restaurant
          <select
            value={restaurantId ?? ""}
            disabled={loadingRestaurants || restaurants.length === 0}
            onChange={(event) => {
              setError("");
              const selectedId = Number(event.target.value);
              storeSelectedRestaurantId(selectedId);
              setRestaurantId(selectedId);
            }}
            className="mt-2 block min-w-56 rounded-xl border border-slate-300 bg-white px-4 py-3"
          >
            {restaurants.map((restaurant) => <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>)}
          </select>
        </label>
      </header>

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
      {loading && <p role="status" className="rounded-xl bg-white p-8 text-center text-slate-600">Loading rating data…</p>}
      {!loadingRestaurants && restaurants.length === 0 && !error && <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">No restaurant access is available.</p>}

      {summary && !loading && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Average food rating</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">{Number(summary.average_rating).toFixed(1)} <span className="text-amber-500">★</span></p>
              <p className="mt-2 text-xs text-slate-500">Across verified feedback</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Total ratings</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">{summary.rating_count.toLocaleString()}</p>
              <p className="mt-2 text-xs text-slate-500">One rating per ordered dish</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Dishes rated</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">{summary.dishes.length.toLocaleString()}</p>
              <p className="mt-2 text-xs text-slate-500">With at least one rating</p>
            </article>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <h2 className="text-lg font-bold text-slate-900">Per-dish ratings</h2>
            </div>
            {summary.dishes.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">No customer ratings have been submitted yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr><th className="px-5 py-4">Dish</th><th className="px-5 py-4">Average</th><th className="px-5 py-4 text-right">Count</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summary.dishes.map((dish) => (
                      <tr key={dish.menu_item_id}>
                        <td className="px-5 py-4 font-semibold text-slate-800">{dish.menu_item__name}</td>
                        <td className="px-5 py-4"><Stars value={Math.round(Number(dish.average))} /> <span className="ml-2 text-slate-600">{Number(dish.average).toFixed(1)}</span></td>
                        <td className="px-5 py-4 text-right text-slate-600">{dish.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Recent feedback</h2>
                <p className="mt-1 text-sm text-slate-500">Latest 100 comments, without customer identifiers.</p>
              </div>
              <label>
                <span className="sr-only">Search feedback</span>
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search dish or comment" className="w-full rounded-xl border border-slate-300 px-4 py-3 sm:w-72" />
              </label>
            </div>
            {recent.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">No feedback matches this search.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recent.map((item) => (
                  <li key={item.id} className="space-y-2 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="font-semibold text-slate-900">{item.menu_item_name}</h3>
                      <Stars value={item.rating} />
                    </div>
                    {item.comment && <p className="text-sm text-slate-600">{item.comment}</p>}
                    <time className="block text-xs text-slate-400" dateTime={item.created_at}>{new Date(item.created_at).toLocaleString()}</time>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
