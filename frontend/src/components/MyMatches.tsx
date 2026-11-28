import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import OwnershipClaimForm from "./OwnershipClaimForm";

type OwnReport = { id: string; title: string; report_type: "lost" | "found"; status: string };
type Suggestion = {
  matched_report_id: string;
  matched_title: string;
  matched_type: "lost" | "found";
  category_name: string | null;
  area_name: string | null;
  matched_date: string;
  match_score: number;
  match_reasons: string[];
};

export default function MyMatches({ userId }: { userId: string }) {
  const [reports, setReports] = useState<OwnReport[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase.from("item_reports")
      .select("id,title,report_type,status")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (!alive) return;
        if (fetchError) setError(fetchError.message);
        else {
          const rows = (data ?? []) as OwnReport[];
          setReports(rows);
          if (rows.length) setSelectedId(rows[0].id);
        }
        setLoadingReports(false);
      });
    return () => { alive = false; };
  }, [userId]);

  async function findMatches() {
    if (!selectedId) return;
    setLoadingMatches(true);
    setError("");
    setSearched(true);
    const { data, error: rpcError } = await supabase.rpc("find_report_matches", { p_report_id: selectedId });
    if (rpcError) {
      setError(rpcError.message);
      setSuggestions([]);
    } else {
      setSuggestions((data ?? []) as Suggestion[]);
    }
    setLoadingMatches(false);
  }

  const selected = reports.find(report => report.id === selectedId);

  return <section className="mx-auto mt-8 max-w-5xl rounded-3xl bg-white p-6 shadow-sm sm:p-8">
    <p className="text-sm font-bold uppercase tracking-widest text-[#4779ad]">Smart discovery</p>
    <h2 className="mt-2 text-2xl font-bold">Possible matches</h2>
    <p className="mt-2 text-sm leading-6 text-slate-600">FindBack compares your active report with opposite-type reports using category, description keywords, approximate area and date. A suggestion is not proof that an item belongs to you.</p>
    {loadingReports ? <p className="py-8 text-sm text-slate-500">Loading your active reports…</p> : reports.length === 0 ? <p className="py-8 text-sm text-slate-500">You need an active lost or found report before checking for matches.</p> : <>
      <label className="mt-6 block text-sm font-medium">Choose one of your reports
        <select value={selectedId} onChange={e => { setSelectedId(e.target.value); setSearched(false); setSuggestions([]); }} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
          {reports.map(report => <option key={report.id} value={report.id}>{report.report_type.toUpperCase()} · {report.title}</option>)}
        </select>
      </label>
      <button disabled={!selectedId || loadingMatches} onClick={() => void findMatches()} className="mt-4 rounded-xl bg-[#173b68] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{loadingMatches ? "Checking…" : "Find possible matches"}</button>
    </>}
    {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
    {searched && !loadingMatches && !error && suggestions.length === 0 && <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No likely matches were found for this report yet. You can check again later as new reports are added.</p>}
    {suggestions.length > 0 && <div className="mt-6 space-y-3">
      <p className="text-sm font-semibold text-slate-700">{suggestions.length} possible match{suggestions.length === 1 ? "" : "es"} for “{selected?.title}”</p>
      {suggestions.map(match => <article key={match.matched_report_id} className="rounded-2xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><span className={match.matched_type === "found" ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold uppercase text-emerald-700" : "rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold uppercase text-rose-700"}>{match.matched_type}</span><h3 className="mt-3 font-bold">{match.matched_title}</h3></div>
          <span className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-bold text-[#315c8b]">{match.match_score}% match</span>
        </div>
        <p className="mt-2 text-sm text-slate-600">{match.category_name ?? "Uncategorised"} · {match.area_name ?? "Area not specified"} · {new Date(match.matched_date + "T00:00:00").toLocaleDateString()}</p>
        {match.match_reasons.length > 0 && <ul className="mt-3 flex flex-wrap gap-2">{match.match_reasons.map(reason => <li key={reason} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{reason}</li>)}</ul>}
        {selected?.report_type === "lost" && match.matched_type === "found" && <OwnershipClaimForm lostReportId={selected.id} foundReportId={match.matched_report_id} />}
      </article>)}
    </div>}
  </section>;
}
