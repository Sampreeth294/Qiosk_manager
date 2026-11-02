
import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../api/apiClient";

interface Restaurant {
  id: number;
  name: string;
  address: string;
  phone_number: string;
  is_active: boolean;
}

interface RestaurantForm {
  name: string;
  address: string;
  phone_number: string;
  is_active: boolean;
}

const initialForm: RestaurantForm = {
  name: "",
  address: "",
  phone_number: "",
  is_active: true,
};

function Stat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}

export default function Restaurants() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [form, setForm] = useState<RestaurantForm>(initialForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Refresh restaurants after create, edit, or status changes.
  const loadRestaurants = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest<Restaurant[]>(
        "/restaurants/?include_inactive=true",
      );
      setRestaurants(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load restaurants.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load: update state after the asynchronous request completes.
  useEffect(() => {
    let cancelled = false;

    async function fetchInitialRestaurants() {
      try {
        const data = await apiRequest<Restaurant[]>(
          "/restaurants/?include_inactive=true",
        );

        if (!cancelled) {
          setRestaurants(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load restaurants.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchInitialRestaurants();

    return () => {
      cancelled = true;
    };
  }, []);

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    const payload: RestaurantForm = {
      name: form.name.trim(),
      address: form.address.trim(),
      phone_number: form.phone_number.trim(),
      is_active: form.is_active,
    };

    if (!payload.name || !payload.address) {
      setError("Restaurant name and address are required.");
      setSaving(false);
      return;
    }

    try {
      const url = editingId !== null
        ? `/restaurants/${editingId}/update/`
        : "/restaurants/create/";

      await apiRequest<Restaurant>(url, {
        method: editingId !== null ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });

      setMessage(
        editingId !== null
          ? "Restaurant updated successfully."
          : "Restaurant created successfully.",
      );

      resetForm();
      await loadRestaurants();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save restaurant.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(restaurant: Restaurant) {
    setError("");
    setMessage("");

    try {
      await apiRequest<Restaurant>(
        `/restaurants/${restaurant.id}/update/`,
        {
          method: "PATCH",
          body: JSON.stringify({
            is_active: !restaurant.is_active,
          }),
        },
      );

      setMessage(
        `${restaurant.name} ${
          restaurant.is_active ? "deactivated" : "activated"
        } successfully.`,
      );

      await loadRestaurants();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to change status.",
      );
    }
  }

  const filtered = restaurants.filter((restaurant) => {
    const query = search.toLowerCase();

    return (
      restaurant.name.toLowerCase().includes(query) ||
      restaurant.address.toLowerCase().includes(query) ||
      restaurant.phone_number.includes(query)
    );
  });

  const activeCount = restaurants.filter(
    (restaurant) => restaurant.is_active,
  ).length;

  return (
    <main className="min-h-screen bg-gray-50 p-4 text-gray-800 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Page heading */}
        <header>
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
            Kiosk Manager
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Restaurant Management
          </h1>

          <p className="mt-2 text-gray-500">
            Manage restaurant details and availability.
          </p>
        </header>

        {/* Feedback messages */}
        {error && (
          <div
            role="alert"
            className="rounded-lg bg-red-50 p-4 text-red-700"
          >
            {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            className="rounded-lg bg-green-50 p-4 text-green-700"
          >
            {message}
          </div>
        )}

        {/* Restaurant statistics */}
        <section className="grid gap-4 sm:grid-cols-3">
          <Stat label="Total Restaurants" value={restaurants.length} />
          <Stat label="Active" value={activeCount} />
          <Stat
            label="Inactive"
            value={restaurants.length - activeCount}
          />
        </section>

        {/* Add and edit restaurant form */}
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold">
            {editingId !== null ? "Edit Restaurant" : "Add Restaurant"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium"
                >
                  Restaurant Name *
                </label>

                <input
                  id="name"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  required
                  maxLength={100}
                  placeholder="Enter restaurant name"
                  className="w-full rounded-lg border px-3 py-2.5"
                />
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="mb-2 block text-sm font-medium"
                >
                  Phone Number
                </label>

                <input
                  id="phone"
                  type="tel"
                  value={form.phone_number}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      phone_number: e.target.value,
                    })
                  }
                  maxLength={10}
                  placeholder="Enter phone number"
                  className="w-full rounded-lg border px-3 py-2.5"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="address"
                className="mb-2 block text-sm font-medium"
              >
                Address *
              </label>

              <textarea
                id="address"
                value={form.address}
                onChange={(e) =>
                  setForm({ ...form, address: e.target.value })
                }
                required
                maxLength={200}
                rows={3}
                placeholder="Enter restaurant address"
                className="w-full rounded-lg border px-3 py-2.5"
              />
            </div>

            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) =>
                  setForm({
                    ...form,
                    is_active: e.target.checked,
                  })
                }
                className="h-4 w-4 accent-indigo-600"
              />
              Restaurant is active
            </label>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingId !== null
                    ? "Save Changes"
                    : "Create Restaurant"}
              </button>

              {editingId !== null && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border px-5 py-2.5"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        {/* Restaurant list */}
        <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
            <h2 className="text-xl font-semibold">
              All Restaurants
            </h2>

            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search restaurants..."
              aria-label="Search restaurants"
              className="w-full rounded-lg border px-3 py-2 sm:max-w-xs"
            />
          </div>

          {loading ? (
            <p className="p-8 text-center text-gray-500">
              Loading...
            </p>
          ) : filtered.length === 0 ? (
            <p className="p-8 text-center text-gray-500">
              No restaurants found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-5 py-4">Restaurant</th>
                    <th className="px-5 py-4">Phone</th>
                    <th className="px-5 py-4">Address</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {filtered.map((restaurant) => (
                    <tr
                      key={restaurant.id}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-5 py-4 font-medium">
                        {restaurant.name}
                      </td>

                      <td className="px-5 py-4">
                        {restaurant.phone_number || "—"}
                      </td>

                      <td className="px-5 py-4">
                        {restaurant.address}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs ${
                            restaurant.is_active
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {restaurant.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-4">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(restaurant.id);
                              setForm({
                                name: restaurant.name,
                                address: restaurant.address,
                                phone_number:
                                  restaurant.phone_number || "",
                                is_active: restaurant.is_active,
                              });
                              setError("");
                              setMessage("");
                            }}
                            className="font-medium text-indigo-600"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => void toggleStatus(restaurant)}
                            className={`font-medium ${
                              restaurant.is_active
                                ? "text-red-600"
                                : "text-green-600"
                            }`}
                          >
                            {restaurant.is_active
                              ? "Deactivate"
                              : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
