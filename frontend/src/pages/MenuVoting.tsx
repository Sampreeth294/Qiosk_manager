import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../api/apiClient";

type Restaurant = { id: number; name: string };
type VoteOption = {
  id: number;
  name: string;
  description: string;
  category: string;
  image_url?: string | null;
  price?: string | number;
  votes?: number;
  eligible?: boolean;
};
type PublicPoll = {
  restaurant: Restaurant;
  period: { vote_date: string; starts_at: string; ends_at: string; start_time: string; end_time: string; is_open: boolean };
  results_visible: boolean;
  total_votes: number | null;
  my_vote: number | null;
  options: VoteOption[];
};
type AdminPoll = {
  restaurant: Restaurant;
  vote_date: string;
  is_open: boolean;
  starts_at: string;
  ends_at: string;
  publish_results: boolean;
  use_all_active_items: boolean;
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
  const [eligibleItemIds, setEligibleItemIds] = useState<number[]>([]);
  const [startsAt, setStartsAt] = useState("00:00");
  const [endsAt, setEndsAt] = useState("23:59");
  const [publishResults, setPublishResults] = useState(false);
  const [useAllActiveItems, setUseAllActiveItems] = useState(true);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingConfiguration, setSavingConfiguration] = useState(false);
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
          setNotice("Your vote has already been recorded for tomorrow's menu.");
        }
        if ("vote_date" in result) {
          setEligibleItemIds(result.options.filter((option) => option.eligible).map((option) => option.id));
          setStartsAt(result.starts_at);
          setEndsAt(result.ends_at);
          setPublishResults(result.publish_results);
          setUseAllActiveItems(result.use_all_active_items);
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
    ? `${poll.period.start_time}–${poll.period.end_time} (restaurant local time)`
    : "Restaurant local time";
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
        setNotice("You have already voted for tomorrow's menu.");
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
      setPoll(await apiRequest<AdminPoll>(`/menu-votes/?restaurant_id=${restaurantId}&manage=true`));
      setNotice(isOpen ? "Voting has been opened for tomorrow's menu." : "Voting has been closed for tomorrow's menu.");
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update voting.");
    }
  }

  async function saveConfiguration() {
    if (!restaurantId || !management) return;
    setSavingConfiguration(true);
    setError("");
    try {
      await apiRequest(`/menu-votes/?restaurant_id=${restaurantId}&manage=true`, {
        method: "PATCH",
        body: JSON.stringify({
          starts_at: startsAt,
          ends_at: endsAt,
          publish_results: publishResults,
          ...(useAllActiveItems
            ? { use_all_active_items: true }
            : { eligible_menu_item_ids: eligibleItemIds }),
        }),
      });
      setNotice("Tomorrow's voting rules have been saved.");
      const updated = await apiRequest<AdminPoll>(`/menu-votes/?restaurant_id=${restaurantId}&manage=true`);
      setPoll(updated);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save voting rules.");
    } finally {
      setSavingConfiguration(false);
    }
  }

  return (
    <main className="min-h-screen space-y-6 bg-slate-50 p-4 text-slate-900 sm:p-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-violet-700">
            {management ? "Voting administration" : "Customer menu poll"}
          </p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">
            {management ? "Menu Voting Management" : "What would you like us to cook tomorrow?"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            {management
              ? "View tomorrow's vote totals, select eligible dishes, and manage the voting period."
              : "Vote for the dishes you'd love to see on tomorrow's menu. Your feedback helps us plan what to prepare."}
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
          <section className="flex flex-col justify-between gap-4 rounded-2xl border border-violet-200 bg-violet-50 p-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-violet-800">Tomorrow's voting period</p>
              <p className="mt-1 text-lg font-bold text-violet-950">
                {new Date(("period" in poll ? poll.period.vote_date : poll.vote_date) + "T00:00:00").toLocaleDateString()}
              </p>
              <p className="mt-1 text-sm text-violet-900">{periodDescription}</p>
              <p className="mt-1 text-sm text-violet-900">
                {periodOpen ? "Voting is open" : "Voting is closed"}
                {management ? ` · ${totalVotes} vote${totalVotes === 1 ? "" : "s"}` : ""}
              </p>
            </div>
            {management ? (
              <button
                type="button"
                onClick={() => void setVotingOpen(!periodOpen)}
                className={`rounded-xl px-5 py-3 text-sm font-bold text-white ${periodOpen ? "bg-rose-700 hover:bg-rose-800" : "bg-violet-700 hover:bg-violet-800"}`}
              >
                {periodOpen ? "Close tomorrow's vote" : "Open tomorrow's vote"}
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
                    className={`rounded-2xl border bg-white p-5 shadow-sm ${isSelected ? "border-violet-500 ring-2 ring-violet-100" : "border-slate-200"}`}
                  >
                    {option.image_url && (
                      <img src={option.image_url} alt="" className="mb-4 h-40 w-full rounded-xl object-cover" />
                    )}
                    <p className="text-xs font-bold uppercase tracking-wide text-violet-700">{option.category}</p>
                    <h2 className="mt-2 text-xl font-bold">{option.name}</h2>
                    <p className="mt-2 min-h-10 text-sm text-slate-600">{option.description || "A choice from today's active menu."}</p>
                    {option.price !== undefined && (
                      <p className="mt-3 text-sm font-semibold">₹{Number(option.price).toFixed(2)}</p>
                    )}
                    {management ? (
                      <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold">
                        <label className="flex items-center justify-between gap-3">
                          <span>{option.votes ?? 0} vote{option.votes === 1 ? "" : "s"}</span>
                          <input
                            type="checkbox"
                            checked={useAllActiveItems || eligibleItemIds.includes(option.id)}
                            disabled={useAllActiveItems}
                            onChange={(event) => {
                              setEligibleItemIds((current) =>
                                event.target.checked
                                  ? [...current, option.id]
                                  : current.filter((id) => id !== option.id),
                              );
                            }}
                            aria-label={`Include ${option.name} in tomorrow's poll`}
                          />
                        </label>
                      </p>
                    ) : (
                      <button
                        type="button"
                        disabled={!periodOpen || selectedItem !== null}
                        onClick={() => setSelectedItem(option.id)}
                        className={`mt-4 w-full rounded-xl px-4 py-3 text-sm font-bold ${isSelected ? "bg-emerald-100 text-emerald-900" : "bg-violet-600 text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"}`}
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
              {options.length ? "No items match your search." : "There are no eligible active menu items for tomorrow's vote."}
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
                className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-60"
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

          {management && (
            <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Tomorrow's voting rules</h2>
                <p className="mt-1 text-sm text-slate-500">Configure the customer voting window and eligible dishes.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700">
                  Opens at
                  <input type="time" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3" />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Closes at
                  <input type="time" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3" />
                </label>
              </div>
              <label className="flex items-center gap-3 text-sm text-slate-700">
                <input type="checkbox" checked={useAllActiveItems} onChange={(event) => setUseAllActiveItems(event.target.checked)} />
                Use all active menu items
              </label>
              <label className="flex items-center gap-3 text-sm text-slate-700">
                <input type="checkbox" checked={publishResults} onChange={(event) => setPublishResults(event.target.checked)} />
                Publish results to customers after voting closes
              </label>
              {!useAllActiveItems && (
                <p className="text-sm text-slate-600">Select eligible dishes using the checkboxes in the menu item cards.</p>
              )}
              <button type="button" onClick={() => void saveConfiguration()} disabled={savingConfiguration} className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-60">
                {savingConfiguration ? "Saving…" : "Save voting rules"}
              </button>
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
