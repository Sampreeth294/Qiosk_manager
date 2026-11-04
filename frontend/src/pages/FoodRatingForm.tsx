import { useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { apiRequest } from "../api/apiClient";
import { resolveRatingOrderNumber } from "../api/ratingOrderLookup";

type EligibleOrderItem = { order_item_id: number; name: string };
type VerifiedOrder = {
  order_number: string;
  display_order_number: string | null;
  items: EligibleOrderItem[];
  already_rated: boolean;
};

export default function FoodRatingForm() {
  const location = useLocation();
  const initialState =
    location.state && typeof location.state === "object"
      ? (location.state as Record<string, unknown>)
      : {};
  const initialPrivateOrderNumber =
    typeof initialState.order_number === "string"
      ? initialState.order_number
      : "";
  const initialOrderNumber =
    typeof initialState.display_order_number === "string"
      ? initialState.display_order_number
      : initialPrivateOrderNumber;
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [verifiedOrder, setVerifiedOrder] = useState<VerifiedOrder | null>(null);
  const [selectedItem, setSelectedItem] = useState<number | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function findOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!orderNumber.trim()) {
      setError("Enter your order or token number.");
      return;
    }

    setLookingUp(true);
    setError("");
    setNotice("");
    setVerifiedOrder(null);
    setRating(0);
    setComment("");
    const resolvedOrderNumber =
      orderNumber === initialOrderNumber && initialPrivateOrderNumber
        ? initialPrivateOrderNumber
        : resolveRatingOrderNumber(orderNumber);
    if (!resolvedOrderNumber) {
      setError(
        "That token or order reference could not be found. Please check your printed receipt or enter the order ID.",
      );
      setLookingUp(false);
      return;
    }

    try {
      const verified = await apiRequest<VerifiedOrder>("/food-ratings/verify/", {
        method: "POST",
        body: JSON.stringify({ order_number: resolvedOrderNumber }),
      });
      setVerifiedOrder(verified);
      setSelectedItem(verified.items[0]?.order_item_id ?? null);
      if (verified.already_rated) {
        setNotice("Ratings for all items in this order have already been submitted. Thank you!");
      } else if (verified.items.length === 0) {
        setNotice("This order has no dishes eligible for rating.");
      }
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "";
      setError(message || "We couldn't check this order right now. Please try again.");
    } finally {
      setLookingUp(false);
    }
  }

  async function submitRating(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!verifiedOrder || selectedItem === null || rating < 1 || submitting) return;
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      await apiRequest("/food-ratings/", {
        method: "POST",
        body: JSON.stringify({
          order_number: verifiedOrder.order_number,
          order_item_id: selectedItem,
          rating,
          comment,
        }),
      });
      const remaining = verifiedOrder.items.filter((item) => item.order_item_id !== selectedItem);
      setVerifiedOrder({
        ...verifiedOrder,
        items: remaining,
        already_rated: remaining.length === 0,
      });
      setSelectedItem(remaining[0]?.order_item_id ?? null);
      setRating(0);
      setComment("");
      setNotice(
        remaining.length
          ? "Thank you! Your rating has been submitted. You can rate another dish from this order below."
          : "Thank you! All your ratings have been submitted. Your feedback helps make the canteen better!",
      );
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "";
      setError(message || "We couldn't submit your rating right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-canteen-order px-4 py-8 text-white sm:px-6">
      <div className="w-full max-w-2xl space-y-6">
        <header className="rounded-3xl border-2 border-white/20 bg-slate-950/85 p-6 shadow-2xl backdrop-blur-2xl sm:p-8">
          <div className="flex items-center justify-between gap-3">
<<<<<<< HEAD
            <Link to="/" aria-label="Kiosk Manager home" className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600 text-xl font-black text-white">
              K
=======
            <Link
              to="/"
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-2xl font-black text-slate-950 shadow-lg shadow-amber-500/25 transition hover:scale-105"
            >
              Q
>>>>>>> 89d3e54 (Save my local changes)
            </Link>
            <div className="flex gap-4">
              <Link to="/order" className="text-sm font-bold text-amber-400 hover:underline">
                Order food
              </Link>
              <Link to="/" className="text-sm font-bold text-slate-300 hover:underline">
                Kiosk home
              </Link>
            </div>
          </div>
          <p className="mt-6 text-xs font-black uppercase tracking-widest text-amber-300">
            RV COLLEGE OF ENGINEERING CANTEEN FEEDBACK
          </p>
          <h1 className="mt-1 text-3xl font-black text-white sm:text-4xl">How Was Your Meal?</h1>
          <p className="mt-2 text-base text-slate-300">
            Tell us about taste, freshness, and service to help us keep quality top notch!
          </p>
        </header>

        {error && (
          <p role="alert" className="rounded-2xl border border-rose-500 bg-rose-950/80 p-4 text-base font-bold text-rose-300 shadow-xl backdrop-blur-md">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="rounded-2xl border border-emerald-500 bg-emerald-950/80 p-4 text-base font-bold text-emerald-300 shadow-xl backdrop-blur-md">
            {notice}
          </p>
        )}

        {!verifiedOrder ? (
          <form onSubmit={findOrder} className="space-y-6 rounded-3xl border-2 border-white/20 bg-slate-950/85 p-6 shadow-2xl backdrop-blur-2xl sm:p-8">
            <label className="block text-base font-bold text-slate-200">
              Enter Order / Token Number:
              <input
                value={orderNumber}
                onChange={(event) => setOrderNumber(event.target.value)}
                autoComplete="off"
                required
                className="mt-3 block w-full rounded-2xl border-2 border-white/20 bg-slate-900/90 px-4 py-4 text-xl font-bold text-white placeholder-slate-400 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20"
                placeholder="e.g. #042 or short order number"
              />
            </label>
            <p className="text-xs text-slate-400">
              Enter the token number from your receipt or the order code shown on your screen.
            </p>
            <button
              type="submit"
              disabled={lookingUp}
              className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 py-4 text-lg font-black text-slate-950 shadow-xl hover:brightness-110 active:scale-95 disabled:cursor-wait disabled:opacity-60"
            >
              {lookingUp ? "Searching Order..." : "Find My Order & Rate Dishes →"}
            </button>
          </form>
        ) : verifiedOrder.items.length > 0 ? (
          <form onSubmit={submitRating} className="space-y-6 rounded-3xl border-2 border-white/20 bg-slate-950/85 p-6 shadow-2xl backdrop-blur-2xl sm:p-8">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-amber-400">Rating Dish for Token</span>
              <h2 className="text-2xl font-black text-white">#{verifiedOrder.display_order_number ?? verifiedOrder.order_number}</h2>
            </div>

            <div>
              <label className="block text-base font-bold text-slate-200 mb-2">Select Dish to Rate:</label>
              <select
                value={selectedItem ?? ""}
                onChange={(event) => {
                  setSelectedItem(Number(event.target.value));
                  setRating(0);
                  setComment("");
                }}
                className="block w-full rounded-2xl border-2 border-white/20 bg-slate-900 px-4 py-4 text-lg font-bold text-white outline-none focus:border-amber-400"
              >
                {verifiedOrder.items.map((item) => (
                  <option key={item.order_item_id} value={item.order_item_id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <fieldset>
              <legend className="text-base font-bold text-slate-200">Your Star Rating (1 to 5 Stars):</legend>
              <div className="mt-4 flex gap-4" role="radiogroup" aria-label="Rate your food from one to five stars">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-white/20 bg-slate-900 text-4xl transition hover:scale-110 active:scale-90"
                  >
                    <span className={value <= rating ? "text-amber-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.8)]" : "text-slate-600"}>
                      ★
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Quick Feedback Tags */}
            <div>
              <label className="block text-base font-bold text-slate-200 mb-2">
                Feedback Comments:
              </label>
              <div className="mb-3 flex flex-wrap gap-2">
                {["Super Delicious! 😋", "Hot & Fresh ♨️", "Crispy & Perfect ✨", "Authentic Taste 🌶️", "Good Portion Size 👍"].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setComment((prev) => (prev ? `${prev} • ${chip}` : chip))}
                    className="rounded-full border border-white/15 bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-amber-300 hover:border-amber-400 hover:bg-slate-800"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
              <textarea
                value={comment}
                maxLength={1000}
                onChange={(event) => setComment(event.target.value)}
                rows={3}
                className="w-full rounded-2xl border-2 border-white/20 bg-slate-900/90 p-4 text-base font-medium text-white placeholder-slate-400 outline-none focus:border-amber-400"
                placeholder="Tell us what you loved or how we can improve..."
              />
            </div>

            <button
              type="submit"
              disabled={rating < 1 || submitting}
              className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 py-4 text-xl font-black text-slate-950 shadow-xl transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Submitting Rating..." : "Submit Rating & Feedback ⭐"}
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => {
              setVerifiedOrder(null);
              setOrderNumber("");
              setNotice("");
            }}
            className="w-full rounded-2xl border-2 border-white/20 bg-slate-900 py-4 text-lg font-bold text-white hover:bg-slate-800"
          >
            ← Rate Another Order
          </button>
        )}
      </div>
    </main>
  );
}
