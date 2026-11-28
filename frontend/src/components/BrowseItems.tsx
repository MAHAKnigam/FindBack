import { useEffect, useMemo, useState } from "react";
import { MapPin, Search, RefreshCw } from "lucide-react";
import { supabase } from "../lib/supabase";

type Report = {
  id: string;
  title: string;
  description: string;
  report_type: "lost" | "found";
  date_lost_found: string;
  categories: { name: string } | null;
  locations: { area_name: string } | null;
};

export default function BrowseItems() {
  const [reports, setReports] = useState<Report[]>([]);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadReports() {
    setLoading(true);
    setError("");
    const { data, error: fetchError } = await supabase
      .from("item_reports")
      .select("id,title,description,report_type,date_lost_found,categories(name),locations(area_name)")
      .eq("status", "active")
      .order("date_lost_found", { ascending: false })
      .limit(100);
    if (fetchError) setError(fetchError.message);
    else setReports((data ?? []) as unknown as Report[]);
    setLoading(false);
  }

  useEffect(() => { void loadReports(); }, []);

  const filtered = useMemo(() => reports.filter((report) => {
    const matchesKind = kind === "all" || report.report_type === kind;
    const haystack = [report.title, report.description, report.categories?.name, report.locations?.area_name].join(" ").toLowerCase();
    return matchesKind && haystack.includes(query.trim().toLowerCase());
  }), [reports, query, kind]);

  return (
    <section className="mx-auto mt-8 max-w-5xl rounded-3xl bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-sm font-bold uppercase tracking-widest text-[#4779ad]">Community listings</p><h2 className="mt-2 text-2xl font-bold">Browse reported items</h2><p className="mt-2 text-sm text-slate-600">Search active reports by item, category, description or approximate area.</p></div>
        <button onClick={() => void loadReports()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"><RefreshCw size={15}/> Refresh</button>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="relative block"><Search size={17} className="absolute left-3 top-3.5 text-slate-400"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search items, areas or keywords" className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-[#4779ad]"/></label>
        <select value={kind} onChange={e => setKind(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"><option value="all">Lost & found</option><option value="lost">Lost items</option><option value="found">Found items</option></select>
      </div>
      {loading ? <p className="py-10 text-center text-sm text-slate-500">Loading community reports…</p> : error ? <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p> : filtered.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">No active reports match this search yet.</p> : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {filtered.map(report => <article key={report.id} className="rounded-2xl border border-slate-200 p-5">
            <div className="flex items-start justify-between gap-3"><div><span className={report.report_type === "lost" ? "rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold uppercase text-rose-700" : "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold uppercase text-emerald-700"}>{report.report_type}</span><h3 className="mt-3 text-lg font-bold">{report.title}</h3></div><span className="text-xs text-slate-500">{report.categories?.name ?? "Other"}</span></div>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{report.description}</p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500"><span className="inline-flex items-center gap-1"><MapPin size={13}/>{report.locations?.area_name ?? "Area not specified"}</span><span>{new Date(report.date_lost_found + "T00:00:00").toLocaleDateString()}</span></div>
          </article>)}
        </div>
      )}
    </section>
  );
}
