import { supabase } from "./supabase";

export type Source = { id: string; kind: "site" | "canal"; name: string; rank: number; yt_subscribers: number | null };
export type Item = {
  id: string; source_id: string; kind: "noticia" | "video" | "live";
  title: string; url: string; image_url: string | null; summary: string | null;
  published_at: string; views: number | null; duration_s: number | null;
  live_status: "upcoming" | "live" | "none" | null; live_starts_at: string | null;
};
export type Match = {
  id: number; competition: string; round: string | null; home_team: string; away_team: string;
  home_logo: string | null; away_logo: string | null; kickoff_at: string; venue: string | null;
  status: string; home_goals: number | null; away_goals: number | null;
};
export type Standing = {
  position: number; team: string; crest: string | null; played: number; won: number; draw: number;
  lost: number; points: number; goal_diff: number; is_gremio: boolean;
};
export type Prefs = { sites: string[]; channels: string[] };

function check<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return (r.data ?? []) as T;
}

export async function getSources(): Promise<Source[]> {
  return check(await supabase.from("sources").select("id,kind,name,rank,yt_subscribers").order("kind").order("rank"));
}

export async function getNews(sites: string[], limit = 60): Promise<Item[]> {
  if (!sites.length) return [];
  return check(await supabase.from("items").select("*").eq("kind", "noticia")
    .in("source_id", sites).order("published_at", { ascending: false }).limit(limit));
}

export async function getVideos(channels: string[], limit = 40): Promise<Item[]> {
  if (!channels.length) return [];
  return check(await supabase.from("items").select("*").eq("kind", "video")
    .in("source_id", channels).order("published_at", { ascending: false }).limit(limit));
}

/** Lives agendadas ou acontecendo agora (agendadas há mais de 6h que nunca começaram ficam de fora). */
export async function getLives(channels: string[]): Promise<Item[]> {
  if (!channels.length) return [];
  const since = new Date(Date.now() - 6 * 3600_000).toISOString();
  const rows: Item[] = check(await supabase.from("items").select("*").eq("kind", "live")
    .in("source_id", channels).in("live_status", ["upcoming", "live"])
    .order("live_starts_at", { ascending: true }).limit(30));
  return rows.filter((l) => l.live_status === "live" || (l.live_starts_at ?? "") >= since);
}

export async function getMatches(): Promise<Match[]> {
  return check(await supabase.from("matches").select("*").order("kickoff_at"));
}

export async function getStandings(): Promise<Standing[]> {
  return check(await supabase.from("standings").select("*").order("position"));
}

// ---------- formatação ----------
const TZ = "America/Sao_Paulo";

export function ago(iso: string): string {
  const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.round(h / 24)} d`;
}

export function until(iso: string): string {
  const m = Math.round((Date.parse(iso) - Date.now()) / 60000);
  if (m <= 0) return "agora";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h${String(m % 60).padStart(2, "0")}`;
  return `${Math.round(h / 24)} dia(s)`;
}

export function dateTime(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString("pt-BR", { timeZone: TZ, weekday: "short", day: "2-digit", month: "2-digit" });
  const time = d.toLocaleTimeString("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
  return `${day.replace(".", "")} · ${time}`;
}

export function views(n: number | null): string {
  if (n == null) return "";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")} mi views`;
  if (n >= 1000) return `${Math.round(n / 1000)} mil views`;
  return `${n} views`;
}

export function duration(s: number | null): string {
  if (!s) return "";
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
}

export const FINISHED = ["FINISHED", "AWARDED"];
export const LIVE_MATCH = ["IN_PLAY", "PAUSED", "LIVE"];
