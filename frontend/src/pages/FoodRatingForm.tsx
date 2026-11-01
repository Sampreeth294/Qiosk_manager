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
      ? location.state as Record<string, unknown>
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
      setError("Enter your order number.");
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
        "That short order number is only available on the device used to place the order. Use the rating button on your receipt or enter your private order reference.",
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
        setNotice("Ratings for this order have already been submitted.");
      } else if (verified.items.length === 0) {
        setNotice("This order has no dishes available for rating.");
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
      setNotice(remaining.length
        ? "Thank you — your rating has been submitted. You can rate another dish."
        : "Thank you — your rating has been submitted successfully.");
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "";
      setError(message || "We couldn't submit your rating right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 text-slate-900 sm:px-6">
      <div className="w-full max-w-2xl space-y-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <Link to="/" aria-label="Qiosk Manager home" className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600 text-xl font-black text-white">
              Q
            </Link>
            <Link to="/" className="text-sm font-semibold text-violet-700 hover:underline">
              Customer home
            </Link>
          </div>
          <p className="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-violet-700">
            Customer feedback
          </p>
          <h1 className="mt-2 text-3xl font-black">How Was Your Food?</h1>
          <p className="mt-2 text-slate-600">
            Your feedback helps us improve our dishes and serve you better.
          </p>
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

        {!verifiedOrder ? (
          <form onSubmit={findOrder} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <label className="block text-sm font-semibold text-slate-700">
              Order number
              <input
                value={orderNumber}
                onChange={(event) => setOrderNumber(event.target.value)}
                autoComplete="off"
                required
                className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                placeholder="Enter the order number on your receipt"
              />
            </label>
            <p className="text-xs leading-5 text-slate-500">
              Enter the short number from your receipt on the device used to place the order. You can also use the Rate your food button on your receipt.
            </p>
            <button
              type="submit"
              disabled={lookingUp}
              className="w-full rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white hover:bg-violet-700 disabled:cursor-wait disabled:opacity-60"
            >
              {lookingUp ? "Finding your order…" : "Find My Order"}
            </button>
          </form>
        ) : verifiedOrder.items.length > 0 ? (
          <form onSubmit={submitRating} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Dishes in order #{verifiedOrder.display_order_number ?? verifiedOrder.order_number}</h2>
              <p className="mt-1 text-sm text-slate-500">Only dishes in this completed order can be rated.</p>
            </div>
            <label className="block text-sm font-semibold text-slate-700">
              Dish
              <select
                value={selectedItem ?? ""}
                onChange={(event) => {
                  setSelectedItem(Number(event.target.value));
                  setRating(0);
                  setComment("");
                }}
                className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
              >
                {verifiedOrder.items.map((item) => (
                  <option key={item.order_item_id} value={item.order_item_id}>{item.name}</option>
                ))}
              </select>
            </label>
            <fieldset>
              <legend className="text-sm font-semibold text-slate-700">Your rating</legend>
              <div className="mt-3 flex gap-2" role="radiogroup" aria-label="Rate your food from one to five stars">
                {[1, 2, 3, 4, 5].map((value) => (
                  <label key={value} className="cursor-pointer rounded focus-within:outline focus-within:outline-2 focus-within:outline-violet-600">
                    <input
                      type="radio"
                      name="food-rating"
                      value={value}
                      checked={rating === value}
                      onChange={() => setRating(value)}
                      className="sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={`text-3xl ${value <= rating ? "text-amber-400" : "text-slate-300"}`}
                    >
                      ★
                    </span>
                    <span className="sr-only">{value} star{value === 1 ? "" : "s"}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="block text-sm font-semibold text-slate-700">
              Feedback (optional)
              <textarea
                value={comment}
                maxLength={1000}
                onChange={(event) => setComment(event.target.value)}
                rows={4}
                className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-3 font-normal"
                placeholder="Tell us what you liked or what we could improve."
              />
            </label>
            <button
              type="submit"
              disabled={rating < 1 || submitting}
              className="w-full rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit rating"}
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
            className="w-full rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
          >
            Find another order
          </button>
        )}
      </div>
    </main>
  );
}
