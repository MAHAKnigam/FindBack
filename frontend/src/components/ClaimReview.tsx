import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type ReviewClaim = {
  claim_id: string;
  found_report_id: string;
  lost_report_title: string;
  lost_report_date: string;
  verification_details: string;
  claimant_name: string;
  claim_status: string;
};

export default function ClaimReview() {
  const [claims, setClaims] = useState<ReviewClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadClaims = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: fetchError } = await supabase.rpc("get_claims_for_review");
    if (fetchError) setError(fetchError.message);
    else setClaims((data ?? []) as ReviewClaim[]);
    setLoading(false);
  }, []);

  useEffect(() => { void loadClaims(); }, [loadClaims]);

  async function decide(claimId: string, decision: "approved" | "rejected") {
    const prompt = decision === "approved"
      ? "Approve this ownership claim? Only approve if the details convincingly verify ownership."
      : "Reject this ownership claim?";
    if (!window.confirm(prompt)) return;

    setBusyId(claimId);
    setError("");
    setNotice("");
    const { error: reviewError } = await supabase.rpc("review_ownership_claim", {
      p_claim_id: claimId,
      p_decision: decision,
    });
    if (reviewError) setError(reviewError.message);
    else {
      setNotice(decision === "approved"
        ? "Claim approved. The claimant has been notified."
        : "Claim rejected. The claimant has been notified.");
      await loadClaims();
    }
    setBusyId("");
  }

  return (
    <section className="mx-auto mt-8 max-w-5xl rounded-3xl bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-bold uppercase tracking-widest text-[#4779ad]">Finder tools</p>
      <h2 className="mt-2 text-2xl font-bold">Ownership claims to review</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Only claims submitted for your active found-item reports appear here. Review the private details carefully before making a decision. If anything is unclear, arrange further safe verification rather than approving automatically.
      </p>
      <button onClick={() => void loadClaims()} disabled={loading} className="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-[#315c8b] disabled:opacity-50">
        {loading ? "Refreshing…" : "Refresh claims"}
      </button>
      {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</p>}
      {loading ? <p className="py-8 text-sm text-slate-500">Loading claims…</p> : claims.length === 0 ? (
        <p className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">There are no pending ownership claims for your active found reports.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {claims.map(claim => (
            <article key={claim.claim_id} className="rounded-2xl border border-slate-200 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold">{claim.lost_report_title}</h3>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold uppercase text-amber-700">{claim.claim_status}</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Claimed by {claim.claimant_name} · Lost on {new Date(claim.lost_report_date + "T00:00:00").toLocaleDateString()}
              </p>
              <div className="mt-4 rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Private ownership details</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{claim.verification_details}</p>
              </div>
              {claim.claim_status.toLowerCase() === "pending" && (
                <div className="mt-4 flex flex-wrap gap-3">
                  <button onClick={() => void decide(claim.claim_id, "approved")} disabled={busyId === claim.claim_id} className="rounded-lg bg-[#173b68] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                    {busyId === claim.claim_id ? "Saving…" : "Approve claim"}
                  </button>
                  <button onClick={() => void decide(claim.claim_id, "rejected")} disabled={busyId === claim.claim_id} className="rounded-lg border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 disabled:opacity-50">
                    Reject
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
