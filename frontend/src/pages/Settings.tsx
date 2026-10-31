
import { useEffect, useState } from "react";
import { apiRequest } from "../api/apiClient";

type SettingsTab = "Restaurant" | "General" | "Orders" | "Notifications";

type SettingsForm = {
  restaurantName: string;
  email: string;
  phone: string;
  address: string;
  currency: string;
  timezone: string;
  autoAcceptOrders: boolean;
  allowCustomerCancellation: boolean;
  soundAlerts: boolean;
  emailNotifications: boolean;
  lowStockNotifications: boolean;
  orderNotifications: boolean;
};

type Restaurant = {
  id: number;
  name: string;
};

type ToggleProps = {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
};

const tabs: SettingsTab[] = [
  "Restaurant",
  "General",
  "Orders",
  "Notifications",
];

function Toggle({
  label,
  description,
  checked,
  onChange,
}: ToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-5 last:border-b-0">
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-indigo-600" : "bg-slate-300"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}

const initialSettings: SettingsForm = {
  restaurantName: "",
  email: "",
  phone: "",
  address: "",
  currency: "INR",
  timezone: "UTC",
  autoAcceptOrders: true,
  allowCustomerCancellation: true,
  soundAlerts: true,
  emailNotifications: false,
  lowStockNotifications: true,
  orderNotifications: true,
};

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("Restaurant");
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restaurantId, setRestaurantId] = useState<number | null>(null);
  const [settings, setSettings] = useState<SettingsForm>(initialSettings);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiRequest<Restaurant[]>("/restaurants/?include_inactive=true");
        if (data.length > 0) {
          setRestaurants(data);
          setRestaurantId(data[0].id);
        }
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Unable to load restaurants.");
      }
    })();
  }, []);

  useEffect(() => {
    if (!restaurantId) return;
    void (async () => {
      try {
        const data = await apiRequest<{ restaurant_name: string; contact_email: string; phone: string; address: string; currency: string; timezone: string; auto_accept_orders: boolean; allow_customer_cancellation: boolean; sound_alerts: boolean; email_notifications: boolean; low_stock_notifications: boolean; order_notifications: boolean; }> (`/settings/?restaurant_id=${restaurantId}`);
        setSettings({
          restaurantName: data.restaurant_name || "",
          email: data.contact_email || "",
          phone: data.phone || "",
          address: data.address || "",
          currency: data.currency || "INR",
          timezone: data.timezone || "UTC",
          autoAcceptOrders: data.auto_accept_orders,
          allowCustomerCancellation: data.allow_customer_cancellation,
          soundAlerts: data.sound_alerts,
          emailNotifications: data.email_notifications,
          lowStockNotifications: data.low_stock_notifications,
          orderNotifications: data.order_notifications,
        });
        setError(null);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Unable to load settings.");
      }
    })();
  }, [restaurantId]);

  function updateSetting<K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) {
    setSettings((previous) => ({ ...previous, [key]: value }));
    setSaved(false);
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!restaurantId) return;
    try {
      await apiRequest(`/settings/?restaurant_id=${restaurantId}`, {
        method: "PATCH",
        body: JSON.stringify({
          restaurant_id: restaurantId,
          restaurant_name: settings.restaurantName,
          contact_email: settings.email,
          phone: settings.phone,
          address: settings.address,
          currency: settings.currency,
          timezone: settings.timezone,
          auto_accept_orders: settings.autoAcceptOrders,
          allow_customer_cancellation: settings.allowCustomerCancellation,
          sound_alerts: settings.soundAlerts,
          email_notifications: settings.emailNotifications,
          low_stock_notifications: settings.lowStockNotifications,
          order_notifications: settings.orderNotifications,
        }),
      });
      setSaved(true);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save settings.");
    }
  }

  const inputClass = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
  const labelClass = "text-sm font-medium text-slate-700";

  return (
    <div className="min-h-full space-y-6">
      <div>
        <p className="text-sm font-medium text-indigo-600">SYSTEM MANAGEMENT</p>
        <div className="mt-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
            <p className="mt-1 text-sm text-slate-500">Manage your restaurant preferences and application settings.</p>
          </div>
          <select value={restaurantId ?? ""} onChange={(event) => setRestaurantId(Number(event.target.value))} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-indigo-500">
            {restaurants.map((restaurant) => (
              <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex min-w-max gap-2">
          {tabs.map((tab) => (
            <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`rounded-xl px-4 py-3 text-sm font-medium transition ${activeTab === tab ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {activeTab === "Restaurant" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="border-b border-slate-100 pb-5">
              <h2 className="text-lg font-semibold text-slate-900">Restaurant Profile</h2>
              <p className="mt-1 text-sm text-slate-500">Update your restaurant's contact information.</p>
            </div>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div><label className={labelClass}>Restaurant Name</label><input className={inputClass} value={settings.restaurantName} onChange={(event) => updateSetting("restaurantName", event.target.value)} required /></div>
              <div><label className={labelClass}>Contact Email</label><input type="email" className={inputClass} value={settings.email} onChange={(event) => updateSetting("email", event.target.value)} required /></div>
              <div><label className={labelClass}>Phone Number</label><input type="tel" className={inputClass} value={settings.phone} onChange={(event) => updateSetting("phone", event.target.value)} /></div>
              <div><label className={labelClass}>Restaurant Address</label><input className={inputClass} value={settings.address} onChange={(event) => updateSetting("address", event.target.value)} /></div>
            </div>
          </section>
        )}

        {activeTab === "General" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="border-b border-slate-100 pb-5">
              <h2 className="text-lg font-semibold text-slate-900">General Preferences</h2>
              <p className="mt-1 text-sm text-slate-500">Configure regional and billing preferences.</p>
            </div>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div>
                <label className={labelClass}>Currency</label>
                <select className={inputClass} value={settings.currency} onChange={(event) => updateSetting("currency", event.target.value)}>
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Timezone</label>
                <select className={inputClass} value={settings.timezone} onChange={(event) => updateSetting("timezone", event.target.value)}>
                  <option value="UTC">UTC</option>
                  <option value="Asia/Kolkata">Asia/Kolkata</option>
                  <option value="America/New_York">America/New_York</option>
                </select>
              </div>
            </div>
          </section>
        )}

        {activeTab === "Orders" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <Toggle label="Auto accept orders" description="Accept new orders without manual approval." checked={settings.autoAcceptOrders} onChange={(value) => updateSetting("autoAcceptOrders", value)} />
            <Toggle label="Customer cancellations" description="Allow customers to cancel orders before kitchen dispatch." checked={settings.allowCustomerCancellation} onChange={(value) => updateSetting("allowCustomerCancellation", value)} />
            <Toggle label="Sound alerts" description="Play audible alerts for key kitchen updates." checked={settings.soundAlerts} onChange={(value) => updateSetting("soundAlerts", value)} />
          </section>
        )}

        {activeTab === "Notifications" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <Toggle label="Order notifications" description="Notify staff about new orders and status changes." checked={settings.orderNotifications} onChange={(value) => updateSetting("orderNotifications", value)} />
            <Toggle label="Low stock notifications" description="Alert managers when stock drops below minimums." checked={settings.lowStockNotifications} onChange={(value) => updateSetting("lowStockNotifications", value)} />
            <Toggle label="Email notifications" description="Send email alerts for key events." checked={settings.emailNotifications} onChange={(value) => updateSetting("emailNotifications", value)} />
          </section>
        )}

        <div className="flex items-center justify-end gap-3">
          {saved && <span className="text-sm font-medium text-emerald-600">Settings saved.</span>}
          <button type="submit" className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700">Save changes</button>
        </div>
      </form>
    </div>
  );
}
