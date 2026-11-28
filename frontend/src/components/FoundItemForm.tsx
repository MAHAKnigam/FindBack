import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";

type Category = { id: string; name: string };

export default function FoundItemForm({ userId, onBack }: { userId: string; onBack: () => void }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [dateFound, setDateFound] = useState("");
  const [area, setArea] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    supabase.from("categories").select("id,name").order("name").then(({ data, error }) => {
      if (error) setMessage(error.message);
      else setCategories((data ?? []) as Category[]);
    });
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const { data: location, error: locationError } = await supabase
        .from("locations")
        .insert({ area_name: area.trim() })
        .select("id")
        .single();
      if (locationError) throw locationError;

      const { data: report, error: reportError } = await supabase
        .from("item_reports")
        .insert({
          user_id: userId,
          category_id: categoryId,
          location_id: location.id,
          report_type: "found",
          title: title.trim(),
          description: description.trim(),
          date_lost_found: dateFound,
          status: "active",
        })
        .select("id")
        .single();
      if (reportError) throw reportError;

      if (photo) {
        const safeName = photo.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const imagePath = userId + "/" + report.id + "/" + Date.now() + "-" + safeName;
        const { error: uploadError } = await supabase.storage.from("item-images").upload(imagePath, photo);
        if (uploadError) throw uploadError;
        const { error: imageError } = await supabase.from("report_images").insert({
          report_id: report.id,
          image_path: imagePath,
          is_primary: true,
        });
        if (imageError) throw imageError;
      }

      setMessage("Your found-item report has been submitted successfully.");
      setTitle("");
      setCategoryId("");
      setDescription("");
      setDateFound("");
      setArea("");
      setPhoto(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not submit the report. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const inputClass = "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#4779ad] focus:ring-2 focus:ring-blue-100";

  return (
    <section className="mx-auto mt-8 max-w-3xl rounded-3xl bg-white p-6 shadow-sm sm:p-8">
      <button onClick={onBack} type="button" className="mb-5 text-sm font-semibold text-[#315c8b]">← Back to dashboard</button>
      <p className="text-sm font-bold uppercase tracking-widest text-[#4779ad]">Found item report</p>
      <h2 className="mt-2 text-2xl font-bold">Tell us what you found</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">Share the details below. Use an approximate area rather than a private home address.</p>
      <form onSubmit={handleSubmit} className="mt-7 space-y-5">
        <label className="block text-sm font-medium">Item name
          <input required maxLength={100} value={title} onChange={e => setTitle(e.target.value)} className={inputClass} placeholder="e.g. Black wallet" />
        </label>
        <label className="block text-sm font-medium">Category
          <select required value={categoryId} onChange={e => setCategoryId(e.target.value)} className={inputClass}>
            <option value="">Choose a category</option>
            {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium">Description
          <textarea required maxLength={2000} rows={4} value={description} onChange={e => setDescription(e.target.value)} className={inputClass} placeholder="Describe the item, including colour or identifying features." />
        </label>
        <label className="block text-sm font-medium">Date found
          <input required type="date" max={new Date().toISOString().slice(0, 10)} value={dateFound} onChange={e => setDateFound(e.target.value)} className={inputClass} />
        </label>
        <label className="block text-sm font-medium">Approximate area
          <input required maxLength={120} value={area} onChange={e => setArea(e.target.value)} className={inputClass} placeholder="e.g. Near railway station, Indore" />
        </label>
        <label className="block text-sm font-medium">Item photo (optional)
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setPhoto(e.target.files?.[0] ?? null)} className={inputClass} />
          <span className="mt-1 block text-xs text-slate-500">JPEG, PNG or WebP. Please avoid photos showing personal documents or sensitive details.</span>
        </label>
        <button disabled={busy || categories.length === 0} className="w-full rounded-xl bg-[#173b68] px-5 py-3.5 text-sm font-semibold text-white disabled:opacity-60">
          {busy ? "Submitting…" : "Submit found-item report"}
        </button>
      </form>
      {message && <p role="status" className="mt-5 rounded-xl bg-blue-50 p-4 text-sm leading-6 text-[#244b78]">{message}</p>}
    </section>
  );
}
