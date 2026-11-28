import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "../lib/supabase";

type Conversation = {
  conversation_id: string;
  item_title: string;
  other_party_name: string;
  last_message: string | null;
  last_message_at: string | null;
};

type Message = {
  message_id: string;
  sender_id: string;
  sender_name: string;
  message_text: string;
  sent_at: string;
};

export default function PrivateMessages({ userId }: { userId: string }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadConversations = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase.rpc("get_my_conversations");
    if (fetchError) {
      setError(fetchError.message);
      setConversations([]);
    } else {
      setError("");
      const rows = (data ?? []) as Conversation[];
      setConversations(rows);
      if (!selectedId && rows.length) setSelectedId(rows[0].conversation_id);
      if (selectedId && !rows.some(row => row.conversation_id === selectedId)) {
        setSelectedId(rows[0]?.conversation_id ?? "");
      }
    }
    setLoading(false);
  }, [selectedId]);

  const loadMessages = useCallback(async (conversationId: string) => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    setMessagesLoading(true);
    const { data, error: fetchError } = await supabase.rpc("get_conversation_messages", {
      p_conversation_id: conversationId,
    });
    if (fetchError) {
      setError(fetchError.message);
      setMessages([]);
    } else {
      setError("");
      setMessages((data ?? []) as Message[]);
    }
    setMessagesLoading(false);
  }, []);

  useEffect(() => { void loadConversations(); }, [loadConversations]);
  useEffect(() => { void loadMessages(selectedId); }, [selectedId, loadMessages]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!selectedId || !text || sending) return;
    setSending(true);
    setError("");
    setNotice("");
    const { error: sendError } = await supabase.rpc("send_conversation_message", {
      p_conversation_id: selectedId,
      p_message: text,
    });
    if (sendError) {
      setError(sendError.message);
    } else {
      setDraft("");
      setNotice("Message sent.");
      await loadMessages(selectedId);
      await loadConversations();
    }
    setSending(false);
  }

  const activeConversation = conversations.find(item => item.conversation_id === selectedId);

  return (
    <section className="mx-auto mt-8 max-w-5xl rounded-3xl bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-bold uppercase tracking-widest text-[#4779ad]">Private coordination</p>
      <h2 className="mt-2 text-2xl font-bold">Messages</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">Private conversations are available to the owner and finder after an ownership claim is approved. Avoid sharing passwords, bank details or government ID numbers.</p>
      {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
      {loading ? <p className="mt-6 text-sm text-slate-500">Loading conversations…</p> : conversations.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">No private conversations yet. A conversation becomes available when an ownership claim is approved.</p>
      ) : (
        <div className="mt-6 grid gap-5 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div className="space-y-2">
            {conversations.map(item => (
              <button key={item.conversation_id} onClick={() => { setSelectedId(item.conversation_id); setNotice(""); }} className={`w-full rounded-xl border p-4 text-left ${selectedId === item.conversation_id ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"}`}>
                <span className="block font-semibold text-slate-800">{item.item_title}</span>
                <span className="mt-1 block text-xs text-slate-500">With {item.other_party_name}</span>
                <span className="mt-2 block truncate text-xs text-slate-500">{item.last_message || "No messages yet"}</span>
              </button>
            ))}
          </div>
          <div className="rounded-2xl border border-slate-200 p-4">
            {activeConversation && <div className="border-b border-slate-100 pb-3"><h3 className="font-bold">{activeConversation.item_title}</h3><p className="mt-1 text-xs text-slate-500">Conversation with {activeConversation.other_party_name}</p></div>}
            <div className="max-h-96 min-h-40 space-y-3 overflow-y-auto py-4">
              {messagesLoading ? <p className="text-sm text-slate-500">Loading messages…</p> : messages.length === 0 ? <p className="text-sm text-slate-500">Start the conversation with a message about arranging a safe exchange.</p> : messages.map(message => {
                const mine = message.sender_id === userId;
                return <div key={message.message_id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${mine ? "bg-[#173b68] text-white" : "bg-slate-100 text-slate-800"}`}>
                    <p className="mb-1 text-[11px] font-semibold opacity-70">{mine ? "You" : message.sender_name}</p>
                    <p className="whitespace-pre-wrap break-words text-sm">{message.message_text}</p>
                    <p className="mt-2 text-right text-[10px] opacity-60">{new Date(message.sent_at).toLocaleString()}</p>
                  </div>
                </div>;
              })}
            </div>
            <form onSubmit={sendMessage} className="border-t border-slate-100 pt-4">
              <label className="block text-sm font-semibold text-slate-700" htmlFor="private-message">Write a message</label>
              <textarea id="private-message" value={draft} onChange={event => setDraft(event.target.value)} maxLength={2000} rows={3} placeholder="Coordinate a safe public handover…" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-400" />
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-400">{draft.length}/2000</span>
                <button type="submit" disabled={!draft.trim() || sending} className="rounded-xl bg-[#173b68] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{sending ? "Sending…" : "Send message"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <button onClick={() => { void loadConversations(); if (selectedId) void loadMessages(selectedId); }} className="mt-5 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-[#315c8b]">Refresh messages</button>
    </section>
  );
}
