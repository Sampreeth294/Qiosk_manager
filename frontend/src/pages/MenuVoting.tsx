import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../api/apiClient";

type Restaurant = { id: number; name: string };
type VoteOption = {
  id: number;
  name: string;
  description: string;
  category: string;
  price?: string | number;
  votes?: number;
};
type PublicPoll = {
  restaurant: Restaurant;
  period: { vote_date: string; starts_at: string; ends_at: string; is_open: boolean };
  results_visible: boolean;
  total_votes: number | null;
  my_vote: number | null;
  options: VoteOption[];
};
type AdminPoll = {
  restaurant: Restaurant;
  vote_date: string;
  is_open: boolean;
  total_votes: number;
  options: VoteOption[];
};

type MenuVotingProps = { management?: boolean };

export default function MenuVoting({ management = false }: MenuVotingProps) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restaurantId, setRestaurantId] = useState<number | null>(() => {
    const rawId = new URLSearchParams(window.location.search).get("restaurant_id");
    return rawId && /^\d+$/.test(rawId) ? Number(rawId) : null;
  });
  const [poll, setPoll] = useState<PublicPoll | AdminPoll | null>(null);
  const [selectedItem, setSelectedItem] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void apiRequest<Restaurant[]>("/public/restaurants/")
      .then((data) => {
        setRestaurants(data);
        setRestaurantId((current) =>
          current && data.some((restaurant) => restaurant.id === current)
            ? current
            : data[0]?.id ?? null,
        );
        if (data.length === 0) setLoading(false);
      })
      .catch((requestError: unknown) => {
        setError(requestError instanceof Error ? requestError.message : "Unable to load restaurants.");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!restaurantId) {
      return;
    }

    let active = true;
    const path = `/menu-votes/?restaurant_id=${restaurantId}${management ? "&manage=true" : ""}`;
    void apiRequest<PublicPoll | AdminPoll>(path)
      .then((result) => {
        if (!active) return;
        setPoll(result);
        if ("my_vote" in result && result.my_vote) {
          setSelectedItem(result.my_vote);
          setNotice("Your vote has already been recorded for today's poll.");
        }
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : "Unable to load the voting period.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [restaurantId, management]);

  const options = useMemo(() => poll?.options ?? [], [poll]);
  const filteredOptions = useMemo(
    () => options.filter((option) => option.name.toLowerCase().includes(search.toLowerCase())),
    [options, search],
  );
  const periodOpen = poll
    ? "period" in poll ? poll.period.is_open : poll.is_open
    : false;
  const totalVotes = poll
    ? "total_votes" in poll ? poll.total_votes : 0
    : 0;
  const periodDescription = poll && "period" in poll
    ? `${new Date(poll.period.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – ${new Date(poll.period.ends_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} (restaurant timezone)`
    : "Current restaurant-local calendar day";
  const selectedOption = options.find((option) => option.id === selectedItem);

  async function submitVote() {
    if (!restaurantId || selectedItem === null || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await apiRequest<{ menu_item: number; menu_item_name: string; detail: string }>(
        `/menu-votes/?restaurant_id=${restaurantId}`,
        {
          method: "POST",
          body: JSON.stringify({ restaurant_id: restaurantId, menu_item_id: selectedItem }),
        },
      );
      setSelectedItem(response.menu_item);
      setNotice(response.detail);
      setPoll((current) =>
        current && "my_vote" in current
          ? { ...current, my_vote: response.menu_item }
          : current,
      );
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unable to submit your vote.";
      if (message.toLowerCase().includes("already voted")) {
        setNotice("You have already voted in today's poll.");
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function setVotingOpen(isOpen: boolean) {
    if (!restaurantId) return;
    try {
      await apiRequest(`/menu-votes/?restaurant_id=${restaurantId}&manage=true`, {
        method: "PATCH",
        body: JSON.stringify({ is_open: isOpen }),
      });
      setPoll((current) =>
        current && "is_open" in current
          ? { ...current, is_open: isOpen }
          : current,
      );
      setNotice(isOpen ? "Voting is open for today's period." : "Voting has been closed for today.");
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update voting.");
    }
  }

  return (
    <main className="min-h-screen space-y-6 bg-slate-50 p-4 text-slate-900 sm:p-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-orange-700">
            {management ? "Voting administration" : "Customer menu poll"}
          </p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Menu Voting</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            {management
              ? "View today's vote totals and manage the voting period."
              : "Choose one active menu item in today's restaurant poll. No account is required."}
          </p>
        </div>
        <label className="text-sm font-semibold text-slate-700">
          Restaurant
          <select
            className="mt-2 block min-w-60 rounded-xl border border-slate-300 bg-white px-4 py-3"
            value={restaurantId ?? ""}
            onChange={(event) => {
              setLoading(true);
              setError("");
              setNotice("");
              setRestaurantId(Number(event.target.value));
              setSelectedItem(null);
            }}
            disabled={!restaurants.length}
          >
            {restaurants.map((restaurant) => (
              <option value={restaurant.id} key={restaurant.id}>{restaurant.name}</option>
            ))}
          </select>
        </label>
      </header>

      {error && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {notice}
        </p>
      )}

      {loading ? (
        <p className="py-16 text-center text-slate-600">Loading today's poll…</p>
      ) : !poll ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
          No active restaurant is available.
        </p>
      ) : (
        <>
          <section className="flex flex-col justify-between gap-4 rounded-2xl border border-orange-200 bg-orange-50 p-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-orange-800">Today's voting period</p>
              <p className="mt-1 text-lg font-bold text-orange-950">
                {new Date(("period" in poll ? poll.period.vote_date : poll.vote_date) + "T00:00:00").toLocaleDateString()}
              </p>
              <p className="mt-1 text-sm text-orange-900">{periodDescription}</p>
              <p className="mt-1 text-sm text-orange-900">
                {periodOpen ? "Voting is open" : "Voting is closed"}
                {management ? ` · ${totalVotes} vote${totalVotes === 1 ? "" : "s"}` : ""}
              </p>
            </div>
            {management ? (
              <button
                type="button"
                onClick={() => void setVotingOpen(!periodOpen)}
                className={`rounded-xl px-5 py-3 text-sm font-bold text-white ${periodOpen ? "bg-rose-700 hover:bg-rose-800" : "bg-emerald-700 hover:bg-emerald-800"}`}
              >
                {periodOpen ? "Close today's poll" : "Reopen today's poll"}
              </button>
            ) : null}
          </section>

          <label className="block max-w-md text-sm font-semibold text-slate-700">
            Find a menu item
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search eligible choices"
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal"
            />
          </label>

          {filteredOptions.length ? (
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredOptions.map((option) => {
                const isSelected = selectedItem === option.id;
                return (
                  <article
                    key={option.id}
                    className={`rounded-2xl border bg-white p-5 shadow-sm ${isSelected ? "border-orange-500 ring-2 ring-orange-100" : "border-slate-200"}`}
                  >
                    <p className="text-xs font-bold uppercase tracking-wide text-orange-700">{option.category}</p>
                    <h2 className="mt-2 text-xl font-bold">{option.name}</h2>
                    <p className="mt-2 min-h-10 text-sm text-slate-600">{option.description || "A choice from today's active menu."}</p>
                    {option.price !== undefined && (
                      <p className="mt-3 text-sm font-semibold">₹{Number(option.price).toFixed(2)}</p>
                    )}
                    {management ? (
                      <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold">
                        {option.votes ?? 0} votes
                      </p>
                    ) : (
                      <button
                        type="button"
                        disabled={!periodOpen || selectedItem !== null}
                        onClick={() => setSelectedItem(option.id)}
                        className={`mt-4 w-full rounded-xl px-4 py-3 text-sm font-bold ${isSelected ? "bg-emerald-100 text-emerald-900" : "bg-orange-600 text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"}`}
                      >
                        {isSelected ? "Selected" : "Choose this item"}
                      </button>
                    )}
                  </article>
                );
              })}
            </section>
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
              {options.length ? "No items match your search." : "There are no eligible active menu items for this poll."}
            </p>
          )}

          {!management && selectedItem !== null && periodOpen && !("my_vote" in poll && poll.my_vote) && (
            <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center">
              <p className="text-sm text-slate-700">
                Your selection: <strong>{selectedOption?.name}</strong>
              </p>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void submitVote()}
                className="rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Submit vote"}
              </button>
            </div>
          )}

          {!management && "results_visible" in poll && poll.results_visible && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-bold">Voting results</h2>
              <p className="mt-1 text-sm text-slate-600">Results are visible after the voting period closes.</p>
              <div className="mt-4 space-y-3">
                {options.map((option) => (
                  <p key={option.id} className="flex justify-between gap-3 text-sm">
                    <span>{option.name}</span><strong>{option.votes ?? 0}</strong>
                  </p>
                ))}
              </div>
            </section>
          )}
        </>
      )}
      {!management && (
        <p className="text-xs text-slate-500">
          Anonymous vote duplication is prevented with a signed, same-site browser cookie. Clearing cookies or voting from another browser can bypass this limit.
        </p>
      )}
    </main>
  );
}
