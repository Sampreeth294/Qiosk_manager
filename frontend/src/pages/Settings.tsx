
import { useState } from "react";

type SettingsTab = "Restaurant" | "General" | "Orders" | "Notifications";

type SettingsForm = {
  restaurantName: string;
  email: string;
  phone: string;
  address: string;
  currency: string;
  timezone: string;
  taxPercentage: number;
  autoAcceptOrders: boolean;
  allowCustomerCancellation: boolean;
  soundAlerts: boolean;
  emailNotifications: boolean;
  lowStockNotifications: boolean;
  orderNotifications: boolean;
};

const initialSettings: SettingsForm = {
  restaurantName: "Qiosk Restaurant",
  email: "restaurant@example.com",
  phone: "",
  address: "",
  currency: "INR",
  timezone: "Asia/Kolkata",
  taxPercentage: 5,
  autoAcceptOrders: false,
  allowCustomerCancellation: true,
  soundAlerts: true,
  emailNotifications: true,
  lowStockNotifications: true,
  orderNotifications: true,
};

const tabs: SettingsTab[] = [
  "Restaurant",
  "General",
  "Orders",
  "Notifications",
];

export default function Settings() {
  const [activeTab, setActiveTab] =
    useState<SettingsTab>("Restaurant");

  const [settings, setSettings] =
    useState<SettingsForm>(initialSettings);

  const [saved, setSaved] = useState(false);

  function updateSetting<K extends keyof SettingsForm>(
    key: K,
    value: SettingsForm[K],
  ) {
    setSettings((previous) => ({
      ...previous,
      [key]: value,
    }));

    setSaved(false);
  }

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(true);
  }

  const inputClass =
    "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

  const labelClass =
    "text-sm font-medium text-slate-700";

  function Toggle({
    label,
    description,
    checked,
    onChange,
  }: {
    label: string;
    description: string;
    checked: boolean;
    onChange: (value: boolean) => void;
  }) {
    return (
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-5 last:border-b-0">
        <div>
          <p className="text-sm font-medium text-slate-800">
            {label}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {description}
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={`relative h-6 w-11 shrink-0 rounded-full transition ${
            checked ? "bg-indigo-600" : "bg-slate-300"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
              checked ? "left-[22px]" : "left-0.5"
            }`}
          />
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-full space-y-6">
      {/* Page heading */}
      <div>
        <p className="text-sm font-medium text-indigo-600">
          SYSTEM MANAGEMENT
        </p>

        <div className="mt-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Settings
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage your restaurant preferences and application settings.
            </p>
          </div>

          <span className="w-fit rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
            Demo mode
          </span>
        </div>
      </div>

      {/* Settings navigation */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex min-w-max gap-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-xl px-4 py-3 text-sm font-medium transition ${
                activeTab === tab
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Restaurant profile */}
        {activeTab === "Restaurant" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="border-b border-slate-100 pb-5">
              <h2 className="text-lg font-semibold text-slate-900">
                Restaurant Profile
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Update your restaurant's contact information.
              </p>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div>
                <label className={labelClass}>
                  Restaurant Name
                </label>
                <input
                  className={inputClass}
                  value={settings.restaurantName}
                  onChange={(e) =>
                    updateSetting("restaurantName", e.target.value)
                  }
                  required
                />
              </div>

              <div>
                <label className={labelClass}>
                  Contact Email
                </label>
                <input
                  type="email"
                  className={inputClass}
                  value={settings.email}
                  onChange={(e) =>
                    updateSetting("email", e.target.value)
                  }
                  required
                />
              </div>

              <div>
                <label className={labelClass}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  className={inputClass}
                  placeholder="Enter phone number"
                  value={settings.phone}
                  onChange={(e) =>
                    updateSetting("phone", e.target.value)
                  }
                />
              </div>

              <div>
                <label className={labelClass}>
                  Restaurant Address
                </label>
                <input
                  className={inputClass}
                  placeholder="Enter restaurant address"
                  value={settings.address}
                  onChange={(e) =>
                    updateSetting("address", e.target.value)
                  }
                />
              </div>
            </div>
          </section>
        )}

        {/* General settings */}
        {activeTab === "General" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="border-b border-slate-100 pb-5">
              <h2 className="text-lg font-semibold text-slate-900">
                General Preferences
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Configure regional and billing preferences.
              </p>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div>
                <label className={labelClass}>
                  Currency
                </label>
                <select
                  className={inputClass}
                  value={settings.currency}
                  onChange={(e) =>
                    updateSetting("currency", e.target.value)
                  }
                >
                  <option value="INR">INR — Indian Rupee (₹)</option>
                  <option value="USD">USD — US Dollar ($)</option>
                  <option value="EUR">EUR — Euro (€)</option>
                  <option value="GBP">GBP — British Pound (£)</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>
                  Timezone
                </label>
                <select
                  className={inputClass}
                  value={settings.timezone}
                  onChange={(e) =>
                    updateSetting("timezone", e.target.value)
                  }
                >
                  <option value="Asia/Kolkata">
                    India Standard Time
                  </option>
                  <option value="UTC">
                    Coordinated Universal Time
                  </option>
                  <option value="America/New_York">
                    US Eastern Time
                  </option>
                  <option value="Europe/London">
                    United Kingdom Time
                  </option>
                </select>
              </div>

              <div>
                <label className={labelClass}>
                  Tax Percentage (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  className={inputClass}
                  value={settings.taxPercentage}
                  onChange={(e) =>
                    updateSetting(
                      "taxPercentage",
                      Number(e.target.value),
                    )
                  }
                  required
                />
                <p className="mt-2 text-xs text-slate-500">
                  Demo setting only. Actual tax rules must be configured
                  according to applicable requirements.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Order settings */}
        {activeTab === "Orders" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="border-b border-slate-100 pb-5">
              <h2 className="text-lg font-semibold text-slate-900">
                Order Preferences
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Choose how incoming customer orders should be handled.
              </p>
            </div>

            <div className="mt-2">
              <Toggle
                label="Automatically accept orders"
                description="Allow new orders to be accepted automatically."
                checked={settings.autoAcceptOrders}
                onChange={(value) =>
                  updateSetting("autoAcceptOrders", value)
                }
              />

              <Toggle
                label="Allow customer cancellations"
                description="Allow customers to request cancellation of an order."
                checked={settings.allowCustomerCancellation}
                onChange={(value) =>
                  updateSetting("allowCustomerCancellation", value)
                }
              />
            </div>
          </section>
        )}

        {/* Notification settings */}
        {activeTab === "Notifications" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="border-b border-slate-100 pb-5">
              <h2 className="text-lg font-semibold text-slate-900">
                Notification Preferences
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Select the notifications you want enabled.
              </p>
            </div>

            <div className="mt-2">
              <Toggle
                label="Order notifications"
                description="Enable notifications for new orders and order updates."
                checked={settings.orderNotifications}
                onChange={(value) =>
                  updateSetting("orderNotifications", value)
                }
              />

              <Toggle
                label="Low-stock alerts"
                description="Enable alerts when inventory items are running low."
                checked={settings.lowStockNotifications}
                onChange={(value) =>
                  updateSetting("lowStockNotifications", value)
                }
              />

              <Toggle
                label="Email notifications"
                description="Enable email notification preferences."
                checked={settings.emailNotifications}
                onChange={(value) =>
                  updateSetting("emailNotifications", value)
                }
              />

              <Toggle
                label="Sound alerts"
                description="Enable the preference for audible order alerts."
                checked={settings.soundAlerts}
                onChange={(value) =>
                  updateSetting("soundAlerts", value)
                }
              />
            </div>
          </section>
        )}

        {/* Save controls */}
        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
          <div aria-live="polite">
            {saved ? (
              <p className="text-sm font-medium text-emerald-700">
                Settings updated in this session.
              </p>
            ) : (
              <p className="text-sm text-slate-500">
                Changes are held in the current page session only.
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setSettings(initialSettings);
                setSaved(false);
              }}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Reset
            </button>

            <button
              type="submit"
              className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              Save Changes
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
