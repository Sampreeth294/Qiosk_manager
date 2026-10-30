
import { useEffect, useState } from "react";

interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: string;
  image_url?: string | null;
  category: number;
  is_active: boolean;
}

function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchMenuItems() {
      try {
        const response = await fetch(
          "http://127.0.0.1:8000/api/menu-items/"
        );

        if (!response.ok) {
          throw new Error("Unable to load menu items.");
        }

        const data: MenuItem[] = await response.json();
        setItems(data);
      } catch {
        setError(
          "Could not connect to Django. Check that the backend is running."
        );
      } finally {
        setLoading(false);
      }
    }

    fetchMenuItems();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold">Menu Management</h3>
          <p className="mt-1 text-sm text-slate-500">
            Manage your restaurant food items and prices.
          </p>
        </div>

        <span className="rounded-lg bg-violet-100 px-4 py-2 text-sm font-medium text-violet-700">
          {items.length} menu items
        </span>
      </div>

      {loading && (
        <p className="rounded-xl bg-white p-6 text-slate-500">
          Loading menu items...
        </p>
      )}

      {error && (
        <p className="rounded-xl bg-red-50 p-4 text-red-700">
          {error}
        </p>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <h4 className="text-lg font-semibold">No menu items yet</h4>
          <p className="mt-2 text-sm text-slate-500">
            Add menu items through Django Admin for now. We'll build the
            add-item form next.
          </p>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-medium">Food item</th>
                  <th className="px-6 py-4 font-medium">Category ID</th>
                  <th className="px-6 py-4 font-medium">Price</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
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

                    <td className="px-6 py-4">{item.category}</td>

                    <td className="px-6 py-4 font-semibold">
                      ₹{Number(item.price).toFixed(2)}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          item.is_active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {item.is_active ? "Active" : "Inactive"}
                      </span>
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

export default MenuPage;
