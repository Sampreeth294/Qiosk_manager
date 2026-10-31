
import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../api/apiClient";

interface Restaurant {
  id: number;
  name: string;
}

interface Category {
  id: number;
  restaurant: number;
  name: string;
  description: string;
  is_active: boolean;
}

interface CategoryForm {
  restaurant: string;
  name: string;
  description: string;
  is_active: boolean;
}

const initialForm: CategoryForm = {
  restaurant: "",
  name: "",
  description: "",
  is_active: true,
};

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [form, setForm] = useState<CategoryForm>(initialForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Load categories and restaurants for refreshes after user actions.
  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [categoryData, restaurantData] = await Promise.all([
        apiRequest<Category[]>("/categories/?include_inactive=true"),
        apiRequest<Restaurant[]>("/restaurants/?include_inactive=true"),
      ]);

      setCategories(categoryData);
      setRestaurants(restaurantData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load data."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch: update state after the asynchronous requests complete.
  useEffect(() => {
    let cancelled = false;

    async function fetchInitialData() {
      try {
        const [categoryData, restaurantData] = await Promise.all([
          apiRequest<Category[]>("/categories/?include_inactive=true"),
          apiRequest<Restaurant[]>("/restaurants/?include_inactive=true"),
        ]);

        if (cancelled) return;

        setCategories(categoryData);
        setRestaurants(restaurantData);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unable to load data."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchInitialData();

    return () => {
      cancelled = true;
    };
  }, []);

  function updateForm<K extends keyof CategoryForm>(
    key: K,
    value: CategoryForm[K]
  ) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
  }

  function editCategory(category: Category) {
    setForm({
      restaurant: String(category.restaurant),
      name: category.name,
      description: category.description || "",
      is_active: category.is_active,
    });

    setEditingId(category.id);
    setError("");
    setMessage("");
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");
    setMessage("");

    const payload = {
      restaurant: Number(form.restaurant),
      name: form.name.trim(),
      description: form.description.trim(),
      is_active: form.is_active,
    };

    if (!payload.restaurant || !payload.name) {
      setError("Select a restaurant and enter a category name.");
      return;
    }

    setSaving(true);

    try {
      const url = editingId
        ? `/categories/${editingId}/update/`
        : "/categories/create/";

      await apiRequest<Category>(url, {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });

      setMessage(
        editingId
          ? "Category updated successfully."
          : "Category created successfully."
      );

      resetForm();
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save category."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleCategory(category: Category) {
    setError("");
    setMessage("");

    try {
      await apiRequest<Category>(
        `/categories/${category.id}/update/`,
        {
          method: "PATCH",
          body: JSON.stringify({
            is_active: !category.is_active,
          }),
        },
      );

      setMessage(
        `${category.name} ${
          category.is_active ? "deactivated" : "activated"
        } successfully.`
      );

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update status."
      );
    }
  }

  function restaurantName(id: number) {
    return (
      restaurants.find((restaurant) => restaurant.id === id)?.name ||
      `Restaurant #${id}`
    );
  }

  const filteredCategories = categories.filter((category) => {
    const query = search.toLowerCase();

    return (
      category.name.toLowerCase().includes(query) ||
      (category.description || "").toLowerCase().includes(query) ||
      restaurantName(category.restaurant).toLowerCase().includes(query)
    );
  });

  const activeCount = categories.filter((c) => c.is_active).length;

  return (
    <main className="min-h-screen bg-gray-50 p-4 text-gray-800 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header>
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
            Qiosk Manager
          </p>
          <h1 className="mt-2 text-3xl font-bold">
            Category Management
          </h1>
          <p className="mt-2 text-gray-500">
            Organize menu items into restaurant categories.
          </p>
        </header>

        {error && (
          <div role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div role="status" className="rounded-lg bg-green-50 p-4 text-green-700">
            {message}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-3">
          <Stat label="Total Categories" value={categories.length} />
          <Stat label="Active Categories" value={activeCount} />
          <Stat
            label="Inactive Categories"
            value={categories.length - activeCount}
          />
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold">
            {editingId ? "Edit Category" : "Add Category"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="restaurant" className="mb-2 block text-sm font-medium">
                  Restaurant *
                </label>
                <select
                  id="restaurant"
                  value={form.restaurant}
                  onChange={(e) => updateForm("restaurant", e.target.value)}
                  required
                  className="w-full rounded-lg border px-3 py-2.5"
                >
                  <option value="">Select restaurant</option>
                  {restaurants.map((restaurant) => (
                    <option key={restaurant.id} value={restaurant.id}>
                      {restaurant.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="name" className="mb-2 block text-sm font-medium">
                  Category Name *
                </label>
                <input
                  id="name"
                  value={form.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                  placeholder="e.g. Starters"
                  maxLength={100}
                  required
                  className="w-full rounded-lg border px-3 py-2.5"
                />
              </div>
            </div>

            <div>
              <label htmlFor="description" className="mb-2 block text-sm font-medium">
                Description
              </label>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) => updateForm("description", e.target.value)}
                placeholder="Enter a short description"
                maxLength={200}
                rows={3}
                className="w-full rounded-lg border px-3 py-2.5"
              />
            </div>

            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => updateForm("is_active", e.target.checked)}
                className="h-4 w-4 accent-indigo-600"
              />
              Category is active
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving || restaurants.length === 0}
                className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Save Changes"
                    : "Create Category"}
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

            {!loading && restaurants.length === 0 && (
              <p className="text-sm text-amber-700">
                No active restaurants found. Add a restaurant first.
              </p>
            )}
          </form>
        </section>

        <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
            <h2 className="text-xl font-semibold">All Categories</h2>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search categories..."
              aria-label="Search categories"
              className="w-full rounded-lg border px-3 py-2 sm:max-w-xs"
            />
          </div>

          {loading ? (
            <p className="p-8 text-center text-gray-500">
              Loading categories...
            </p>
          ) : filteredCategories.length === 0 ? (
            <p className="p-8 text-center text-gray-500">
              No categories found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-5 py-4">Category</th>
                    <th className="px-5 py-4">Restaurant</th>
                    <th className="px-5 py-4">Description</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredCategories.map((category) => (
                    <tr key={category.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4 font-medium">
                        {category.name}
                      </td>
                      <td className="px-5 py-4">
                        {restaurantName(category.restaurant)}
                      </td>
                      <td className="px-5 py-4 text-gray-500">
                        {category.description || "—"}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            category.is_active
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {category.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-4">
                          <button
                            type="button"
                            onClick={() => editCategory(category)}
                            className="font-medium text-indigo-600"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void toggleCategory(category)}
                            className={`font-medium ${
                              category.is_active
                                ? "text-red-600"
                                : "text-green-600"
                            }`}
                          >
                            {category.is_active ? "Deactivate" : "Activate"}
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}
