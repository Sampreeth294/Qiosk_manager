import { useEffect, useState, type FormEvent } from "react";
import { apiRequest } from "../api/apiClient";

type Role = "OWNER" | "MANAGER" | "STAFF";
type Restaurant = { id: number; name: string };
type Membership = {
  membership_id: number;
  user_id: number;
  username: string;
  email: string;
  role: Role;
  is_active: boolean;
  invitation_status: string;
};
type UserList = { actor_role: Role | null; memberships: Membership[] };

export default function StaffManagement() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restaurantId, setRestaurantId] = useState<number | null>(null);
  const [actorRole, setActorRole] = useState<Role | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"STAFF" | "MANAGER">("STAFF");
  const [loading, setLoading] = useState(true);
  const [loadedRestaurantId, setLoadedRestaurantId] = useState<number | null>(null);
  const [busyMembershipId, setBusyMembershipId] = useState<number | null>(null);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    void apiRequest<Restaurant[]>("/restaurants/?include_inactive=true")
      .then((data) => {
        if (!active) return;
        setRestaurants(data);
        setRestaurantId(data[0]?.id ?? null);
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "Unable to load restaurants.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!restaurantId) return;
    let active = true;
    void apiRequest<UserList>(`/users/?restaurant_id=${restaurantId}`)
      .then((result) => {
        if (!active) return;
        setActorRole(result.actor_role);
        setMemberships(result.memberships);
        setLoadedRestaurantId(restaurantId);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setMemberships([]);
          setError(requestError instanceof Error ? requestError.message : "Unable to load staff users.");
          setLoadedRestaurantId(restaurantId);
        }
      });
    return () => {
      active = false;
    };
  }, [restaurantId]);

  async function sendInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!restaurantId) return;
    setSendingInvite(true);
    setError("");
    setNotice("");
    try {
      const invitation = await apiRequest<Membership & { expires_at: string }>("/users/", {
        method: "POST",
        body: JSON.stringify({
          restaurant_id: restaurantId,
          username,
          email,
          role: inviteRole,
        }),
      });
      setMemberships((current) => [invitation, ...current]);
      setUsername("");
      setEmail("");
      setNotice(`Invitation sent to ${invitation.email}. The link expires in 24 hours.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to send invitation.");
    } finally {
      setSendingInvite(false);
    }
  }

  async function updateMembership(membership: Membership, changes: Partial<Pick<Membership, "role" | "is_active">>) {
    setBusyMembershipId(membership.membership_id);
    setError("");
    setNotice("");
    try {
      const updated = await apiRequest<Membership>(`/users/${membership.membership_id}/`, {
        method: "PATCH",
        body: JSON.stringify(changes),
      });
      setMemberships((current) =>
        current.map((item) => item.membership_id === updated.membership_id ? { ...item, ...updated } : item),
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update membership.");
    } finally {
      setBusyMembershipId(null);
    }
  }

  const loadingUsers = Boolean(restaurantId && loadedRestaurantId !== restaurantId);

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-violet-700">Access control</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Staff Management</h1>
          <p className="mt-1 text-sm text-slate-500">Invite staff securely and manage restaurant-specific access.</p>
        </div>
        <label className="text-sm font-semibold text-slate-700">
          Restaurant
          <select
            value={restaurantId ?? ""}
            disabled={loading || restaurants.length === 0}
            onChange={(event) => {
              setError("");
              setRestaurantId(Number(event.target.value));
            }}
            className="mt-2 block min-w-56 rounded-xl border border-slate-300 bg-white px-4 py-3"
          >
            {restaurants.map((restaurant) => <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>)}
          </select>
        </label>
      </header>

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}
      {!loading && restaurants.length === 0 && <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">No restaurant access is available.</p>}

      {actorRole && (
        <form onSubmit={sendInvitation} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 sm:p-6">
          <div className="sm:col-span-2">
            <h2 className="text-lg font-bold text-slate-900">Invite a team member</h2>
            <p className="mt-1 text-sm text-slate-500">They will receive a one-use link to create their own password.</p>
          </div>
          <label className="text-sm font-semibold text-slate-700">
            Username
            <input value={username} onChange={(event) => setUsername(event.target.value)} required maxLength={150} className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-3 font-normal" />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-3 font-normal" />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Role
            <select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as "STAFF" | "MANAGER")} className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3">
              <option value="STAFF">Staff</option>
              {actorRole === "OWNER" && <option value="MANAGER">Manager</option>}
            </select>
          </label>
          <div className="flex items-end">
            <button type="submit" disabled={sendingInvite} className="w-full rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white hover:bg-violet-700 disabled:opacity-60">
              {sendingInvite ? "Sending invitation…" : "Send invitation"}
            </button>
          </div>
        </form>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-lg font-bold text-slate-900">Restaurant memberships</h2>
          <p className="mt-1 text-sm text-slate-500">Invitations expire after 24 hours and do not contain a preset password.</p>
        </div>
        {loadingUsers ? (
          <p role="status" className="p-8 text-center text-sm text-slate-600">Loading team members…</p>
        ) : memberships.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-600">No memberships are available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">User</th>
                  <th className="px-5 py-4 font-semibold">Role</th>
                  <th className="px-5 py-4 font-semibold">Invitation</th>
                  <th className="px-5 py-4 font-semibold">Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {memberships.map((membership) => {
                  const pending = membership.invitation_status === "pending";
                  const canManageMembership = actorRole === "OWNER" || membership.role === "STAFF";
                  return (
                    <tr key={membership.membership_id}>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">{membership.username}</p>
                        <p className="mt-1 text-xs text-slate-500">{membership.email}</p>
                      </td>
                      <td className="px-5 py-4">
                        {canManageMembership && membership.role !== "OWNER" ? (
                          <select
                            value={membership.role}
                            disabled={busyMembershipId === membership.membership_id}
                            onChange={(event) => void updateMembership(membership, { role: event.target.value as Role })}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                          >
                            <option value="STAFF">Staff</option>
                            {actorRole === "OWNER" && <option value="MANAGER">Manager</option>}
                          </select>
                        ) : <span className="font-medium text-slate-700">{membership.role}</span>}
                      </td>
                      <td className="px-5 py-4 capitalize text-slate-600">{membership.invitation_status}</td>
                      <td className="px-5 py-4">
                        {canManageMembership && membership.role !== "OWNER" && !pending ? (
                          <button
                            type="button"
                            disabled={busyMembershipId === membership.membership_id}
                            onClick={() => void updateMembership(membership, { is_active: !membership.is_active })}
                            className={`rounded-lg px-3 py-2 text-xs font-semibold ${membership.is_active ? "bg-rose-50 text-rose-700 hover:bg-rose-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
                          >
                            {membership.is_active ? "Deactivate" : "Reactivate"}
                          </button>
                        ) : (
                          <span className={membership.is_active ? "text-emerald-700" : "text-slate-500"}>
                            {membership.is_active ? "Active" : "Inactive"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
