import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type QueueItem = {
  moderation_id: string;
  item_report_id: string;
  item_title: string;
  item_type: string;
  item_description: string;
  report_owner_name: string;
  reason: string;
  moderation_status: string;
};

export default function AdminModeration() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: queueError } = await supabase.rpc("get_moderation_queue");
    if (queueError) {
      setError(queueError.message);
      setItems([]);
    } else {
      setItems((data ?? []) as QueueItem[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void loadQueue(); }, [loadQueue]);

  async function review(moderationId: string, action: "dismiss" | "remove") {
    const prompt = action === "remove"
      ? "Close this item listing? The owner will be notified."
      : "Dismiss this community report?";
    if (!window.confirm(prompt)) return;
    setBusyId(moderationId);
    setError("");
    setNotice("");
    const { error: reviewError } = await supabase.rpc("review_moderation_report", {
      p_moderation_id: moderationId,
      p_action: action,
    });
    if (reviewError) setError(reviewError.message);
    else {
      setNotice(action === "remove" ? "Listing closed and owner notified." : "Report dismissed.");
      await loadQueue();
    }
    setBusyId("");
  }

  return (
    <section className="mx-auto mt-8 max-w-5xl rounded-3xl bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-bold uppercase tracking-widest text-[#4779ad]">Administrator tools</p>
      <h2 className="mt-2 text-2xl font-bold">Moderation queue</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">Review community reports about active listings. Only accounts with the administrator role can access this queue.</p>
      <button onClick={() => void loadQueue()} disabled={loading} className="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-[#315c8b] disabled:opacity-50">{loading ? "Refreshing…" : "Refresh queue"}</button>
      {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</p>}
      {loading ? <p className="py-8 text-sm text-slate-500">Loading moderation queue…</p> : !error && items.length === 0 ? <p className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">There are no pending moderation reports.</p> : (
        <div className="mt-6 space-y-4">
          {items.map(item => <article key={item.moderation_id} className="rounded-2xl border border-slate-200 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">{item.item_title}</h3><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold uppercase text-amber-700">{item.item_type} · {item.moderation_status}</span></div>
            <p className="mt-2 text-xs text-slate-500">Listing owner: {item.report_owner_name}</p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.item_description}</p>
            <div className="mt-4 rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Community report reason</p><p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{item.reason}</p></div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button onClick={() => void review(item.moderation_id, "dismiss")} disabled={busyId === item.moderation_id} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50">Dismiss report</button>
              <button onClick={() => void review(item.moderation_id, "remove")} disabled={busyId === item.moderation_id} className="rounded-lg bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Close listing</button>
            </div>
          </article>)}
        </div>
      )}
    </section>
  );
}
