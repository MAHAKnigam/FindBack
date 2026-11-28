import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Notice = {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
};

export default function Notifications({ userId }: { userId: string }) {
  const [items, setItems] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: fetchError } = await supabase
      .from("notifications")
      .select("id,title,message,is_read")
      .eq("user_id", userId)
      .order("id", { ascending: false });
    if (fetchError) setError(fetchError.message);
    else setItems((data ?? []) as Notice[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { void loadNotifications(); }, [loadNotifications]);

  async function markRead(id: string) {
    setBusyId(id);
    setError("");
    const { error: updateError } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .eq("user_id", userId);
    if (updateError) setError(updateError.message);
    else setItems(current => current.map(item => item.id === id ? { ...item, is_read: true } : item));
    setBusyId("");
  }

  async function markAllRead() {
    setBusyId("all");
    setError("");
    const { error: updateError } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    if (updateError) setError(updateError.message);
    else setItems(current => current.map(item => ({ ...item, is_read: true })));
    setBusyId("");
  }

  const unreadCount = items.filter(item => !item.is_read).length;

  return (
    <section className="mx-auto mt-8 max-w-5xl rounded-3xl bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-[#4779ad]">Your updates</p>
          <h2 className="mt-2 text-2xl font-bold">Notifications</h2>
          <p className="mt-2 text-sm text-slate-600">{unreadCount} unread notification{unreadCount === 1 ? "" : "s"}</p>
        </div>
        <button onClick={() => void markAllRead()} disabled={loading || unreadCount === 0 || busyId !== ""} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-[#315c8b] disabled:opacity-50">
          {busyId === "all" ? "Updating…" : "Mark all as read"}
        </button>
      </div>
      <button onClick={() => void loadNotifications()} disabled={loading} className="mt-4 text-sm font-semibold text-[#315c8b] disabled:opacity-50">
        {loading ? "Refreshing…" : "Refresh notifications"}
      </button>
      {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
      {loading ? <p className="py-8 text-sm text-slate-500">Loading notifications…</p> : items.length === 0 ? (
        <p className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">You do not have any notifications yet. Updates about ownership claims will appear here.</p>
      ) : (
        <div className="mt-5 space-y-3">
          {items.map(item => (
            <article key={item.id} className={item.is_read ? "rounded-2xl border border-slate-200 p-4" : "rounded-2xl border border-blue-200 bg-blue-50/50 p-4"}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold">{item.title}</h3>
                    {!item.is_read && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700">New</span>}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{item.message}</p>
                </div>
                {!item.is_read && (
                  <button onClick={() => void markRead(item.id)} disabled={busyId !== ""} className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#315c8b] disabled:opacity-50">
                    {busyId === item.id ? "Saving…" : "Mark read"}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
