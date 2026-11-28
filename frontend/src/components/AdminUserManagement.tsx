import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type AdminUser = {
  user_id: string;
  full_name: string;
  email: string | null;
  role: string;
};

type Props = {
  currentUserId: string;
};

export default function AdminUserManagement({ currentUserId }: Props) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: loadError } = await supabase.rpc("get_admin_users");
    if (loadError) {
      setError(loadError.message);
      setUsers([]);
    } else {
      setUsers((data ?? []) as AdminUser[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void loadUsers(); }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((person) =>
      person.full_name.toLowerCase().includes(term) ||
      (person.email ?? "").toLowerCase().includes(term) ||
      person.role.toLowerCase().includes(term)
    );
  }, [users, search]);

  async function changeRole(person: AdminUser) {
    const nextRole = person.role.toLowerCase() === "admin" ? "user" : "admin";
    const confirmed = window.confirm(
      nextRole === "admin"
        ? `Give administrator access to ${person.full_name}?`
        : `Remove administrator access from ${person.full_name}?`
    );
    if (!confirmed) return;

    setBusyId(person.user_id);
    setError("");
    setNotice("");
    const { error: updateError } = await supabase.rpc("update_admin_user_role", {
      p_user_id: person.user_id,
      p_new_role: nextRole,
    });
    if (updateError) {
      setError(updateError.message);
    } else {
      setNotice(`${person.full_name}'s role was changed to ${nextRole}.`);
      await loadUsers();
    }
    setBusyId("");
  }

  return (
    <section className="mx-auto mt-8 max-w-5xl rounded-3xl bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-bold uppercase tracking-widest text-[#4779ad]">Administrator tools</p>
      <h2 className="mt-2 text-2xl font-bold">User management</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Search registered FindBack profiles and manage user or administrator roles. Role changes are checked by the database.
      </p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, email or role"
          aria-label="Search users"
          className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400"
        />
        <button
          onClick={() => void loadUsers()}
          disabled={loading}
          className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-[#315c8b] disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "Refresh users"}
        </button>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        {filteredUsers.length} of {users.length} profiles
      </p>
      {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</p>}
      {loading ? (
        <p className="py-8 text-sm text-slate-500">Loading users…</p>
      ) : !error && filteredUsers.length === 0 ? (
        <p className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">
          {users.length === 0 ? "No user profiles were found." : "No users match your search."}
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {filteredUsers.map((person) => {
            const isSelf = person.user_id === currentUserId;
            const isAdmin = person.role.toLowerCase() === "admin";
            return (
              <article key={person.user_id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-800">{person.full_name}{isSelf ? " (You)" : ""}</h3>
                  <p className="mt-1 break-all text-sm text-slate-500">{person.email ?? "No email on profile"}</p>
                  <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase ${isAdmin ? "bg-violet-50 text-violet-700" : "bg-slate-100 text-slate-600"}`}>
                    {person.role}
                  </span>
                </div>
                <button
                  onClick={() => void changeRole(person)}
                  disabled={isSelf || busyId === person.user_id}
                  title={isSelf ? "You cannot change your own role" : undefined}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-[#315c8b] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busyId === person.user_id ? "Saving…" : isAdmin ? "Make user" : "Make admin"}
                </button>
              </article>
            );
          })}
        </div>
      )}
      <p className="mt-5 rounded-xl bg-amber-50 p-4 text-xs leading-5 text-amber-800">
        You cannot change your own role, and the last administrator cannot be demoted. Account suspension is not enabled in this version.
      </p>
    </section>
  );
}
