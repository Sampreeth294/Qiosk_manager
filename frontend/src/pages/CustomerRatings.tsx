
import { useMemo, useState } from "react";

type Review = {
  id: number;
  customer: string;
  dish: string;
  rating: number;
  comment: string;
  date: string;
  status: "Published" | "Pending";
};

const initialReviews: Review[] = [
  {
    id: 1,
    customer: "Rahul",
    dish: "Paneer Butter Masala",
    rating: 5,
    comment: "Excellent taste and good portion size.",
    date: "2026-10-30",
    status: "Published",
  },
  {
    id: 2,
    customer: "Priya",
    dish: "Masala Dosa",
    rating: 4,
    comment: "Crispy dosa and delicious chutney.",
    date: "2026-10-30",
    status: "Published",
  },
  {
    id: 3,
    customer: "Arjun",
    dish: "Veg Biryani",
    rating: 3,
    comment: "Good food, but it could be served hotter.",
    date: "2026-10-29",
    status: "Pending",
  },
  {
    id: 4,
    customer: "Sneha",
    dish: "Idli Sambar",
    rating: 5,
    comment: "Fresh, soft idlis. Great breakfast.",
    date: "2026-10-29",
    status: "Published",
  },
  {
    id: 5,
    customer: "Kiran",
    dish: "Veg Fried Rice",
    rating: 2,
    comment: "The taste was not consistent.",
    date: "2026-10-28",
    status: "Pending",
  },
];

const StarRating = ({
  rating,
  size = "text-lg",
}: {
  rating: number;
  size?: string;
}) => (
  <div
    className={`flex items-center gap-0.5 ${size}`}
    aria-label={`${rating} out of 5 stars`}
  >
    {[1, 2, 3, 4, 5].map((star) => (
      <span
        key={star}
        className={star <= rating ? "text-amber-400" : "text-slate-200"}
      >
        ★
      </span>
    ))}
  </div>
);

export default function CustomerRatings() {
  const [reviews, setReviews] = useState(initialReviews);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedRating, setSelectedRating] = useState("All");

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) /
        reviews.length
      : 0;

  const positiveReviews = reviews.filter(
    (review) => review.rating >= 4
  ).length;

  const pendingReviews = reviews.filter(
    (review) => review.status === "Pending"
  ).length;

  const filteredReviews = useMemo(() => {
    return reviews.filter((review) => {
      const matchesStatus =
        filter === "All" || review.status === filter;

      const matchesRating =
        selectedRating === "All" ||
        review.rating === Number(selectedRating);

      const query = search.toLowerCase();

      const matchesSearch =
        review.customer.toLowerCase().includes(query) ||
        review.dish.toLowerCase().includes(query) ||
        review.comment.toLowerCase().includes(query);

      return matchesStatus && matchesRating && matchesSearch;
    });
  }, [reviews, filter, selectedRating, search]);

  function updateStatus(id: number, status: Review["status"]) {
    setReviews((current) =>
      current.map((review) =>
        review.id === id ? { ...review, status } : review
      )
    );
  }

  function deleteReview(id: number) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this review?"
    );

    if (!confirmed) return;

    setReviews((current) =>
      current.filter((review) => review.id !== id)
    );
  }

  return (
    <div className="min-h-screen space-y-6 bg-slate-50 p-4 text-slate-800 sm:p-6">
      {/* Header */}
      <div>
        <p className="text-sm font-medium text-orange-600">
          CUSTOMER EXPERIENCE
        </p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
          Ratings & Reviews
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Understand customer feedback and monitor food quality.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Average Rating</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-3xl font-bold">
              {averageRating.toFixed(1)}
            </span>
            <StarRating rating={Math.round(averageRating)} />
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Out of 5 stars
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Total Reviews</p>
          <p className="mt-2 text-3xl font-bold">{reviews.length}</p>
          <p className="mt-2 text-xs text-slate-400">
            All submitted reviews
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Positive Reviews</p>
          <p className="mt-2 text-3xl font-bold">
            {positiveReviews}
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Rated 4 or 5 stars
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Pending Reviews</p>
          <p className="mt-2 text-3xl font-bold">{pendingReviews}</p>
          <p className="mt-2 text-xs text-slate-400">
            Awaiting moderation
          </p>
        </div>
      </div>

      {/* Rating distribution */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-bold">Rating Distribution</h2>
        <p className="mt-1 text-sm text-slate-500">
          Number of reviews received for each star rating.
        </p>

        <div className="mt-5 space-y-3">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = reviews.filter(
              (review) => review.rating === rating
            ).length;

            const percentage =
              reviews.length > 0
                ? (count / reviews.length) * 100
                : 0;

            return (
              <div
                key={rating}
                className="flex items-center gap-3"
              >
                <span className="w-12 text-sm font-medium">
                  {rating} ★
                </span>

                <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                <span className="w-8 text-right text-sm text-slate-500">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reviews section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div>
          <h2 className="text-lg font-bold">Customer Feedback</h2>
          <p className="mt-1 text-sm text-slate-500">
            Review, publish, or remove customer feedback.
          </p>
        </div>

        {/* Search and filters */}
        <div className="mt-5 flex flex-col gap-3 lg:flex-row">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search customer, dish, or comment..."
            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-400"
          />

          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-orange-400"
          >
            <option value="All">All statuses</option>
            <option value="Published">Published</option>
            <option value="Pending">Pending</option>
          </select>

          <select
            value={selectedRating}
            onChange={(event) =>
              setSelectedRating(event.target.value)
            }
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-orange-400"
          >
            <option value="All">All ratings</option>
            <option value="5">5 stars</option>
            <option value="4">4 stars</option>
            <option value="3">3 stars</option>
            <option value="2">2 stars</option>
            <option value="1">1 star</option>
          </select>
        </div>

        {/* Review list */}
        <div className="mt-5 space-y-4">
          {filteredReviews.map((review) => (
            <div
              key={review.id}
              className="rounded-xl border border-slate-200 p-4"
            >
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div className="flex gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-100 font-bold text-orange-700">
                    {review.customer.charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <p className="font-semibold">{review.customer}</p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {review.dish}
                    </p>
                    <div className="mt-1">
                      <StarRating rating={review.rating} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      review.status === "Published"
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {review.status}
                  </span>

                  <span className="text-xs text-slate-400">
                    {review.date}
                  </span>
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-600">
                “{review.comment}”
              </p>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                {review.status === "Pending" ? (
                  <button
                    onClick={() =>
                      updateStatus(review.id, "Published")
                    }
                    className="rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700"
                  >
                    Publish Review
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      updateStatus(review.id, "Pending")
                    }
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                  >
                    Unpublish
                  </button>
                )}

                <button
                  onClick={() => deleteReview(review.id)}
                  className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  Delete Review
                </button>
              </div>
            </div>
          ))}

          {filteredReviews.length === 0 && (
            <div className="py-10 text-center">
              <p className="font-semibold">No reviews found</p>
              <p className="mt-1 text-sm text-slate-500">
                Change your search or filters.
              </p>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Demo mode: reviews and moderation changes exist only in local
        React state. They are not saved to PostgreSQL.
      </p>
    </div>
  );
}
