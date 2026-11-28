import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Handover = {
  handover_id: string;
  item_title: string;
  participant_role: "owner" | "finder";
  other_party_name: string | null;
  confirmed_by_owner: boolean;
  confirmed_by_finder: boolean;
  completed_at: string | null;
};

export default function SafeHandover() {
  const [handovers, setHandovers] = useState<Handover[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const loadHandovers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_my_handovers");
    if (error) {
      setMessage(error.message);
      setHandovers([]);
    } else {
      setMessage("");
      setHandovers((data ?? []) as Handover[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadHandovers();
  }, [loadHandovers]);

  async function confirmHandover(id: string) {
    setBusyId(id);
    setMessage("");
    const { error } = await supabase.rpc("confirm_safe_handover", { p_handover_id: id });
    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Your confirmation has been recorded.");
      await loadHandovers();
    }
    setBusyId(null);
  }

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold">Safe handover</h3>
          <p className="mt-1 text-sm text-slate-600">Confirm only after the item has been physically handed over or received.</p>
        </div>
        <button onClick={() => void loadHandovers()} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-[#315c8b]">Refresh</button>
      </div>
      {message && <p role="status" className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-800">{message}</p>}
      {loading ? <p className="mt-5 text-sm text-slate-500">Loading handovers…</p> : handovers.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">No approved handovers are waiting for confirmation.</p>
      ) : (
        <div className="mt-5 space-y-4">
          {handovers.map((item) => {
            const myConfirmed = item.participant_role === "owner" ? item.confirmed_by_owner : item.confirmed_by_finder;
            const bothConfirmed = item.confirmed_by_owner && item.confirmed_by_finder;
            return (
              <article key={item.handover_id} className="rounded-2xl border border-slate-200 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="font-bold">{item.item_title}</h4>
                    <p className="mt-1 text-sm text-slate-600">Your role: {item.participant_role === "owner" ? "Item owner" : "Finder"} · Other participant: {item.other_party_name || "FindBack user"}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${bothConfirmed ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{bothConfirmed ? "Handover complete" : "Awaiting confirmation"}</span>
                </div>
                <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                  <p className="rounded-lg bg-slate-50 p-3">Owner: {item.confirmed_by_owner ? "Confirmed" : "Pending"}</p>
                  <p className="rounded-lg bg-slate-50 p-3">Finder: {item.confirmed_by_finder ? "Confirmed" : "Pending"}</p>
                </div>
                {!bothConfirmed && (
                  <button disabled={myConfirmed || busyId === item.handover_id} onClick={() => void confirmHandover(item.handover_id)} className="mt-4 rounded-xl bg-[#173b68] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
                    {busyId === item.handover_id ? "Saving…" : myConfirmed ? "You have confirmed" : "Confirm safe handover"}
                  </button>
                )}
                {item.completed_at && <p className="mt-3 text-xs text-emerald-700">Completed on {new Date(item.completed_at).toLocaleString()}</p>}
                {!bothConfirmed && !myConfirmed && <p className="mt-2 text-xs text-slate-500">Do not confirm before the physical handover is complete.</p>}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
