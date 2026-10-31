
import { useMemo, useState } from "react";

type Customer = {
  id: number;
  name: string;
  email: string;
  phone: string;
  totalOrders: number;
  totalSpent: number;
  loyaltyPoints: number;
  joinedDate: string;
  status: "Active" | "Inactive";
};

const initialCustomers: Customer[] = [
  {
    id: 1,
    name: "Aarav Sharma",
    email: "aarav@example.com",
    phone: "9876543210",
    totalOrders: 24,
    totalSpent: 12450,
    loyaltyPoints: 245,
    joinedDate: "2026-06-12",
    status: "Active",
  },
  {
    id: 2,
    name: "Priya Nair",
    email: "priya@example.com",
    phone: "9876543211",
    totalOrders: 18,
    totalSpent: 8750,
    loyaltyPoints: 175,
    joinedDate: "2026-07-05",
    status: "Active",
  },
  {
    id: 3,
    name: "Rahul Kumar",
    email: "rahul@example.com",
    phone: "9876543212",
    totalOrders: 7,
    totalSpent: 3200,
    loyaltyPoints: 64,
    joinedDate: "2026-08-19",
    status: "Active",
  },
  {
    id: 4,
    name: "Sneha Reddy",
    email: "sneha@example.com",
    phone: "9876543213",
    totalOrders: 12,
    totalSpent: 6100,
    loyaltyPoints: 122,
    joinedDate: "2026-05-24",
    status: "Inactive",
  },
  {
    id: 5,
    name: "Kiran Patel",
    email: "kiran@example.com",
    phone: "9876543214",
    totalOrders: 31,
    totalSpent: 18600,
    loyaltyPoints: 372,
    joinedDate: "2026-04-10",
    status: "Active",
  },
];

const emptyForm = {
  name: "",
  email: "",
  phone: "",
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100";

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function CustomerManagement() {
  const [customers, setCustomers] =
    useState<Customer[]>(initialCustomers);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null);

  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const searchText =
        `${customer.name} ${customer.email} ${customer.phone}`.toLowerCase();

      const matchesSearch = searchText.includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "All" || customer.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [customers, search, statusFilter]);

  const activeCustomers = customers.filter(
    (customer) => customer.status === "Active"
  ).length;

  const totalOrders = customers.reduce(
    (total, customer) => total + customer.totalOrders,
    0
  );

  const totalRevenue = customers.reduce(
    (total, customer) => total + customer.totalSpent,
    0
  );

  const totalPoints = customers.reduce(
    (total, customer) => total + customer.loyaltyPoints,
    0
  );

  function addCustomer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();

    if (!name || !email || !phone) {
      setError("Please fill in all required fields.");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!/^\d{10}$/.test(phone)) {
      setError("Enter a valid 10-digit phone number.");
      return;
    }

    const duplicate = customers.some(
      (customer) =>
        customer.email.toLowerCase() === email ||
        customer.phone === phone
    );

    if (duplicate) {
      setError("A customer with this email or phone already exists.");
      return;
    }

    const newCustomer: Customer = {
      id: Date.now(),
      name,
      email,
      phone,
      totalOrders: 0,
      totalSpent: 0,
      loyaltyPoints: 0,
      joinedDate: new Date().toISOString().slice(0, 10),
      status: "Active",
    };

    setCustomers((current) => [newCustomer, ...current]);
    setForm(emptyForm);
    setShowForm(false);
  }

  function toggleStatus(id: number) {
    setCustomers((current) =>
      current.map((customer) =>
        customer.id === id
          ? {
              ...customer,
              status:
                customer.status === "Active" ? "Inactive" : "Active",
            }
          : customer
      )
    );

    if (selectedCustomer?.id === id) {
      setSelectedCustomer((current) =>
        current
          ? {
              ...current,
              status:
                current.status === "Active" ? "Inactive" : "Active",
            }
          : null
      );
    }
  }

  function deleteCustomer(id: number) {
    const customer = customers.find((item) => item.id === id);
    if (!customer) return;

    if (
      window.confirm(
        `Delete customer "${customer.name}" from this demo?`
      )
    ) {
      setCustomers((current) =>
        current.filter((item) => item.id !== id)
      );

      if (selectedCustomer?.id === id) {
        setSelectedCustomer(null);
      }
    }
  }

  function exportCSV() {
    const rows = [
      [
        "Name",
        "Email",
        "Phone",
        "Total Orders",
        "Total Spent",
        "Loyalty Points",
        "Joined Date",
        "Status",
      ],
      ...filteredCustomers.map((customer) => [
        customer.name,
        customer.email,
        customer.phone,
        String(customer.totalOrders),
        String(customer.totalSpent),
        String(customer.loyaltyPoints),
        customer.joinedDate,
        customer.status,
      ]),
    ];

    const csv = rows
      .map((row) =>
        row.map((value) => `"${value.replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" })
    );

    const link = document.createElement("a");
    link.href = url;
    link.download = "customer-records.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-violet-600">
              CRM / CUSTOMERS
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Customer Management
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Manage customer profiles, purchase history and loyalty points.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={exportCSV}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-100"
            >
              Export CSV
            </button>

            <button
              onClick={() => {
                setError("");
                setShowForm((current) => !current);
              }}
              className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
            >
              + Add Customer
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Total Customers"
            value={customers.length.toLocaleString("en-IN")}
            description="Registered customer profiles"
            icon="👥"
          />

          <SummaryCard
            title="Active Customers"
            value={activeCustomers.toLocaleString("en-IN")}
            description="Currently active profiles"
            icon="✓"
          />

          <SummaryCard
            title="Total Orders"
            value={totalOrders.toLocaleString("en-IN")}
            description="Orders across customer records"
            icon="▤"
          />

          <SummaryCard
            title="Total Customer Spend"
            value={formatCurrency(totalRevenue)}
            description="Recorded spending in demo data"
            icon="₹"
          />
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-violet-100 bg-violet-50 p-5 lg:col-span-2">
            <p className="text-sm font-medium text-violet-700">
              Loyalty Program
            </p>

            <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-violet-950">
                  {totalPoints.toLocaleString("en-IN")} points
                </h2>
                <p className="mt-1 text-sm text-violet-700">
                  Total points recorded across all customers
                </p>
              </div>

              <span className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-violet-700">
                Customer Rewards
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Average Spend</p>
            <h2 className="mt-3 text-2xl font-bold">
              {formatCurrency(
                customers.length > 0
                  ? Math.round(totalRevenue / customers.length)
                  : 0
              )}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Per registered customer
            </p>
          </div>
        </section>

        {showForm && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold">Add New Customer</h2>
            <p className="mb-5 mt-1 text-sm text-slate-500">
              Add basic customer details to the directory.
            </p>

            <form onSubmit={addCustomer} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <FormField label="Full Name">
                  <input
                    required
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                    placeholder="Enter customer name"
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Email Address">
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    placeholder="customer@example.com"
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Phone Number">
                  <input
                    required
                    inputMode="numeric"
                    maxLength={10}
                    value={form.phone}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                      })
                    }
                    placeholder="10-digit phone number"
                    className={inputClass}
                  />
                </FormField>
              </div>

              {error && (
                <p role="alert" className="text-sm font-medium text-red-600">
                  {error}
                </p>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
                >
                  Save Customer
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setForm(emptyForm);
                    setError("");
                  }}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email or phone..."
              className={inputClass}
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={inputClass}
              aria-label="Filter customers by status"
            >
              <option value="All">All Customers</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <h2 className="font-bold">Customer Directory</h2>
            <span className="text-sm text-slate-500">
              {filteredCustomers.length} customer(s)
            </span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-y border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Orders</th>
                  <th className="px-4 py-3">Total Spent</th>
                  <th className="px-4 py-3">Loyalty Points</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 font-bold text-violet-700">
                          {customer.name
                            .split(" ")
                            .map((part) => part[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </div>

                        <div>
                          <p className="font-semibold">{customer.name}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            Joined {formatDate(customer.joinedDate)}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <p>{customer.email}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {customer.phone}
                      </p>
                    </td>

                    <td className="px-4 py-4 font-medium">
                      {customer.totalOrders}
                    </td>

                    <td className="px-4 py-4 font-semibold">
                      {formatCurrency(customer.totalSpent)}
                    </td>

                    <td className="px-4 py-4">
                      <span className="rounded-lg bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">
                        {customer.loyaltyPoints} pts
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <StatusBadge status={customer.status} />
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setSelectedCustomer(customer)}
                          className="text-xs font-semibold text-violet-700 hover:underline"
                        >
                          View
                        </button>

                        <button
                          onClick={() => toggleStatus(customer.id)}
                          className="text-xs font-semibold text-slate-600 hover:underline"
                        >
                          {customer.status === "Active"
                            ? "Deactivate"
                            : "Activate"}
                        </button>

                        <button
                          onClick={() => deleteCustomer(customer.id)}
                          className="text-xs font-semibold text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredCustomers.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-slate-500"
                    >
                      No customers found. Try another search or filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {selectedCustomer && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
            onClick={() => setSelectedCustomer(null)}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="customer-dialog-title"
              className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-violet-600">
                    CUSTOMER PROFILE
                  </p>
                  <h2
                    id="customer-dialog-title"
                    className="mt-1 text-xl font-bold"
                  >
                    {selectedCustomer.name}
                  </h2>
                </div>

                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
                  aria-label="Close customer profile"
                >
                  ✕
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <DetailRow label="Email" value={selectedCustomer.email} />
                <DetailRow label="Phone" value={selectedCustomer.phone} />
                <DetailRow
                  label="Joined"
                  value={formatDate(selectedCustomer.joinedDate)}
                />
                <DetailRow
                  label="Total Orders"
                  value={String(selectedCustomer.totalOrders)}
                />
                <DetailRow
                  label="Total Spent"
                  value={formatCurrency(selectedCustomer.totalSpent)}
                />
                <DetailRow
                  label="Loyalty Points"
                  value={String(selectedCustomer.loyaltyPoints)}
                />
                <DetailRow
                  label="Status"
                  value={selectedCustomer.status}
                />
              </div>

              <button
                onClick={() => setSelectedCustomer(null)}
                className="mt-6 w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-700"
              >
                Close Profile
              </button>
            </section>
          </div>
        )}

        <p className="text-xs text-slate-400">
          Demo mode: customer records use local React state. Order totals and
          loyalty points are sample data, not calculated from real orders.
        </p>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 font-bold text-violet-700">
          {icon}
        </span>
      </div>

      <p className="mt-4 text-2xl font-bold tracking-tight">{value}</p>
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
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function StatusBadge({ status }: { status: Customer["status"] }) {
  const styles = {
    Active: "bg-emerald-50 text-emerald-700",
    Inactive: "bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="break-all text-right text-sm font-semibold">
        {value}
      </span>
    </div>
  );
}
