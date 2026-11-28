import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Report = {
  id: string;
  title: string;
  report_type: "lost" | "found";
  date_lost_found: string;
  status: string;
  description: string;
  categories: { name: string } | null;
  locations: { area_name: string } | null;
};

export default function MyReports({ userId }: { userId: string }) {
  const [items, setItems] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: fetchError } = await supabase.from("item_reports")
      .select("id,title,description,report_type,date_lost_found,status,categories(name),locations(area_name)")
      .eq("user_id", userId)
      .order("date_lost_found", { ascending: false });
    if (fetchError) setError(fetchError.message);
    else setItems((data ?? []) as unknown as Report[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { void loadReports(); }, [loadReports]);

  async function changeStatus(item: Report, status: "active" | "closed") {
    setBusyId(item.id);
    setError("");
    setNotice("");
    const { error: updateError } = await supabase.from("item_reports")
      .update({ status })
      .eq("id", item.id)
      .eq("user_id", userId);
    if (updateError) setError(updateError.message);
    else {
      setItems(current => current.map(report => report.id === item.id ? { ...report, status } : report));
      setNotice(status === "closed" ? "Report closed." : "Report reopened.");
    }
    setBusyId("");
  }

  async function deleteReport(item: Report) {
    if (!window.confirm("Delete this report permanently? This cannot be undone.")) return;
    setBusyId(item.id);
    setError("");
    setNotice("");
    const { error: deleteError } = await supabase.from("item_reports")
      .delete()
      .eq("id", item.id)
      .eq("user_id", userId);
    if (deleteError) setError(deleteError.message);
    else {
      setItems(current => current.filter(report => report.id !== item.id));
      setNotice("Report deleted.");
    }
    setBusyId("");
  }

  return <section className="mx-auto mt-8 max-w-5xl rounded-3xl bg-white p-6 shadow-sm sm:p-8">
    <p className="text-sm font-bold uppercase tracking-widest text-[#4779ad]">Your activity</p>
    <div className="mt-2 flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-bold">My reports</h2><button onClick={() => void loadReports()} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold">Refresh</button></div>
    <p className="mt-2 text-sm text-slate-600">You can close a report when the item is no longer missing or reopen it if needed.</p>
    {notice && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {loading ? <p className="py-8 text-sm text-slate-500">Loading your reports…</p> : items.length === 0 ? <p className="py-8 text-sm text-slate-500">You have not submitted any reports yet.</p> : <div className="mt-6 space-y-3">
      {items.map(item => <article key={item.id} className="rounded-2xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><span className={item.report_type === "lost" ? "text-xs font-bold uppercase text-rose-600" : "text-xs font-bold uppercase text-emerald-700"}>{item.report_type}</span><h3 className="mt-1 font-bold">{item.title}</h3></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-600">{item.status}</span></div>
        <p className="mt-2 text-sm text-slate-600">{item.description}</p>
        <p className="mt-3 text-xs text-slate-500">{item.categories?.name ?? "Other"} · {item.locations?.area_name ?? "Area not specified"} · {new Date(item.date_lost_found + "T00:00:00").toLocaleDateString()}</p>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          {item.status === "active" ? <button disabled={busyId === item.id} onClick={() => void changeStatus(item, "closed")} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">Close report</button> : <button disabled={busyId === item.id} onClick={() => void changeStatus(item, "active")} className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800 disabled:opacity-50">Reopen report</button>}
          <button disabled={busyId === item.id} onClick={() => void deleteReport(item)} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-50">Delete</button>
        </div>
      </article>)}
    </div>}
  </section>;
}
