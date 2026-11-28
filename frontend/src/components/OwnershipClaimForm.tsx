import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function OwnershipClaimForm({
  lostReportId,
  foundReportId,
}: {
  lostReportId: string;
  foundReportId: string;
}) {
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submitClaim(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    const { error: claimError } = await supabase.rpc("submit_ownership_claim", {
      p_lost_report_id: lostReportId,
      p_found_report_id: foundReportId,
      p_verification_details: details.trim(),
    });

    if (claimError) {
      setError(claimError.message);
    } else {
      setMessage("Your ownership claim was submitted privately.");
      setDetails("");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={submitClaim} className="mt-4 rounded-xl bg-blue-50/70 p-4">
      <label className="block text-sm font-semibold text-slate-700" htmlFor={`claim-${foundReportId}`}>
        Ownership details (private)
      </label>
      <p className="mt-1 text-xs leading-5 text-slate-600">
        Describe specific details that can help verify the item belongs to you. Do not include passwords, bank details or government ID numbers. Only the claim process should use these details.
      </p>
      <textarea
        id={`claim-${foundReportId}`}
        value={details}
        onChange={event => setDetails(event.target.value)}
        minLength={20}
        maxLength={2000}
        required
        rows={4}
        placeholder="Describe distinguishing marks, contents, or other details only the owner would know…"
        className="mt-3 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm outline-none focus:border-blue-400"
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-slate-500">{details.trim().length}/2000 characters (minimum 20)</span>
        <button
          type="submit"
          disabled={loading || details.trim().length < 20}
          className="rounded-lg bg-[#173b68] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Submitting…" : "Submit private claim"}
        </button>
      </div>
      {message && <p role="status" className="mt-3 text-sm text-emerald-700">{message}</p>}
      {error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
    </form>
  );
}
