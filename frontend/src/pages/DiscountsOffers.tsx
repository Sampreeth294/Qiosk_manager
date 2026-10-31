
import { useMemo, useState } from "react";

type Offer = {
  id: number;
  name: string;
  code: string;
  type: "Percentage" | "Fixed Amount";
  value: number;
  minOrder: number;
  startDate: string;
  endDate: string;
  usageLimit: number;
  used: number;
  active: boolean;
};

const initialOffers: Offer[] = [
  {
    id: 1,
    name: "Weekend Special",
    code: "WEEKEND20",
    type: "Percentage",
    value: 20,
    minOrder: 300,
    startDate: "2026-10-01",
    endDate: "2026-12-31",
    usageLimit: 500,
    used: 184,
    active: true,
  },
  {
    id: 2,
    name: "New Customer Offer",
    code: "WELCOME100",
    type: "Fixed Amount",
    value: 100,
    minOrder: 499,
    startDate: "2026-10-01",
    endDate: "2026-11-30",
    usageLimit: 200,
    used: 87,
    active: true,
  },
  {
    id: 3,
    name: "Lunch Deal",
    code: "LUNCH15",
    type: "Percentage",
    value: 15,
    minOrder: 200,
    startDate: "2026-10-01",
    endDate: "2026-10-31",
    usageLimit: 300,
    used: 300,
    active: false,
  },
];

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = {
  name: "",
  code: "",
  type: "Percentage" as Offer["type"],
  value: "10",
  minOrder: "0",
  startDate: today(),
  endDate: "",
  usageLimit: "100",
};

function getOfferState(offer: Offer) {
  if (offer.endDate < today()) return "Expired";
  if (offer.startDate > today()) return "Scheduled";
  if (offer.used >= offer.usageLimit) return "Limit Reached";
  return offer.active ? "Active" : "Inactive";
}

function formatDate(date: string) {
  if (!date) return "—";

  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function DiscountsOffers() {
  const [offers, setOffers] = useState<Offer[]>(initialOffers);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const filteredOffers = useMemo(() => {
    return offers.filter((offer) => {
      const matchesSearch =
        `${offer.name} ${offer.code}`
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "All" ||
        getOfferState(offer) === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [offers, search, statusFilter]);

  const activeCount = offers.filter(
    (offer) => getOfferState(offer) === "Active"
  ).length;

  const totalRedemptions = offers.reduce(
    (total, offer) => total + offer.used,
    0
  );

  const totalCapacity = offers.reduce(
    (total, offer) => total + offer.usageLimit,
    0
  );

  function updateForm<K extends keyof typeof emptyForm>(
    key: K,
    value: (typeof emptyForm)[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function addOffer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const code = form.code.trim().toUpperCase();
    const value = Number(form.value);
    const minOrder = Number(form.minOrder);
    const usageLimit = Number(form.usageLimit);

    if (!form.name.trim() || !code || !form.endDate) {
      setError("Please fill in all required fields.");
      return;
    }

    if (offers.some((offer) => offer.code.toUpperCase() === code)) {
      setError("This promo code already exists. Choose another code.");
      return;
    }

    if (
      !Number.isFinite(value) ||
      value <= 0 ||
      (form.type === "Percentage" && value > 100)
    ) {
      setError(
        form.type === "Percentage"
          ? "Percentage must be between 1 and 100."
          : "Discount amount must be greater than zero."
      );
      return;
    }

    if (
      !Number.isFinite(minOrder) ||
      minOrder < 0 ||
      !Number.isInteger(usageLimit) ||
      usageLimit < 1
    ) {
      setError("Enter a valid minimum order and usage limit.");
      return;
    }

    if (form.endDate < form.startDate) {
      setError("End date cannot be earlier than the start date.");
      return;
    }

    const newOffer: Offer = {
      id: Date.now(),
      name: form.name.trim(),
      code,
      type: form.type,
      value,
      minOrder,
      startDate: form.startDate,
      endDate: form.endDate,
      usageLimit,
      used: 0,
      active: true,
    };

    setOffers((current) => [newOffer, ...current]);
    setForm(emptyForm);
    setShowForm(false);
  }

  function toggleOffer(id: number) {
    setOffers((current) =>
      current.map((offer) =>
        offer.id === id ? { ...offer, active: !offer.active } : offer
      )
    );
  }

  function deleteOffer(id: number) {
    const offer = offers.find((item) => item.id === id);
    if (!offer) return;

    if (window.confirm(`Delete the offer "${offer.name}"?`)) {
      setOffers((current) => current.filter((item) => item.id !== id));
    }
  }

  function exportCSV() {
    const rows = [
      [
        "Offer Name",
        "Promo Code",
        "Type",
        "Value",
        "Minimum Order",
        "Start Date",
        "End Date",
        "Usage Limit",
        "Used",
        "Status",
      ],
      ...filteredOffers.map((offer) => [
        offer.name,
        offer.code,
        offer.type,
        String(offer.value),
        String(offer.minOrder),
        offer.startDate,
        offer.endDate,
        String(offer.usageLimit),
        String(offer.used),
        getOfferState(offer),
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
    link.download = "discounts-and-offers.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-violet-600">
              MARKETING / PROMOTIONS
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Discounts & Offers
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Create promo codes and manage restaurant promotions.
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
              + Create Offer
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Total Offers"
            value={offers.length.toString()}
            description="All created promotions"
            icon="◇"
          />
          <SummaryCard
            title="Currently Active"
            value={activeCount.toString()}
            description="Available based on current dates and limits"
            icon="✓"
          />
          <SummaryCard
            title="Total Redemptions"
            value={totalRedemptions.toLocaleString("en-IN")}
            description="Recorded uses across offers"
            icon="↗"
          />
          <SummaryCard
            title="Usage Capacity"
            value={
              totalCapacity > 0
                ? `${Math.round((totalRedemptions / totalCapacity) * 100)}%`
                : "0%"
            }
            description="Redemptions versus combined limits"
            icon="%"
          />
        </section>

        {showForm && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold">Create New Offer</h2>
            <p className="mb-5 mt-1 text-sm text-slate-500">
              Configure the discount and when customers can use it.
            </p>

            <form onSubmit={addOffer} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <FormField label="Offer Name">
                  <input
                    required
                    value={form.name}
                    onChange={(e) => updateForm("name", e.target.value)}
                    placeholder="e.g. Festival Special"
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Promo Code">
                  <input
                    required
                    value={form.code}
                    onChange={(e) =>
                      updateForm(
                        "code",
                        e.target.value
                          .toUpperCase()
                          .replace(/\s/g, "")
                          .slice(0, 24)
                      )
                    }
                    placeholder="e.g. FESTIVE20"
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Discount Type">
                  <select
                    value={form.type}
                    onChange={(e) =>
                      updateForm(
                        "type",
                        e.target.value as Offer["type"]
                      )
                    }
                    className={inputClass}
                  >
                    <option>Percentage</option>
                    <option>Fixed Amount</option>
                  </select>
                </FormField>

                <FormField
                  label={
                    form.type === "Percentage"
                      ? "Discount Percentage (%)"
                      : "Discount Amount (₹)"
                  }
                >
                  <input
                    required
                    type="number"
                    min="1"
                    max={form.type === "Percentage" ? "100" : undefined}
                    step="0.01"
                    value={form.value}
                    onChange={(e) => updateForm("value", e.target.value)}
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Minimum Order Value (₹)">
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.minOrder}
                    onChange={(e) => updateForm("minOrder", e.target.value)}
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Usage Limit">
                  <input
                    required
                    type="number"
                    min="1"
                    step="1"
                    value={form.usageLimit}
                    onChange={(e) =>
                      updateForm("usageLimit", e.target.value)
                    }
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Start Date">
                  <input
                    required
                    type="date"
                    value={form.startDate}
                    onChange={(e) => updateForm("startDate", e.target.value)}
                    className={inputClass}
                  />
                </FormField>

                <FormField label="End Date">
                  <input
                    required
                    type="date"
                    min={form.startDate}
                    value={form.endDate}
                    onChange={(e) => updateForm("endDate", e.target.value)}
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
                  Save Offer
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
              placeholder="Search offer name or promo code..."
              className={inputClass}
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={inputClass}
              aria-label="Filter offers by status"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Expired">Expired</option>
              <option value="Limit Reached">Limit Reached</option>
            </select>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <h2 className="font-bold">All Promotions</h2>
            <span className="text-sm text-slate-500">
              {filteredOffers.length} offer(s)
            </span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[950px] text-left text-sm">
              <thead>
                <tr className="border-y border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Offer</th>
                  <th className="px-4 py-3">Discount</th>
                  <th className="px-4 py-3">Minimum Order</th>
                  <th className="px-4 py-3">Validity</th>
                  <th className="px-4 py-3">Usage</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredOffers.map((offer) => {
                  const status = getOfferState(offer);
                  const usagePercent = Math.min(
                    100,
                    (offer.used / offer.usageLimit) * 100
                  );

                  return (
                    <tr key={offer.id} className="hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <p className="font-semibold">{offer.name}</p>
                        <span className="mt-1 inline-block rounded-md border border-dashed border-violet-300 bg-violet-50 px-2 py-1 font-mono text-xs font-bold text-violet-700">
                          {offer.code}
                        </span>
                      </td>

                      <td className="px-4 py-4 font-semibold">
                        {offer.type === "Percentage"
                          ? `${offer.value}% off`
                          : `₹${offer.value.toLocaleString("en-IN")} off`}
                      </td>

                      <td className="px-4 py-4">
                        ₹{offer.minOrder.toLocaleString("en-IN")}
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        <p>{formatDate(offer.startDate)}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          to {formatDate(offer.endDate)}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <div className="w-28">
                          <div className="flex justify-between text-xs">
                            <span>{offer.used}</span>
                            <span className="text-slate-400">
                              {offer.usageLimit}
                            </span>
                          </div>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-violet-500"
                              style={{ width: `${usagePercent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <StatusBadge status={status} />
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            disabled={
                              status === "Expired" ||
                              status === "Scheduled" ||
                              status === "Limit Reached"
                            }
                            onClick={() => toggleOffer(offer.id)}
                            className="text-xs font-semibold text-violet-700 hover:underline disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline"
                          >
                            {offer.active ? "Deactivate" : "Activate"}
                          </button>

                          <button
                            onClick={() => deleteOffer(offer.id)}
                            className="text-xs font-semibold text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredOffers.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-slate-500"
                    >
                      No offers match your search or status filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <p className="text-xs text-slate-400">
          Demo mode: changes are held in React state and reset on refresh.
          Connect the backend before using these promotions for real orders.
        </p>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100";

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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Active: "bg-emerald-50 text-emerald-700",
    Inactive: "bg-slate-100 text-slate-600",
    Scheduled: "bg-blue-50 text-blue-700",
    Expired: "bg-red-50 text-red-700",
    "Limit Reached": "bg-amber-50 text-amber-700",
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
        styles[status] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {status}
    </span>
  );
}
