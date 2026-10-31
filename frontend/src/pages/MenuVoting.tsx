
import { useMemo, useState } from "react";

type Dish = {
  id: number;
  name: string;
  description: string;
  category: string;
  votes: number;
  emoji: string;
  price: number;
};

const initialDishes: Dish[] = [
  {
    id: 1,
    name: "Paneer Butter Masala",
    description: "Creamy tomato gravy with soft paneer.",
    category: "North Indian",
    votes: 42,
    emoji: "🍛",
    price: 140,
  },
  {
    id: 2,
    name: "Veg Biryani",
    description: "Fragrant basmati rice with vegetables.",
    category: "Rice",
    votes: 35,
    emoji: "🍚",
    price: 120,
  },
  {
    id: 3,
    name: "Masala Dosa",
    description: "Crispy dosa served with chutney and sambar.",
    category: "South Indian",
    votes: 51,
    emoji: "🥞",
    price: 80,
  },
  {
    id: 4,
    name: "Chole Bhature",
    description: "Spiced chickpeas served with fluffy bhature.",
    category: "North Indian",
    votes: 28,
    emoji: "🫓",
    price: 110,
  },
  {
    id: 5,
    name: "Veg Fried Rice",
    description: "Stir-fried rice with fresh vegetables.",
    category: "Rice",
    votes: 19,
    emoji: "🥡",
    price: 100,
  },
  {
    id: 6,
    name: "Idli Sambar",
    description: "Steamed idlis with traditional sambar.",
    category: "South Indian",
    votes: 31,
    emoji: "🥣",
    price: 60,
  },
];

const categories = [
  "All",
  "North Indian",
  "South Indian",
  "Rice",
];

export default function MenuVoting() {
  const [dishes, setDishes] = useState(initialDishes);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [votedDishId, setVotedDishId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [showResults, setShowResults] = useState(true);

  const totalVotes = dishes.reduce(
    (total, dish) => total + dish.votes,
    0
  );

  const filteredDishes = useMemo(() => {
    return dishes.filter((dish) => {
      const matchesCategory =
        selectedCategory === "All" ||
        dish.category === selectedCategory;

      const matchesSearch = dish.name
        .toLowerCase()
        .includes(search.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [dishes, selectedCategory, search]);

  const rankedDishes = [...dishes].sort(
    (a, b) => b.votes - a.votes
  );

  const winner = rankedDishes[0];

  function handleVote(dishId: number) {
    if (votedDishId !== null) return;

    setDishes((currentDishes) =>
      currentDishes.map((dish) =>
        dish.id === dishId
          ? { ...dish, votes: dish.votes + 1 }
          : dish
      )
    );

    setVotedDishId(dishId);
  }

  function removeVote() {
    if (votedDishId === null) return;

    setDishes((currentDishes) =>
      currentDishes.map((dish) =>
        dish.id === votedDishId
          ? { ...dish, votes: Math.max(0, dish.votes - 1) }
          : dish
      )
    );

    setVotedDishId(null);
  }

  return (
    <div className="min-h-screen space-y-6 bg-slate-50 p-4 text-slate-800 sm:p-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-orange-600">
            MENU MANAGEMENT
          </p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
            Menu Voting
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Let everyone choose what should be served tomorrow.
          </p>
        </div>

        <div className="rounded-xl border border-orange-100 bg-orange-50 px-4 py-3">
          <p className="text-xs font-medium text-orange-700">
            VOTING FOR
          </p>
          <p className="mt-1 font-semibold text-orange-950">
            Tomorrow's Menu
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Total Votes</p>
          <p className="mt-2 text-3xl font-bold">{totalVotes}</p>
          <p className="mt-2 text-xs text-slate-400">
            Across all menu options
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Dishes in Poll</p>
          <p className="mt-2 text-3xl font-bold">{dishes.length}</p>
          <p className="mt-2 text-xs text-slate-400">
            Available choices
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Current Leader</p>
          <p className="mt-2 text-xl font-bold">
            {winner?.emoji} {winner?.name}
          </p>
          <p className="mt-2 text-xs text-slate-400">
            {winner?.votes} votes so far
          </p>
        </div>
      </div>

      {/* Voting notice */}
      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4 sm:flex-row sm:items-center">
        <div className="flex gap-3">
          <span className="text-2xl">🗳️</span>
          <div>
            <p className="font-semibold text-orange-950">
              Choose your favourite dish
            </p>
            <p className="mt-1 text-sm text-orange-800">
              {votedDishId === null
                ? "You can vote for one dish in this demo."
                : `You voted for ${
                    dishes.find((dish) => dish.id === votedDishId)?.name
                  }.`}
            </p>
          </div>
        </div>

        {votedDishId !== null && (
          <button
            onClick={removeVote}
            className="rounded-lg border border-orange-300 bg-white px-4 py-2 text-sm font-semibold text-orange-800 hover:bg-orange-100"
          >
            Change My Vote
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search dishes..."
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-orange-400 sm:max-w-sm"
        />

        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                selectedCategory === category
                  ? "bg-orange-500 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Dish cards */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredDishes.map((dish) => {
          const percentage =
            totalVotes > 0
              ? Math.round((dish.votes / totalVotes) * 100)
              : 0;

          const isVoted = votedDishId === dish.id;

          return (
            <div
              key={dish.id}
              className={`rounded-2xl border bg-white p-5 transition ${
                isVoted
                  ? "border-orange-400 ring-2 ring-orange-100"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-3xl">
                  {dish.emoji}
                </div>

                {winner?.id === dish.id && (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                    🏆 Leading
                  </span>
                )}
              </div>

              <h2 className="mt-4 text-lg font-bold">{dish.name}</h2>

              <p className="mt-1 min-h-10 text-sm text-slate-500">
                {dish.description}
              </p>

              <div className="mt-3 flex items-center justify-between">
                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
                  {dish.category}
                </span>
                <span className="font-semibold">₹{dish.price}</span>
              </div>

              {showResults && (
                <div className="mt-5">
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="text-slate-500">
                      {dish.votes} votes
                    </span>
                    <span className="font-semibold">{percentage}%</span>
                  </div>

                  <div
                    className="h-2 overflow-hidden rounded-full bg-slate-100"
                    role="progressbar"
                    aria-label={`${dish.name} vote share`}
                    aria-valuenow={percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="h-full rounded-full bg-orange-500 transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )}

              <button
                onClick={() => handleVote(dish.id)}
                disabled={votedDishId !== null}
                className={`mt-5 w-full rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  isVoted
                    ? "bg-green-100 text-green-800"
                    : votedDishId !== null
                      ? "cursor-not-allowed bg-slate-100 text-slate-400"
                      : "bg-orange-500 text-white hover:bg-orange-600"
                }`}
              >
                {isVoted
                  ? "✓ Your Vote"
                  : votedDishId !== null
                    ? "Already Voted"
                    : "Vote for This Dish"}
              </button>
            </div>
          );
        })}
      </div>

      {filteredDishes.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-lg font-semibold">No dishes found</p>
          <p className="mt-2 text-sm text-slate-500">
            Try another search term or category.
          </p>
        </div>
      )}

      {/* Results */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold">Voting Results</h2>
            <p className="mt-1 text-sm text-slate-500">
              Current ranking of tomorrow's menu choices.
            </p>
          </div>

          <button
            onClick={() => setShowResults((current) => !current)}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            {showResults ? "Hide Results on Cards" : "Show Results on Cards"}
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {rankedDishes.map((dish, index) => (
            <div
              key={dish.id}
              className="flex items-center gap-3"
            >
              <span className="w-7 text-sm font-semibold text-slate-400">
                #{index + 1}
              </span>

              <span className="text-xl">{dish.emoji}</span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {dish.name}
                </p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-orange-400"
                    style={{
                      width: `${
                        winner?.votes
                          ? (dish.votes / winner.votes) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <span className="whitespace-nowrap text-sm font-semibold">
                {dish.votes} votes
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Demo mode: votes are stored in React state and reset when the page
        reloads. They are not saved to the database or shared with other users.
      </p>
    </div>
  );
}
