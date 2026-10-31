
import { useMemo, useState } from "react";
import type { FormEvent } from "react";

type Supplier = {
  id: number;
  name: string;
  contact: string;
  email: string;
  phone: string;
  category: string;
  status: "Active" | "Inactive";
};

const initialSuppliers: Supplier[] = [
  {
    id: 1,
    name: "Fresh Farm Supplies",
    contact: "Rahul Sharma",
    email: "freshfarm@example.com",
    phone: "9876543210",
    category: "Vegetables & Dairy",
    status: "Active",
  },
  {
    id: 2,
    name: "Daily Needs Co.",
    contact: "Priya Kumar",
    email: "dailyneeds@example.com",
    phone: "9876543211",
    category: "Grains & Essentials",
    status: "Active",
  },
  {
    id: 3,
    name: "Green Basket",
    contact: "Arun Kumar",
    email: "greenbasket@example.com",
    phone: "9876543212",
    category: "Vegetables",
    status: "Active",
  },
  {
    id: 4,
    name: "Morning Dairy",
    contact: "Sneha Rao",
    email: "morningdairy@example.com",
    phone: "9876543213",
    category: "Dairy",
    status: "Inactive",
  },
  {
    id: 5,
    name: "Spice Route",
    contact: "Vijay Patel",
    email: "spiceroute@example.com",
    phone: "9876543214",
    category: "Spices",
    status: "Active",
  },
];

const emptyForm = {
  name: "",
  contact: "",
  email: "",
  phone: "",
  category: "Vegetables",
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100";

export default function Suppliers() {
  const [suppliers, setSuppliers] =
    useState<Supplier[]>(initialSuppliers);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState(emptyForm);

  const activeCount = suppliers.filter(
    (supplier) => supplier.status === "Active"
  ).length;

  const inactiveCount = suppliers.length - activeCount;

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((supplier) => {
      const searchText = [
        supplier.name,
        supplier.contact,
        supplier.email,
        supplier.phone,
        supplier.category,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchText.includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "All" ||
        supplier.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [suppliers, search, statusFilter]);

  function openAddForm() {
    setEditingId(null);
    setForm(emptyForm);
    setNotice("");
    setShowForm(true);
  }

  function openEditForm(supplier: Supplier) {
    setEditingId(supplier.id);

    setForm({
      name: supplier.name,
      contact: supplier.contact,
      email: supplier.email,
      phone: supplier.phone,
      category: supplier.category,
    });

    setNotice("");
    setShowForm(true);
  }

  function saveSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = form.name.trim();
    const contact = form.contact.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();

    if (!name || !contact || !email || !phone) {
      setNotice("Please complete all required fields.");
      return;
    }

    const duplicate = suppliers.some(
      (supplier) =>
        supplier.name.toLowerCase() === name.toLowerCase() &&
        supplier.id !== editingId
    );

    if (duplicate) {
      setNotice("A supplier with this name already exists.");
      return;
    }

    if (editingId !== null) {
      setSuppliers((current) =>
        current.map((supplier) =>
          supplier.id === editingId
            ? { ...supplier, ...form, name, contact, email, phone }
            : supplier
        )
      );

      setNotice("Supplier updated successfully.");
    } else {
      const newSupplier: Supplier = {
        id:
          Math.max(0, ...suppliers.map((supplier) => supplier.id)) + 1,
        name,
        contact,
        email,
        phone,
        category: form.category,
        status: "Active",
      };

      setSuppliers((current) => [...current, newSupplier]);
      setNotice("Supplier added successfully.");
    }

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function toggleStatus(id: number) {
    setSuppliers((current) =>
      current.map((supplier) =>
        supplier.id === id
          ? {
              ...supplier,
              status:
                supplier.status === "Active" ? "Inactive" : "Active",
            }
          : supplier
      )
    );

    setNotice("Supplier status updated.");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm text-slate-500">
            Management / Suppliers
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Supplier Management
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage supplier contacts and ingredient providers.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddForm}
          className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
        >
          + Add supplier
        </button>
      </div>

      {/* Notification */}
      {notice && (
        <div
          role="status"
          className="flex items-center justify-between rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800"
        >
          <span>{notice}</span>

          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="Dismiss notification"
            className="ml-3 text-lg font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard
          title="Total suppliers"
          value={suppliers.length}
          description="All registered suppliers"
          symbol="▦"
        />

        <SummaryCard
          title="Active suppliers"
          value={activeCount}
          description="Available for supply"
          symbol="✓"
        />

        <SummaryCard
          title="Inactive suppliers"
          value={inactiveCount}
          description="Currently unavailable"
          symbol="○"
        />
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <form
          onSubmit={saveSupplier}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="mb-5">
            <h2 className="font-bold text-slate-900">
              {editingId === null ? "Add new supplier" : "Edit supplier"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Enter the supplier's contact information.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="Supplier name">
              <input
                required
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                placeholder="Company name"
                className={inputClass}
              />
            </FormField>

            <FormField label="Contact person">
              <input
                required
                value={form.contact}
                onChange={(event) =>
                  setForm({ ...form, contact: event.target.value })
                }
                placeholder="Contact person's name"
                className={inputClass}
              />
            </FormField>

            <FormField label="Email address">
              <input
                required
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value })
                }
                placeholder="supplier@example.com"
                className={inputClass}
              />
            </FormField>

            <FormField label="Phone number">
              <input
                required
                type="tel"
                pattern="[0-9+\-\s()]{7,20}"
                value={form.phone}
                onChange={(event) =>
                  setForm({ ...form, phone: event.target.value })
                }
                placeholder="Contact number"
                className={inputClass}
              />
            </FormField>

            <FormField label="Supply category">
              <select
                value={form.category}
                onChange={(event) =>
                  setForm({ ...form, category: event.target.value })
                }
                className={inputClass}
              >
                <option>Vegetables</option>
                <option>Grains</option>
                <option>Dairy</option>
                <option>Spices</option>
                <option>Essentials</option>
                <option>Meat & Seafood</option>
                <option>Beverages</option>
                <option>Multiple categories</option>
              </select>
            </FormField>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="submit"
              className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
            >
              {editingId === null ? "Save supplier" : "Update supplier"}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setForm(emptyForm);
              }}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Supplier table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-bold text-slate-900">
              Registered suppliers
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Showing {filteredSuppliers.length} of {suppliers.length} suppliers
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search suppliers..."
              className={`${inputClass} sm:w-64`}
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className={inputClass}
            >
              <option value="All">All statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4 font-semibold">Supplier</th>
                <th className="px-5 py-4 font-semibold">Contact person</th>
                <th className="px-5 py-4 font-semibold">Contact details</th>
                <th className="px-5 py-4 font-semibold">Category</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredSuppliers.map((supplier) => (
                <tr
                  key={supplier.id}
                  className="transition hover:bg-slate-50"
                >
                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-900">
                      {supplier.name}
                    </div>

                    <div className="mt-1 text-xs text-slate-400">
                      SUP-{String(supplier.id).padStart(4, "0")}
                    </div>
                  </td>

                  <td className="px-5 py-4 text-slate-700">
                    {supplier.contact}
                  </td>

                  <td className="px-5 py-4">
                    <div className="text-slate-700">{supplier.email}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {supplier.phone}
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      {supplier.category}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        supplier.status === "Active"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          supplier.status === "Active"
                            ? "bg-emerald-500"
                            : "bg-slate-400"
                        }`}
                      />
                      {supplier.status}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditForm(supplier)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleStatus(supplier.id)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                          supplier.status === "Active"
                            ? "bg-rose-50 text-rose-700 hover:bg-rose-100"
                            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        }`}
                      >
                        {supplier.status === "Active" ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredSuppliers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <p className="font-semibold text-slate-700">
                      No suppliers found
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Try another search or status filter.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
          Demo data only. Supplier changes are stored in React state and
          reset when the page reloads.
        </div>
      </section>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  description,
  symbol,
}: {
  title: string;
  value: number;
  description: string;
  symbol: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>

        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 font-bold text-violet-700">
          {symbol}
        </span>
      </div>

      <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>

      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">
        {label}
      </span>
      {children}
    </label>
  );
}
