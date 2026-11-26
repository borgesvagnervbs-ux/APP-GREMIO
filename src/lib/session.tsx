// Quem está usando o app (conta ou visitante) e quais 5 sites + 5 canais escolheu.
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Prefs } from "./data";
import { supabase } from "./supabase";

type Mode = "loading" | "out" | "guest" | "user";
type Ctx = {
  mode: Mode;
  session: Session | null;
  name: string;
  prefs: Prefs | null;
  reminders: string[];
  enterAsGuest: (name: string) => Promise<void>;
  savePrefs: (p: Prefs) => Promise<void>;
  toggleReminder: (itemId: string) => Promise<boolean>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<Ctx | null>(null);
const K = { guest: "td_guest", prefs: "td_prefs", rem: "td_reminders" };

async function getJSON<T>(k: string): Promise<T | null> {
  try { const v = await AsyncStorage.getItem(k); return v ? (JSON.parse(v) as T) : null; } catch { return null; }
}
async function setJSON(k: string, v: unknown) {
  try { if (v == null) await AsyncStorage.removeItem(k); else await AsyncStorage.setItem(k, JSON.stringify(v)); } catch { /* sem armazenamento */ }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [name, setName] = useState("");
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [reminders, setReminders] = useState<string[]>([]);

  const loadUser = useCallback(async (s: Session) => {
    setSession(s);
    setName((s.user.user_metadata?.name as string) || s.user.email?.split("@")[0] || "Torcedor");
    const { data } = await supabase.from("user_prefs").select("sites,channels").eq("user_id", s.user.id).maybeSingle();
    setPrefs(data ? { sites: data.sites, channels: data.channels } : null);
    const r = await supabase.from("live_reminders").select("item_id").eq("user_id", s.user.id);
    setReminders((r.data ?? []).map((x) => x.item_id));
    setMode("user");
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      if (data.session) return loadUser(data.session);
      const guest = await getJSON<{ name: string }>(K.guest);
      if (guest) {
        setName(guest.name);
        setPrefs(await getJSON<Prefs>(K.prefs));
        setReminders((await getJSON<string[]>(K.rem)) ?? []);
        setMode("guest");
      } else setMode("out");
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "SIGNED_IN" && s) loadUser(s);
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [loadUser]);

  const enterAsGuest = useCallback(async (n: string) => {
    const nm = n.trim() || "Torcedor";
    await setJSON(K.guest, { name: nm });
    setName(nm);
    setPrefs(await getJSON<Prefs>(K.prefs));
    setReminders((await getJSON<string[]>(K.rem)) ?? []);
    setMode("guest");
  }, []);

  const savePrefs = useCallback(async (p: Prefs) => {
    setPrefs(p);
    if (mode === "user" && session) {
      const { error } = await supabase.from("user_prefs").upsert({
        user_id: session.user.id, display_name: name, sites: p.sites, channels: p.channels, updated_at: new Date().toISOString(),
      });
      if (error) throw new Error(error.message);
    } else await setJSON(K.prefs, p);
  }, [mode, session, name]);

  const toggleReminder = useCallback(async (itemId: string) => {
    const on = !reminders.includes(itemId);
    const next = on ? [...reminders, itemId] : reminders.filter((x) => x !== itemId);
    setReminders(next);
    if (mode === "user" && session) {
      const q = on
        ? supabase.from("live_reminders").insert({ user_id: session.user.id, item_id: itemId })
        : supabase.from("live_reminders").delete().eq("user_id", session.user.id).eq("item_id", itemId);
      const { error } = await q;
      if (error) { setReminders(reminders); throw new Error(error.message); }
    } else await setJSON(K.rem, next);
    return on;
  }, [mode, session, reminders]);

  const signOut = useCallback(async () => {
    if (mode === "user") await supabase.auth.signOut();
    await setJSON(K.guest, null);
    setSession(null); setPrefs(null); setReminders([]); setName("");
    setMode("out");
  }, [mode]);

  const value = useMemo(() => ({ mode, session, name, prefs, reminders, enterAsGuest, savePrefs, toggleReminder, signOut }),
    [mode, session, name, prefs, reminders, enterAsGuest, savePrefs, toggleReminder, signOut]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Ctx {
  const c = useContext(SessionContext);
  if (!c) throw new Error("useSession fora do SessionProvider");
  return c;
}

export const prefsReady = (p: Prefs | null) => !!p && p.sites.length === 5 && p.channels.length === 5;
