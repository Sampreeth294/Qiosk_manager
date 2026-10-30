
import { useEffect, useState, type FormEvent } from "react";

const API_BASE_URL = "http://127.0.0.1:8001/api";

interface Category {
  id: number;
  name: string;
  restaurant: number;
}

interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: string;
  image_url?: string | null;
  category: number;
  is_active: boolean;
}

function Menu() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingAvailability, setUpdatingAvailability] =
    useState<number | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [image, setImage] = useState<File | null>(null);

  // Load menu items and categories from Django.
  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [itemsResponse, categoriesResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/menu-items/?include_inactive=true`),
        fetch(`${API_BASE_URL}/categories/`),
      ]);

      if (!itemsResponse.ok || !categoriesResponse.ok) {
        throw new Error("Failed to load menu data.");
      }

      const itemsData: MenuItem[] = await itemsResponse.json();
      const categoriesData: Category[] =
        await categoriesResponse.json();

      setItems(itemsData);
      setCategories(categoriesData);
    } catch {
      setError(
        "Could not load menu data. Check Django, the API URLs, and the backend port."
      );
    } finally {
      setLoading(false);
    }
  }

  // Load data once when the component mounts.
  useEffect(() => {
    void loadData();
  }, []);

  // Clear the form and its file input.
  function resetForm() {
    setName("");
    setDescription("");
    setPrice("");
    setCategoryId("");
    setIsActive(true);
    setImage(null);
    setEditingItem(null);

    const fileInput = document.getElementById(
      "menu-image"
    ) as HTMLInputElement | null;

    if (fileInput) {
      fileInput.value = "";
    }
  }

  // Find a category name from its ID.
  function getCategoryName(id: number): string {
    const category = categories.find((item) => item.id === id);

    return category?.name ?? "Unknown category";
  }

  // Open the form with an existing item's information.
  function handleEdit(item: MenuItem) {
    resetForm();

    setEditingItem(item);
    setName(item.name);
    setDescription(item.description || "");
    setPrice(String(item.price));
    setCategoryId(String(item.category));
    setIsActive(item.is_active);

    setError("");
    setSuccess("");
    setShowForm(true);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Add a new item or update an existing item.
  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("Please enter a food item name.");
      return;
    }

    const numericPrice = Number(price);

    if (
      !price ||
      !Number.isFinite(numericPrice) ||
      numericPrice <= 0 ||
      numericPrice > 999999.99
    ) {
      setError("Enter a valid price greater than zero.");
      return;
    }

    if (!categoryId) {
      setError("Please select a category.");
      return;
    }

    if (image && !image.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    if (image && image.size > 5 * 1024 * 1024) {
      setError("The image must be smaller than 5 MB.");
      return;
    }

    const itemBeingEdited = editingItem;
    const itemName = name.trim();

    const formData = new FormData();

    formData.append("name", itemName);
    formData.append("description", description.trim());
    formData.append("price", numericPrice.toFixed(2));
    formData.append("category", categoryId);
    formData.append("is_active", String(isActive));

    if (image) {
      formData.append("image", image);
    }

    setSaving(true);

    try {
      const url = itemBeingEdited
        ? `${API_BASE_URL}/menu-items/${itemBeingEdited.id}/update/`
        : `${API_BASE_URL}/menu-items/create/`;

      const response = await fetch(url, {
        method: itemBeingEdited ? "PATCH" : "POST",
        body: formData,
      });

      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          responseData && typeof responseData === "object"
            ? Object.entries(responseData)
                .map(([field, messages]) => {
                  const detail = Array.isArray(messages)
                    ? messages.join(", ")
                    : String(messages);

                  return `${field}: ${detail}`;
                })
                .join(" | ")
            : "Failed to save the menu item.";

        throw new Error(message);
      }

      resetForm();
      setShowForm(false);

      setSuccess(
        itemBeingEdited
          ? `${itemName} updated successfully.`
          : `${itemName} added successfully.`
      );

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while saving."
      );
    } finally {
      setSaving(false);
    }
  }

  // Change availability without deleting the item.
  async function toggleAvailability(item: MenuItem) {
    setError("");
    setSuccess("");
    setUpdatingAvailability(item.id);

    try {
      const response = await fetch(
        `${API_BASE_URL}/menu-items/${item.id}/update/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            is_active: !item.is_active,
          }),
        }
      );

      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          responseData && typeof responseData === "object"
            ? JSON.stringify(responseData)
            : "Failed to update availability.";

        throw new Error(message);
      }

      setSuccess(
        `${item.name} is now ${
          item.is_active ? "unavailable" : "available"
        }.`
      );

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update availability."
      );
    } finally {
      setUpdatingAvailability(null);
    }
  }

  function handleCancel() {
    resetForm();
    setShowForm(false);
    setError("");
  }

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold">Menu Management</h3>
          <p className="mt-1 text-sm text-slate-500">
            Manage food items, prices, categories, and availability.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (showForm) {
              handleCancel();
            } else {
              resetForm();
              setError("");
              setSuccess("");
              setShowForm(true);
            }
          }}
          className="rounded-lg bg-violet-600 px-5 py-3 font-medium text-white hover:bg-violet-700"
        >
          {showForm ? "Cancel" : "+ Add Menu Item"}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* Success message */}
      {success && (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          {success}
        </div>
      )}

      {/* Add/Edit form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div>
            <h4 className="text-xl font-semibold">
              {editingItem ? "Edit Menu Item" : "Add New Menu Item"}
            </h4>

            <p className="mt-1 text-sm text-slate-500">
              {editingItem
                ? `Editing ${editingItem.name} (ID: ${editingItem.id})`
                : "Enter the food details below."}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Food name */}
            <div>
              <label
                htmlFor="menu-name"
                className="mb-2 block text-sm font-medium"
              >
                Food Name *
              </label>

              <input
                id="menu-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Masala Dosa"
                maxLength={100}
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
              />
            </div>

            {/* Price */}
            <div>
              <label
                htmlFor="menu-price"
                className="mb-2 block text-sm font-medium"
              >
                Price (₹) *
              </label>

              <input
                id="menu-price"
                type="number"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                min="0.01"
                max="999999.99"
                step="0.01"
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
              />
            </div>

            {/* Category */}
            <div>
              <label
                htmlFor="menu-category"
                className="mb-2 block text-sm font-medium"
              >
                Category *
              </label>

              <select
                id="menu-category"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
              >
                <option value="">Select a category</option>

                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              {categories.length === 0 && !loading && (
                <p className="mt-2 text-sm text-amber-700">
                  No categories found. Create a category in Django Admin.
                </p>
              )}
            </div>

            {/* Image upload */}
            <div>
              <label
                htmlFor="menu-image"
                className="mb-2 block text-sm font-medium"
              >
                {editingItem
                  ? "Replace Image (optional)"
                  : "Food Image (optional)"}
              </label>

              <input
                id="menu-image"
                type="file"
                accept="image/*"
                onChange={(event) =>
                  setImage(event.target.files?.[0] ?? null)
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
              />

              <p className="mt-1 text-xs text-slate-500">
                Maximum file size: 5 MB.
                {editingItem && " Leave empty to keep the current image."}
              </p>
            </div>
          </div>

          {/* Current image preview */}
          {editingItem?.image_url && !image && (
            <div>
              <p className="mb-2 text-sm font-medium">Current Image</p>
              <img
                src={editingItem.image_url}
                alt={editingItem.name}
                className="h-24 w-24 rounded-lg object-cover"
              />
            </div>
          )}

          {/* Description */}
          <div>
            <label
              htmlFor="menu-description"
              className="mb-2 block text-sm font-medium"
            >
              Description
            </label>

            <textarea
              id="menu-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe the food item..."
              rows={3}
              maxLength={200}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
            />
          </div>

          {/* Availability checkbox */}
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              className="h-4 w-4 accent-violet-600"
            />

            <span className="text-sm font-medium">
              Available on the menu
            </span>
          </label>

          {/* Save and cancel */}
          <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-5">
            <button
              type="submit"
              disabled={saving || categories.length === 0}
              className="rounded-lg bg-violet-600 px-5 py-3 font-medium text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : editingItem
                  ? "Save Changes"
                  : "Save Menu Item"}
            </button>

            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="rounded-lg border border-slate-300 px-5 py-3 font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Menu count */}
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold">All Menu Items</h4>

        <span className="rounded-full bg-violet-100 px-4 py-2 text-sm font-medium text-violet-700">
          {items.length} menu items
        </span>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="rounded-xl bg-white p-8 text-center text-slate-500">
          Loading menu items...
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && items.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <h4 className="text-lg font-semibold">No menu items yet</h4>
          <p className="mt-2 text-sm text-slate-500">
            Click Add Menu Item to create your first item.
          </p>
        </div>
      )}

      {/* Menu items table */}
      {!loading && items.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-medium">Food Item</th>
                  <th className="px-6 py-4 font-medium">Category</th>
                  <th className="px-6 py-4 font-medium">Price</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    {/* Food name and image */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="h-12 w-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-xl">
                            🍽️
                          </div>
                        )}

                        <div>
                          <p className="font-semibold text-slate-800">
                            {item.name}
                          </p>

                          <p className="mt-1 max-w-xs truncate text-slate-500">
                            {item.description || "No description"}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Category name */}
                    <td className="px-6 py-4">
                      {getCategoryName(item.category)}
                    </td>

                    {/* Price */}
                    <td className="px-6 py-4 font-semibold">
                      ₹{Number(item.price).toFixed(2)}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          item.is_active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {item.is_active ? "Available" : "Unavailable"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(item)}
                          className="rounded-lg border border-violet-200 px-3 py-2 font-medium text-violet-700 hover:bg-violet-50"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => void toggleAvailability(item)}
                          disabled={updatingAvailability === item.id}
                          className={`rounded-lg px-3 py-2 font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
                            item.is_active
                              ? "bg-red-50 text-red-700 hover:bg-red-100"
                              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          }`}
                        >
                          {updatingAvailability === item.id
                            ? "Updating..."
                            : item.is_active
                              ? "Mark Unavailable"
                              : "Make Available"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default Menu;
