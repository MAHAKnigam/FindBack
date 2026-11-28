import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";

type AuthMode = "login" | "signup";

export default function AuthForm({ onSuccess }: { onSuccess: () => void }) {
  const [mode, setMode] = useState<AuthMode>("signup");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName.trim() },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        setMessage("Account created. Check your email to confirm your address before signing in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setMessage("You are signed in successfully.");
        onSuccess();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-blue-950/5">
      <div className="mb-6 text-center">
        <p className="text-sm font-bold uppercase tracking-[.16em] text-[#4779ad]">Welcome to FindBack</p>
        <h1 className="mt-2 text-2xl font-bold text-[#17243b]">
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {mode === "signup"
            ? "Join the community and help reunite people with their belongings."
            : "Sign in to manage your lost and found reports."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "signup" && (
          <label className="block text-sm font-medium text-slate-700">
            Full name
            <input
              required
              autoComplete="name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#4779ad] focus:ring-2 focus:ring-blue-100"
              placeholder="Your full name"
            />
          </label>
        )}

        <label className="block text-sm font-medium text-slate-700">
          Email address
          <input
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#4779ad] focus:ring-2 focus:ring-blue-100"
            placeholder="you@example.com"
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Password
          <input
            required
            type="password"
            minLength={8}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#4779ad] focus:ring-2 focus:ring-blue-100"
            placeholder="At least 8 characters"
          />
        </label>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-[#173b68] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#102d52] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
        </button>
      </form>

      {message && (
        <p role="status" className="mt-4 rounded-xl bg-blue-50 px-4 py-3 text-sm leading-6 text-[#244b78]">
          {message}
        </p>
      )}

      <p className="mt-6 text-center text-sm text-slate-500">
        {mode === "signup" ? "Already have an account?" : "New to FindBack?"}{" "}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "signup" ? "login" : "signup");
            setMessage("");
          }}
          className="font-semibold text-[#315c8b] hover:underline"
        >
          {mode === "signup" ? "Sign in" : "Create an account"}
        </button>
      </p>
    </section>
  );
}
