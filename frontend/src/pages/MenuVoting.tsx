import { useEffect, useMemo, useState } from "react";
<<<<<<< HEAD
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api/apiClient";
=======
import { Link } from "react-router-dom";
>>>>>>> 89d3e54 (Save my local changes)

type CandidateDish = {
  id: number;
  name: string;
  category: string;
<<<<<<< HEAD
  image_url?: string | null;
  price?: string | number;
  votes?: number;
  likes?: number;
  dislikes?: number;
  eligible?: boolean;
};
type PublicPoll = {
  restaurant: Restaurant;
  period: { vote_date: string; starts_at: string; ends_at: string; start_time: string; end_time: string; is_open: boolean };
  results_visible: boolean;
  total_votes: number | null;
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
  abstentions: number;
  options: VoteOption[];
=======
  description: string;
  price: number;
  imageUrl: string;
  likes: number;
  dislikes: number;
  approvedForTomorrow: boolean;
>>>>>>> 89d3e54 (Save my local changes)
};

// Initial candidate dishes for Tomorrow's Menu Poll at RV College of Engineering
const defaultCandidateDishes: CandidateDish[] = [
  {
    id: 1,
    name: "Masala Dosa",
    category: "Breakfast",
    description: "Crisp golden crepe filled with potato masala, served with coconut chutney & hot sambar.",
    price: 50,
    imageUrl: "/images/masala_dosa.jpg",
    likes: 86,
    dislikes: 4,
    approvedForTomorrow: true,
  },
  {
    id: 2,
    name: "Bisi Bele Bath",
    category: "Lunch",
    description: "Traditional Karnataka spicy lentil rice with vegetables, pure ghee & boondi.",
    price: 50,
    imageUrl: "/images/bisi_bele_bath.jpg",
    likes: 74,
    dislikes: 6,
    approvedForTomorrow: true,
  },
  {
    id: 3,
    name: "Gobi Manchurian",
    category: "Snacks",
    description: "Crisp cauliflower florets tossed in tangy ginger-garlic Indo-Chinese sauce.",
    price: 60,
    imageUrl: "/images/gobi.jpg",
    likes: 91,
    dislikes: 5,
    approvedForTomorrow: true,
  },
  {
    id: 4,
    name: "Chow Chow Bath",
    category: "Breakfast",
    description: "Iconic Karnataka duo: spicy Khara Bath paired with sweet saffron Kesari Bath.",
    price: 55,
    imageUrl: "/images/chow_chow_bath.jpg",
    likes: 58,
    dislikes: 12,
    approvedForTomorrow: false,
  },
  {
    id: 5,
    name: "South Indian Sambar Meals",
    category: "Lunch",
    description: "Steaming hot rice with drumstick sambar, rasam, palya, curd, pickle & papad.",
    price: 60,
    imageUrl: "/images/rice_sambar.jpg",
    likes: 68,
    dislikes: 7,
    approvedForTomorrow: true,
  },
  {
    id: 6,
    name: "Kerala Malabar Parotta",
    category: "Lunch",
    description: "Flaky layered multi-layered parottas served with rich vegetable kurma.",
    price: 50,
    imageUrl: "/images/parotta.jpg",
    likes: 62,
    dislikes: 9,
    approvedForTomorrow: false,
  },
  {
    id: 7,
    name: "Poori Sagu",
    category: "Breakfast",
    description: "Fluffy deep-fried golden pooris with flavorful potato & vegetable sagu.",
    price: 45,
    imageUrl: "/images/poori.jpg",
    likes: 65,
    dislikes: 8,
    approvedForTomorrow: false,
  },
  {
    id: 8,
    name: "Pani Puri (6 Pcs)",
    category: "Snacks",
    description: "Crisp puris packed with spiced potatoes and chilled mint teekha pani.",
    price: 35,
    imageUrl: "/images/panipuri.jpg",
    likes: 82,
    dislikes: 7,
    approvedForTomorrow: true,
  },
  {
    id: 9,
    name: "Mysore Bhajji (Bonda)",
    category: "Snacks",
    description: "Crispy fried golden maida dumplings with coconut bits & spicy chutney.",
    price: 30,
    imageUrl: "/images/mysore_bhajji.jpg",
    likes: 49,
    dislikes: 14,
    approvedForTomorrow: false,
  },
  {
    id: 10,
    name: "Ice Cream with Chocolate Sauce",
    category: "Ice Creams",
    description: "Creamy vanilla scoop drizzled with hot rich chocolate fudge sauce.",
    price: 50,
    imageUrl: "/images/Ice_cream_with_chocolate_syrup.jpg",
    likes: 79,
    dislikes: 3,
    approvedForTomorrow: true,
  },
];

type MenuVotingProps = { management?: boolean };
type VoteSentiment = "LIKE" | "DISLIKE";

function formatVoteDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export default function MenuVoting({ management = false }: MenuVotingProps) {
<<<<<<< HEAD
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restaurantId, setRestaurantId] = useState<number | null>(() => {
    const rawId = new URLSearchParams(window.location.search).get("restaurant_id");
    return rawId && /^\d+$/.test(rawId) ? Number(rawId) : null;
  });
  const [poll, setPoll] = useState<PublicPoll | AdminPoll | null>(null);
  const [selectedItem, setSelectedItem] = useState<number | null>(null);
  const [selectedSentiment, setSelectedSentiment] = useState<VoteSentiment | null>(null);
  const [selectedAbstain, setSelectedAbstain] = useState(false);
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
  const managementTotalVotes =
    typeof totalVotes === "number" ? totalVotes : 0;
  const managementOptions = management
    ? options.filter((option) => option.eligible)
    : [];
  const maxOptionVotes = Math.max(
    1,
    ...managementOptions.map((option) => option.votes ?? 0),
  );
  const periodDescription = poll && "period" in poll
    ? `${poll.period.start_time}–${poll.period.end_time} (restaurant local time)`
    : "Restaurant local time";
  const selectedOption = options.find((option) => option.id === selectedItem);

  async function submitVote() {
    if (
      !restaurantId ||
      (!selectedAbstain && (selectedItem === null || selectedSentiment === null)) ||
      submitting
    ) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await apiRequest<{ menu_item: number | null; menu_item_name: string | null; sentiment: VoteSentiment | null; detail: string }>(
        `/menu-votes/?restaurant_id=${restaurantId}`,
        {
          method: "POST",
          body: JSON.stringify({
            restaurant_id: restaurantId,
            ...(selectedAbstain
              ? { abstain: true }
              : { menu_item_id: selectedItem, sentiment: selectedSentiment }),
          }),
        },
      );
      setSelectedItem(null);
      setNotice(response.detail);
      navigate("/");
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unable to submit your vote.";
      setError(message);
    } finally {
      setSubmitting(false);
=======
  const [dishes, setDishes] = useState<CandidateDish[]>(() => {
    const saved = localStorage.getItem("rvce_tomorrow_menu_votes");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return defaultCandidateDishes;
      }
>>>>>>> 89d3e54 (Save my local changes)
    }
    return defaultCandidateDishes;
  });

  const [userVotes, setUserVotes] = useState<Record<number, "LIKE" | "DISLIKE">>(() => {
    const saved = localStorage.getItem("rvce_user_voted_map");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
    return {};
  });

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [saveNotice, setSaveNotice] = useState("");

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem("rvce_tomorrow_menu_votes", JSON.stringify(dishes));
  }, [dishes]);

  useEffect(() => {
    localStorage.setItem("rvce_user_voted_map", JSON.stringify(userVotes));
  }, [userVotes]);



  const categories = useMemo(() => {
    const set = new Set(dishes.map((d) => d.category));
    return ["All", ...Array.from(set)];
  }, [dishes]);

  const filteredDishes = useMemo(() => {
    return dishes.filter((dish) => {
      const matchCat = selectedCategory === "All" || dish.category === selectedCategory;
      const q = search.trim().toLowerCase();
      const matchSearch =
        dish.name.toLowerCase().includes(q) ||
        dish.category.toLowerCase().includes(q) ||
        dish.description.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [dishes, selectedCategory, search]);

  const totalLikes = useMemo(() => dishes.reduce((acc, d) => acc + d.likes, 0), [dishes]);
  const totalDislikes = useMemo(() => dishes.reduce((acc, d) => acc + d.dislikes, 0), [dishes]);
  const totalVotesCount = totalLikes + totalDislikes;

  const topDish = useMemo(() => {
    return [...dishes].sort((a, b) => b.likes - b.dislikes - (a.likes - a.dislikes))[0];
  }, [dishes]);

  const approvedCount = useMemo(() => dishes.filter((d) => d.approvedForTomorrow).length, [dishes]);

  function handleVote(dishId: number, type: "LIKE" | "DISLIKE") {
    const currentVote = userVotes[dishId];

    setDishes((prev) =>
      prev.map((dish) => {
        if (dish.id !== dishId) return dish;
        let newLikes = dish.likes;
        let newDislikes = dish.dislikes;

        if (currentVote === type) {
          // Toggle off
          if (type === "LIKE") newLikes = Math.max(0, newLikes - 1);
          if (type === "DISLIKE") newDislikes = Math.max(0, newDislikes - 1);
        } else {
          // Switch or new vote
          if (currentVote === "LIKE") newLikes = Math.max(0, newLikes - 1);
          if (currentVote === "DISLIKE") newDislikes = Math.max(0, newDislikes - 1);

          if (type === "LIKE") newLikes += 1;
          if (type === "DISLIKE") newDislikes += 1;
        }

        return { ...dish, likes: newLikes, dislikes: newDislikes };
      }),
    );

    setUserVotes((prev) => {
      const next = { ...prev };
      if (currentVote === type) {
        delete next[dishId];
      } else {
        next[dishId] = type;
      }
      return next;
    });
  }

  function toggleAdminApproval(dishId: number) {
    setDishes((prev) =>
      prev.map((d) => (d.id === dishId ? { ...d, approvedForTomorrow: !d.approvedForTomorrow } : d)),
    );
  }

  function handlePublishMenu() {
    setSaveNotice("Tomorrow's Official Menu has been published to all Kiosks successfully!");
    setTimeout(() => setSaveNotice(""), 4000);
  }

<<<<<<< HEAD
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
              setSelectedAbstain(false);
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
                {formatVoteDate("period" in poll ? poll.period.vote_date : poll.vote_date)}
              </p>
              <p className="mt-1 text-sm text-violet-900">{periodDescription}</p>
              <p className="mt-1 text-sm text-violet-900">
                {periodOpen ? "Voting is open" : "Voting is closed"}
                {management ? ` · ${totalVotes} vote${totalVotes === 1 ? "" : "s"}` : ""}
=======
  // -------------------------------------------------------------
  // ADMIN MANAGEMENT VIEW
  // -------------------------------------------------------------
  if (management) {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 rounded-3xl border border-amber-500/20 bg-slate-900/90 p-6 shadow-xl backdrop-blur-xl sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 rounded-full bg-amber-400 animate-pulse" />
              <p className="text-xs font-black uppercase tracking-widest text-amber-400">
                RV College of Engineering Canteen • Admin Opinion Center
>>>>>>> 89d3e54 (Save my local changes)
              </p>
            </div>
            <h1 className="mt-1 text-3xl font-black text-white">Tomorrow's Menu Voting & Decision</h1>
            <p className="mt-1 text-sm text-slate-300">
              Review student likes and dislikes to decide which dishes to cook on tomorrow's menu.
            </p>
          </div>

<<<<<<< HEAD
          {management && (
            <section
              aria-labelledby="vote-analysis-title"
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
            >
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-violet-700">
                    Live poll analysis
                  </p>
                  <h2 id="vote-analysis-title" className="mt-1 text-xl font-bold text-slate-900">
                    Votes by menu item
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Tomorrow’s poll · {new Intl.NumberFormat("en-IN").format(managementTotalVotes)} votes · {new Intl.NumberFormat("en-IN").format("abstentions" in poll ? poll.abstentions : 0)} opted out
                  </p>
                </div>
                <span className="rounded-xl bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-800">
                  {managementOptions.length} eligible {managementOptions.length === 1 ? "item" : "items"}
                </span>
              </div>
=======
          <button
            type="button"
            onClick={handlePublishMenu}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3.5 text-base font-black text-slate-950 shadow-lg shadow-emerald-500/30 hover:brightness-110 active:scale-95"
          >
            <span>🚀 Publish Tomorrow's Menu</span>
          </button>
        </div>
>>>>>>> 89d3e54 (Save my local changes)

        {saveNotice && (
          <div className="rounded-2xl border border-emerald-500 bg-emerald-950/80 p-4 text-emerald-200 font-bold backdrop-blur">
            ✓ {saveNotice}
          </div>
        )}

        {/* Opinion Summary KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-lg">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Student Votes</p>
            <p className="mt-2 text-3xl font-black text-white">{totalVotesCount}</p>
            <p className="mt-1 text-xs text-slate-400">👍 {totalLikes} Likes • 👎 {totalDislikes} Dislikes</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-lg">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Student Top Choice</p>
            <p className="mt-2 text-xl font-black text-amber-400 truncate">{topDish?.name}</p>
            <p className="mt-1 text-xs text-slate-400">
              {topDish ? Math.round((topDish.likes / Math.max(1, topDish.likes + topDish.dislikes)) * 100) : 0}% student approval
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-lg">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Dishes In Poll</p>
            <p className="mt-2 text-3xl font-black text-white">{dishes.length}</p>
            <p className="mt-1 text-xs text-slate-400">Candidate menu items</p>
          </div>

          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-5 shadow-lg">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">Approved for Tomorrow</p>
            <p className="mt-2 text-3xl font-black text-emerald-300">{approvedCount} Dishes</p>
            <p className="mt-1 text-xs text-emerald-400/80">Ready to prepare in kitchen</p>
          </div>
        </div>

        {/* Student Opinion Table & Decision Controls */}
        <section className="rounded-3xl border border-white/10 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <h2 className="text-xl font-black text-white">Student Opinion Verdict & Kitchen Approval</h2>
              <p className="text-xs text-slate-400">
                Toggle the switch to include or exclude dishes based on student votes.
              </p>
            </div>

            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter dishes..."
              className="rounded-xl border border-white/15 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-amber-400"
            />
          </div>

<<<<<<< HEAD
          {filteredOptions.length ? (
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredOptions.map((option) => {
                const isSelected = selectedItem === option.id;
                const isLiked = isSelected && selectedSentiment === "LIKE";
                const isDisliked = isSelected && selectedSentiment === "DISLIKE";
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
                          <span>👍 {option.likes ?? 0} · 👎 {option.dislikes ?? 0}</span>
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
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          disabled={!periodOpen || (selectedItem !== null && !isSelected) || selectedAbstain}
                          onClick={() => {
                            setSelectedItem(option.id);
                            setSelectedSentiment("LIKE");
                          }}
                          aria-label={`Like ${option.name}`}
                          aria-pressed={isLiked}
                          className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${isLiked ? "bg-emerald-100 text-emerald-900 ring-2 ring-emerald-400" : "bg-slate-100 text-slate-700 hover:bg-emerald-50"}`}
                        >
                          <span className="text-2xl" aria-hidden="true">👍</span>
                          <span>Like</span>
                        </button>
                        <button
                          type="button"
                          disabled={!periodOpen || (selectedItem !== null && !isSelected) || selectedAbstain}
                          onClick={() => {
                            setSelectedItem(option.id);
                            setSelectedSentiment("DISLIKE");
                          }}
                          aria-label={`Dislike ${option.name}`}
                          aria-pressed={isDisliked}
                          className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${isDisliked ? "bg-rose-100 text-rose-900 ring-2 ring-rose-400" : "bg-slate-100 text-slate-700 hover:bg-rose-50"}`}
                        >
                          <span className="text-2xl" aria-hidden="true">👎</span>
                          <span>Dislike</span>
                        </button>
                      </div>
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

          {!management && options.length > 0 && periodOpen && (
            <button
              type="button"
              disabled={selectedItem !== null || selectedAbstain}
              onClick={() => setSelectedAbstain(true)}
              aria-pressed={selectedAbstain}
              className={`flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition disabled:cursor-not-allowed ${selectedAbstain ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"}`}
            >
              <span className="text-2xl" aria-hidden="true">🙅</span>
              <span>{selectedAbstain ? "Not voting selected" : "I don't want to vote"}</span>
            </button>
          )}

          {!management && (selectedItem !== null || selectedAbstain) && periodOpen && (
            <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center">
              <p className="text-sm text-slate-700">
                Your selection: <strong>{selectedAbstain ? "Not voting" : selectedOption?.name}</strong>
                {!selectedAbstain && selectedSentiment && (
                  <span> · {selectedSentiment === "LIKE" ? "👍 Like" : "👎 Dislike"}</span>
                )}
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
                    <span>{option.name}</span>
                    <strong>👍 {option.likes ?? 0} · 👎 {option.dislikes ?? 0}</strong>
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
          Multiple people can vote from the same device. Submit another vote for each person.
        </p>
      )}
=======
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs font-black uppercase text-slate-400">
                  <th className="pb-3">Dish</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Price</th>
                  <th className="pb-3">Student Likes 👍</th>
                  <th className="pb-3">Dislikes 👎</th>
                  <th className="pb-3">Approval Rate</th>
                  <th className="pb-3">Opinion Verdict</th>
                  <th className="pb-3 text-right">Include Tomorrow?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredDishes.map((dish) => {
                  const dishTotal = dish.likes + dish.dislikes;
                  const rate = dishTotal > 0 ? Math.round((dish.likes / dishTotal) * 100) : 0;
                  const isHighDemand = rate >= 75 && dish.likes >= 50;

                  return (
                    <tr key={dish.id} className="hover:bg-white/5 transition">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={dish.imageUrl}
                            alt=""
                            className="h-12 w-12 rounded-xl object-cover border border-white/10"
                          />
                          <div>
                            <p className="font-bold text-white text-base">{dish.name}</p>
                            <p className="text-xs text-slate-400 line-clamp-1">{dish.description}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 font-semibold text-slate-300">{dish.category}</td>
                      <td className="py-4 font-bold text-amber-400">₹{dish.price}</td>

                      <td className="py-4 font-black text-emerald-400">👍 {dish.likes}</td>
                      <td className="py-4 font-black text-rose-400">👎 {dish.dislikes}</td>

                      <td className="py-4">
                        <div className="w-32">
                          <div className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                            <span>{rate}%</span>
                            <span>{dishTotal} votes</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                rate >= 70 ? "bg-emerald-500" : rate >= 50 ? "bg-amber-500" : "bg-rose-500"
                              }`}
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-4">
                        {isHighDemand ? (
                          <span className="rounded-full bg-emerald-500/20 border border-emerald-400/40 px-3 py-1 text-xs font-bold text-emerald-300">
                            ★ High Demand
                          </span>
                        ) : rate >= 50 ? (
                          <span className="rounded-full bg-amber-500/20 border border-amber-400/40 px-3 py-1 text-xs font-bold text-amber-300">
                            Moderate
                          </span>
                        ) : (
                          <span className="rounded-full bg-rose-500/20 border border-rose-400/40 px-3 py-1 text-xs font-bold text-rose-300">
                            Low Demand
                          </span>
                        )}
                      </td>

                      <td className="py-4 text-right">
                        <button
                          type="button"
                          onClick={() => toggleAdminApproval(dish.id)}
                          className={`rounded-xl px-4 py-2 text-xs font-black transition ${
                            dish.approvedForTomorrow
                              ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                              : "border border-white/20 bg-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          {dish.approvedForTomorrow ? "✓ Included in Menu" : "+ Add to Tomorrow"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  // -------------------------------------------------------------
  // CUSTOMER 10-FOOT DISTANCE VOTING SCREEN (The Core Theme)
  // -------------------------------------------------------------
  return (
    <main className="min-h-screen bg-canteen-order px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header Bar */}
        <header className="mb-8 rounded-3xl border border-amber-500/20 bg-slate-950/85 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-xl font-black text-slate-950 shadow-lg shadow-amber-500/25 transition hover:scale-105"
                title="Return to Welcome Screen"
              >
                ←
              </Link>
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-slate-900/90 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-300">
                  RV College of Engineering Canteen
                </div>
                <h1 className="kiosk-title-shadow mt-1 text-3xl font-black sm:text-5xl">
                  Tomorrow's Menu Voting 🗳️
                </h1>
                <p className="mt-1 text-base text-slate-300 sm:text-lg">
                  Vote <strong className="text-emerald-400">Like 👍</strong> or <strong className="text-rose-400">Dislike 👎</strong> on candidate dishes! The canteen will cook what gets the most student likes.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/order"
                className="rounded-2xl bg-amber-400 px-6 py-3.5 text-base font-black text-slate-950 shadow-lg shadow-amber-400/30 hover:brightness-110 transition"
              >
                Order Today's Food →
              </Link>
            </div>
          </div>

          {/* Quick Metrics Banner */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-white/10 pt-6">
            <div className="rounded-2xl bg-slate-900/80 p-4 border border-white/10 text-center">
              <p className="text-xs uppercase text-slate-400 font-bold">Total Votes Cast</p>
              <p className="text-2xl font-black text-white mt-1">{totalVotesCount}</p>
            </div>

            <div className="rounded-2xl bg-slate-900/80 p-4 border border-white/10 text-center">
              <p className="text-xs uppercase text-slate-400 font-bold">Leading Tomorrow</p>
              <p className="text-xl font-black text-amber-400 mt-1 truncate">{topDish?.name}</p>
            </div>

            <div className="rounded-2xl bg-slate-900/80 p-4 border border-white/10 text-center">
              <p className="text-xs uppercase text-slate-400 font-bold">Dishes in Voting</p>
              <p className="text-2xl font-black text-white mt-1">{dishes.length}</p>
            </div>

            <div className="rounded-2xl bg-slate-900/80 p-4 border border-white/10 text-center">
              <p className="text-xs uppercase text-emerald-400 font-bold">Approved for Kitchen</p>
              <p className="text-2xl font-black text-emerald-400 mt-1">{approvedCount} Dishes</p>
            </div>
          </div>
        </header>

        {/* Filter & Search Bar */}
        <section className="mb-8 rounded-3xl border border-white/15 bg-slate-950/75 p-5 shadow-2xl backdrop-blur-xl sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search candidate dishes for tomorrow..."
              className="w-full sm:max-w-md rounded-2xl border-2 border-white/20 bg-slate-900/90 py-3.5 px-5 text-base font-bold text-white placeholder-slate-400 outline-none focus:border-amber-400"
            />

            <div className="flex gap-2 overflow-x-auto pb-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`shrink-0 rounded-2xl px-5 py-2.5 text-sm font-extrabold transition ${
                    selectedCategory === cat
                      ? "bg-amber-400 text-slate-950 shadow-[0_0_20px_rgba(250,204,21,0.5)]"
                      : "border border-white/15 bg-slate-900 text-slate-300 hover:border-amber-400/50"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Candidate Dish Cards Grid (10-Foot Distance Visibility) */}
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDishes.map((dish) => {
            const userVote = userVotes[dish.id];
            const dishTotal = dish.likes + dish.dislikes;
            const approvalRate = dishTotal > 0 ? Math.round((dish.likes / dishTotal) * 100) : 0;
            const isWinner = topDish?.id === dish.id;

            return (
              <article
                key={dish.id}
                className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl border-2 bg-slate-900/90 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 ${
                  dish.approvedForTomorrow
                    ? "border-emerald-400/70 shadow-[0_0_35px_rgba(52,211,153,0.2)]"
                    : "border-white/15 hover:border-amber-400"
                }`}
              >
                {/* Dish Photo */}
                <div className="relative h-56 w-full overflow-hidden bg-slate-950">
                  <img
                    src={dish.imageUrl}
                    alt={dish.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-108"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-black/40" />

                  {/* Badges */}
                  <div className="absolute left-4 top-4 flex items-center gap-2">
                    <span className="rounded-full border border-white/20 bg-slate-950/80 px-3 py-1 text-xs font-bold text-slate-300 shadow backdrop-blur">
                      {dish.category}
                    </span>
                    {isWinner && (
                      <span className="rounded-full border border-amber-400/60 bg-amber-400/90 px-3 py-1 text-xs font-black text-slate-950 shadow">
                        🏆 Student Favorite
                      </span>
                    )}
                    {dish.approvedForTomorrow && (
                      <span className="rounded-full border border-emerald-400/60 bg-emerald-500/90 px-3 py-1 text-xs font-black text-slate-950 shadow">
                        ✓ On Tomorrow's Menu
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-4 right-4 rounded-xl border border-amber-400/50 bg-slate-950/90 px-3.5 py-1.5 shadow-2xl">
                    <span className="text-2xl font-black text-amber-400">₹{dish.price}</span>
                  </div>
                </div>

                {/* Content & Vote Controls */}
                <div className="flex flex-1 flex-col justify-between p-6">
                  <div>
                    <h2 className="kiosk-text-shadow text-2xl font-black text-white">{dish.name}</h2>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-300">{dish.description}</p>

                    {/* Approval Meter */}
                    <div className="mt-4 rounded-2xl bg-slate-950/80 p-3 border border-white/10">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-300 mb-1.5">
                        <span>Approval for Tomorrow</span>
                        <span className="text-amber-400 font-black">{approvalRate}% ({dish.likes} Likes)</span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            approvalRate >= 70 ? "bg-emerald-500" : approvalRate >= 50 ? "bg-amber-400" : "bg-rose-500"
                          }`}
                          style={{ width: `${approvalRate}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Like / Dislike Buttons */}
                  <div className="mt-6 pt-4 border-t border-white/10">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 text-center">
                      Do you want this dish tomorrow?
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => handleVote(dish.id, "LIKE")}
                        className={`flex items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-black transition-all duration-200 active:scale-95 ${
                          userVote === "LIKE"
                            ? "border-2 border-emerald-400 bg-emerald-500 text-slate-950 shadow-[0_0_20px_rgba(52,211,153,0.5)]"
                            : "border-2 border-emerald-500/50 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60"
                        }`}
                      >
                        <span className="text-2xl">👍</span>
                        <span>Like ({dish.likes})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleVote(dish.id, "DISLIKE")}
                        className={`flex items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-black transition-all duration-200 active:scale-95 ${
                          userVote === "DISLIKE"
                            ? "border-2 border-rose-400 bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.5)]"
                            : "border-2 border-rose-500/50 bg-rose-950/40 text-rose-300 hover:bg-rose-900/60"
                        }`}
                      >
                        <span className="text-2xl">👎</span>
                        <span>Dislike ({dish.dislikes})</span>
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </div>
>>>>>>> 89d3e54 (Save my local changes)
    </main>
  );
}
