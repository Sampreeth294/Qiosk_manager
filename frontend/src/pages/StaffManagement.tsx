
import { useMemo, useState } from "react";

type Staff = {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  shift: string;
  salary: number;
  status: "Active" | "On Leave" | "Inactive";
};

const initialStaff: Staff[] = [
  {
    id: 1,
    name: "Rahul Sharma",
    email: "rahul@example.com",
    phone: "9876543210",
    role: "Manager",
    shift: "09:00 AM - 06:00 PM",
    salary: 35000,
    status: "Active",
  },
  {
    id: 2,
    name: "Priya Nair",
    email: "priya@example.com",
    phone: "9876543211",
    role: "Cashier",
    shift: "10:00 AM - 07:00 PM",
    salary: 22000,
    status: "Active",
  },
  {
    id: 3,
    name: "Arun Kumar",
    email: "arun@example.com",
    phone: "9876543212",
    role: "Chef",
    shift: "08:00 AM - 05:00 PM",
    salary: 28000,
    status: "On Leave",
  },
  {
    id: 4,
    name: "Sneha Reddy",
    email: "sneha@example.com",
    phone: "9876543213",
    role: "Waiter",
    shift: "12:00 PM - 09:00 PM",
    salary: 18000,
    status: "Active",
  },
  {
    id: 5,
    name: "Kiran Patel",
    email: "kiran@example.com",
    phone: "9876543214",
    role: "Kitchen Staff",
    shift: "09:00 AM - 06:00 PM",
    salary: 19000,
    status: "Inactive",
  },
];

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  role: "Waiter",
  shift: "09:00 AM - 06:00 PM",
  salary: "",
};

export default function StaffManagement() {
  const [staff, setStaff] = useState<Staff[]>(initialStaff);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const filteredStaff = useMemo(() => {
    return staff.filter((person) => {
      const matchesSearch =
        `${person.name} ${person.email} ${person.phone}`
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesRole =
        roleFilter === "All" || person.role === roleFilter;

      const matchesStatus =
        statusFilter === "All" || person.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [staff, search, roleFilter, statusFilter]);

  const activeCount = staff.filter(
    (person) => person.status === "Active"
  ).length;

  const leaveCount = staff.filter(
    (person) => person.status === "On Leave"
  ).length;

  const monthlyPayroll = staff
    .filter((person) => person.status !== "Inactive")
    .reduce((total, person) => total + person.salary, 0);

  function handleAddStaff(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      setError("Enter a valid email address.");
      return;
    }

    if (!/^\d{10}$/.test(form.phone)) {
      setError("Enter a valid 10-digit phone number.");
      return;
    }

    const salary = Number(form.salary);

    if (!Number.isFinite(salary) || salary <= 0) {
      setError("Enter a valid salary greater than zero.");
      return;
    }

    const newStaff: Staff = {
      id: Date.now(),
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      role: form.role,
      shift: form.shift,
      salary,
      status: "Active",
    };

    setStaff((current) => [newStaff, ...current]);
    setForm(emptyForm);
    setShowForm(false);
  }

  function deleteStaff(id: number) {
    const person = staff.find((item) => item.id === id);
    if (!person) return;

    if (window.confirm(`Delete ${person.name} from staff records?`)) {
      setStaff((current) => current.filter((item) => item.id !== id));
    }
  }

  function toggleStatus(id: number) {
    setStaff((current) =>
      current.map((person) => {
        if (person.id !== id) return person;

        return {
          ...person,
          status: person.status === "Inactive" ? "Active" : "Inactive",
        };
      })
    );
  }

  function exportCSV() {
    const rows = [
      ["Name", "Email", "Phone", "Role", "Shift", "Salary", "Status"],
      ...filteredStaff.map((person) => [
        person.name,
        person.email,
        person.phone,
        person.role,
        person.shift,
        String(person.salary),
        person.status,
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${value.replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" })
    );

    const link = document.createElement("a");
    link.href = url;
    link.download = "staff-records.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-violet-600">
              OPERATIONS / TEAM
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Staff Management
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Manage your restaurant team, roles, shifts and payroll.
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
                setShowForm(!showForm);
              }}
              className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700"
            >
              + Add Staff
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Total Staff"
            value={staff.length.toString()}
            description="Registered team members"
            icon="👥"
          />
          <SummaryCard
            title="Active Staff"
            value={activeCount.toString()}
            description="Currently active"
            icon="✓"
          />
          <SummaryCard
            title="On Leave"
            value={leaveCount.toString()}
            description="Currently on leave"
            icon="◷"
          />
          <SummaryCard
            title="Monthly Payroll"
            value={`₹${monthlyPayroll.toLocaleString("en-IN")}`}
            description="Excludes inactive staff"
            icon="₹"
          />
        </div>

        {showForm && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Add Team Member</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Enter the employee's details below.
                </p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleAddStaff} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <FormField label="Full Name">
                  <input
                    required
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                    placeholder="Enter full name"
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
                    placeholder="employee@example.com"
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

                <FormField label="Role">
                  <select
                    value={form.role}
                    onChange={(e) =>
                      setForm({ ...form, role: e.target.value })
                    }
                    className={inputClass}
                  >
                    <option>Manager</option>
                    <option>Chef</option>
                    <option>Cashier</option>
                    <option>Waiter</option>
                    <option>Kitchen Staff</option>
                    <option>Delivery Staff</option>
                  </select>
                </FormField>

                <FormField label="Shift">
                  <select
                    value={form.shift}
                    onChange={(e) =>
                      setForm({ ...form, shift: e.target.value })
                    }
                    className={inputClass}
                  >
                    <option>08:00 AM - 05:00 PM</option>
                    <option>09:00 AM - 06:00 PM</option>
                    <option>10:00 AM - 07:00 PM</option>
                    <option>12:00 PM - 09:00 PM</option>
                    <option>02:00 PM - 11:00 PM</option>
                  </select>
                </FormField>

                <FormField label="Monthly Salary (₹)">
                  <input
                    required
                    type="number"
                    min="1"
                    value={form.salary}
                    onChange={(e) =>
                      setForm({ ...form, salary: e.target.value })
                    }
                    placeholder="Enter monthly salary"
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
                  Save Staff
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setForm(emptyForm);
                    setError("");
                    setShowForm(false);
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
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="relative">
              <span className="absolute left-3 top-3 text-slate-400">⌕</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email or phone..."
                className={`${inputClass} pl-9`}
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className={inputClass}
              aria-label="Filter by role"
            >
              <option value="All">All Roles</option>
              <option value="Manager">Manager</option>
              <option value="Chef">Chef</option>
              <option value="Cashier">Cashier</option>
              <option value="Waiter">Waiter</option>
              <option value="Kitchen Staff">Kitchen Staff</option>
              <option value="Delivery Staff">Delivery Staff</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={inputClass}
              aria-label="Filter by status"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="On Leave">On Leave</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <h2 className="font-bold">Team Directory</h2>
            <span className="text-sm text-slate-500">
              {filteredStaff.length} employee(s)
            </span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-y border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-semibold">Employee</th>
                  <th className="px-4 py-3 font-semibold">Contact</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Shift</th>
                  <th className="px-4 py-3 font-semibold">Salary / Month</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredStaff.map((person) => (
                  <tr key={person.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 font-bold text-violet-700">
                          {person.name
                            .split(" ")
                            .map((part) => part[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </div>
                        <span className="font-semibold">{person.name}</span>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <p>{person.email}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {person.phone}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium">
                        {person.role}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {person.shift}
                    </td>

                    <td className="px-4 py-4 font-semibold">
                      ₹{person.salary.toLocaleString("en-IN")}
                    </td>

                    <td className="px-4 py-4">
                      <StatusBadge status={person.status} />
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {person.status !== "On Leave" && (
                          <button
                            onClick={() => toggleStatus(person.id)}
                            className="text-xs font-semibold text-violet-700 hover:underline"
                          >
                            {person.status === "Active"
                              ? "Deactivate"
                              : "Activate"}
                          </button>
                        )}
                        <button
                          onClick={() => deleteStaff(person.id)}
                          className="text-xs font-semibold text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredStaff.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-slate-500"
                    >
                      <p className="font-semibold">No staff found</p>
                      <p className="mt-1 text-sm">
                        Try changing your search or filters.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <p className="text-xs text-slate-400">
          Demo mode: staff records are stored in React state and reset when the
          page is refreshed. Connect the API to persist employee records.
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

function StatusBadge({ status }: { status: Staff["status"] }) {
  const styles: Record<Staff["status"], string> = {
    Active: "bg-emerald-50 text-emerald-700",
    "On Leave": "bg-amber-50 text-amber-700",
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
