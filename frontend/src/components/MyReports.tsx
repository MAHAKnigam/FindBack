import { useEffect, useState } from "react";
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
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    supabase.from("item_reports")
      .select("id,title,description,report_type,date_lost_found,status,categories(name),locations(area_name)")
      .eq("user_id", userId)
      .order("date_lost_found", { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (!alive) return;
        if (fetchError) setError(fetchError.message);
        else setItems((data ?? []) as unknown as Report[]);
        setLoading(false);
      });
    return () => { alive = false; };
  }, [userId]);

  return <section className="mx-auto mt-8 max-w-5xl rounded-3xl bg-white p-6 shadow-sm sm:p-8">
    <p className="text-sm font-bold uppercase tracking-widest text-[#4779ad]">Your activity</p>
    <h2 className="mt-2 text-2xl font-bold">My reports</h2>
    {loading ? <p className="py-8 text-sm text-slate-500">Loading your reports…</p> : error ? <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p> : items.length === 0 ? <p className="py-8 text-sm text-slate-500">You have not submitted any reports yet.</p> : <div className="mt-6 space-y-3">
      {items.map(item => <article key={item.id} className="rounded-2xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><span className={item.report_type === "lost" ? "text-xs font-bold uppercase text-rose-600" : "text-xs font-bold uppercase text-emerald-700"}>{item.report_type}</span><h3 className="mt-1 font-bold">{item.title}</h3></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-600">{item.status}</span></div>
        <p className="mt-2 text-sm text-slate-600">{item.description}</p>
        <p className="mt-3 text-xs text-slate-500">{item.categories?.name ?? "Other"} · {item.locations?.area_name ?? "Area not specified"} · {new Date(item.date_lost_found + "T00:00:00").toLocaleDateString()}</p>
      </article>)}
    </div>}
  </section>;
}
