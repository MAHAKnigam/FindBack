import { useState } from "react";
import { ArrowRight, Search, ShieldCheck, MapPin, Clock3, HeartHandshake, PackageSearch } from "lucide-react";
import AuthForm from "./components/AuthForm";

const steps = [
  { number: "01", title: "Report an item", description: "Share a few details when something goes missing or when you find an item." },
  { number: "02", title: "Discover a match", description: "FindBack compares category, description, date and nearby location." },
  { number: "03", title: "Reconnect safely", description: "Verify ownership privately and coordinate a safe handover." },
];

const features = [
  { icon: Search, title: "Smart item discovery", description: "Search by category, keywords, date and area to narrow down relevant reports." },
  { icon: ShieldCheck, title: "Privacy-conscious claims", description: "Keep sensitive ownership clues and contact details private during verification." },
  { icon: MapPin, title: "Location-aware matching", description: "Use approximate areas to help surface reports that may be connected." },
];

function App() {
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f9fc] text-[#17243b]">
      {authOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
          <div className="relative my-auto w-full max-w-md">
            <button
              type="button"
              onClick={() => setAuthOpen(false)}
              aria-label="Close sign in"
              className="absolute -right-2 -top-12 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow"
            >
              Close
            </button>
            <AuthForm onSuccess={() => setAuthOpen(false)} />
          </div>
        </div>
      )}
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
        <a href="#" className="flex items-center gap-2.5 font-bold tracking-tight text-xl">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#173b68] text-white"><PackageSearch size={22} /></span>
          FindBack
        </a>
        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
          <a className="transition hover:text-[#173b68]" href="#how-it-works">How it works</a>
          <a className="transition hover:text-[#173b68]" href="#features">Why FindBack</a>
        </nav>
        <div className="flex items-center gap-3">
          <button onClick={() => setAuthOpen(true)} className="hidden rounded-full px-4 py-2 text-sm font-semibold text-[#173b68] hover:bg-blue-50 sm:inline-flex">Log in</button>
          <button onClick={() => setAuthOpen(true)} className="rounded-full bg-[#173b68] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#102d52]">Get started <ArrowRight className="ml-1 inline" size={15} /></button>
        </div>
      </header>

      <section className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 pb-20 pt-12 lg:grid-cols-[1.05fr_.95fr] lg:px-10 lg:pb-28 lg:pt-20">
        <div className="relative z-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3.5 py-2 text-xs font-semibold tracking-wide text-[#315c8b] shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> A community-powered lost & found network
          </div>
          <h1 className="max-w-2xl text-5xl font-bold leading-[1.08] tracking-tight text-[#14233b] sm:text-6xl">
            Lost something?<br /><span className="text-[#4779ad]">Let’s bring it back.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
            FindBack connects people who have lost belongings with the people who have found them — making every reunion a little easier.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <button onClick={() => setAuthOpen(true)} className="rounded-full bg-[#173b68] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-950/10 transition hover:-translate-y-0.5 hover:bg-[#102d52]">I lost something <ArrowRight className="ml-2 inline" size={16} /></button>
            <button onClick={() => setAuthOpen(true)} className="rounded-full border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-[#173b68] transition hover:border-blue-200 hover:bg-blue-50">I found something</button>
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-500">
            <span className="inline-flex items-center gap-2"><ShieldCheck size={17} className="text-emerald-600" /> Privacy-minded</span>
            <span className="inline-flex items-center gap-2"><HeartHandshake size={17} className="text-emerald-600" /> Community-first</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl">
          <div className="absolute -right-10 -top-12 h-56 w-56 rounded-full bg-blue-100/70 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-emerald-100/70 blur-3xl" />
          <div className="relative rounded-[2rem] border border-white bg-white p-5 shadow-[0_24px_80px_-32px_rgba(23,59,104,0.28)] sm:p-7">
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-semibold text-slate-500">Community board</p><h2 className="mt-1 text-xl font-bold">Recently reported</h2></div>
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">Preview</span>
            </div>
            <div className="mt-6 space-y-3">
              <article className="flex items-center gap-4 rounded-2xl border border-slate-100 p-3.5">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-amber-50 text-2xl">🎒</div>
                <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="font-semibold">Blue backpack</h3><span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-600">Lost</span></div><p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin size={12} /> Central area · Approximate</p></div>
                <span className="text-xs text-slate-400">2h ago</span>
              </article>
              <article className="flex items-center gap-4 rounded-2xl border border-slate-100 p-3.5">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-sky-50 text-2xl">🎧</div>
                <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="font-semibold">Wireless headphones</h3><span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">Found</span></div><p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin size={12} /> Riverside area · Approximate</p></div>
                <span className="text-xs text-slate-400">Yesterday</span>
              </article>
              <article className="flex items-center gap-4 rounded-2xl border border-slate-100 p-3.5">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-violet-50 text-2xl">🔑</div>
                <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="font-semibold">Key ring</h3><span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">Found</span></div><p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin size={12} /> Campus area · Approximate</p></div>
                <span className="text-xs text-slate-400">1d ago</span>
              </article>
            </div>
            <div className="mt-5 flex items-center justify-between rounded-xl bg-[#f4f7fb] px-4 py-3 text-sm"><span className="font-medium text-slate-600">Your next reunion could start here.</span><Clock3 size={17} className="text-[#4779ad]" /></div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-white px-6 py-20 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center"><p className="text-sm font-bold uppercase tracking-[.18em] text-[#4779ad]">Simple by design</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">From lost to found, in three steps</h2><p className="mt-4 leading-7 text-slate-600">A clear process that helps people find relevant reports and reconnect responsibly.</p></div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map((step) => <article key={step.number} className="rounded-3xl border border-slate-100 bg-[#fbfcfe] p-7"><span className="text-sm font-bold tracking-widest text-[#4779ad]">{step.number}</span><h3 className="mt-5 text-xl font-bold">{step.title}</h3><p className="mt-3 leading-7 text-slate-600">{step.description}</p></article>)}
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-6 py-20 lg:px-10">
        <div className="max-w-2xl"><p className="text-sm font-bold uppercase tracking-[.18em] text-[#4779ad]">Built around trust</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">More than a listing board.</h2></div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => <article key={title} className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-[#315c8b]"><Icon size={22} /></span><h3 className="mt-5 text-lg font-bold">{title}</h3><p className="mt-2 leading-7 text-slate-600">{description}</p></article>)}
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-6 py-7 text-center text-sm text-slate-500">© {new Date().getFullYear()} FindBack. Reconnecting people with their belongings.</footer>
    </main>
  );
}

export default App;
