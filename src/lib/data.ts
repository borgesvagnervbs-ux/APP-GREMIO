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
  city?: string | null; note?: string | null; referee?: string | null;
  details?: MatchDetails | null;
};
export type MatchEvent = { min: string; side: "home" | "away"; type: "gol" | "penalti" | "contra" | "amarelo" | "vermelho" | "sub" | "penalti_perdido"; player: string; other?: string | null };
export type Player = { n: string | null; name: string; pos: string; in?: string | null; out?: string | null; goals?: number; card?: "amarelo" | "vermelho" | null };
export type Lineup = { team: string; formation: string | null; starters: Player[]; bench: Player[] };
export type MatchDetails = { events: MatchEvent[]; lineups: { home: Lineup | null; away: Lineup | null }; attendance: number | null };
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

const MATCH_COLS = "id,competition,round,home_team,away_team,home_logo,away_logo,kickoff_at,venue,city,note,referee,status,home_goals,away_goals";
export async function getMatches(): Promise<Match[]> {
  return check(await supabase.from("matches").select(MATCH_COLS).order("kickoff_at"));
}

export async function getMatch(id: number): Promise<Match | null> {
  const r = await supabase.from("matches").select(MATCH_COLS + ",details").eq("id", id).maybeSingle();
  if (r.error) throw new Error(r.error.message);
  return r.data as Match | null;
}

export const isGremio = (name: string) => /gr[eê]mio/i.test(name);

/** As observações dos jogos vêm em inglês ("2nd Leg - Grêmio win 4-1 on aggregate"): traduz. */
export function notePt(note: string | null | undefined): string | null {
  if (!note) return null;
  return note
    .replace(/\b1st Leg\b/gi, "Jogo de ida").replace(/\b2nd Leg\b/gi, "Jogo de volta")
    .replace(/Tied on aggregate/gi, "Empate no agregado")
    .replace(/(.+?) win (\d+-\d+) on aggregate/gi, "$1 venceu por $2 no agregado")
    .replace(/(.+?) advance (\d+-\d+) on penalties/gi, "$1 avançou nos pênaltis por $2")
    .replace(/(.+?) advance (\d+-\d+) on aggregate/gi, "$1 avançou com $2 no agregado")
    .replace(/(.+?) advance on away goals/gi, "$1 avançou pelo gol fora")
    .replace(/\bGRE\b/g, "Grêmio").replace(/(\d+)-(\d+)/g, "$1 a $2");
}

const CITY_PT: Record<string, string> = { Bage: "Bagé", Montevideo: "Montevidéu", "Aracaju, Sergipe": "Aracaju" };
export const cityPt = (c: string | null | undefined) => (c ? CITY_PT[c] ?? c : null);

/** Vitórias, empates, derrotas e pontos do Grêmio numa lista de jogos encerrados. */
export function record(list: Match[]) {
  const r = { j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, pts: 0 };
  for (const m of list) {
    if (m.home_goals == null || m.away_goals == null) continue;
    const home = isGremio(m.home_team);
    const pro = home ? m.home_goals : m.away_goals, contra = home ? m.away_goals : m.home_goals;
    r.j++; r.gp += pro; r.gc += contra;
    if (pro > contra) { r.v++; r.pts += 3; } else if (pro === contra) { r.e++; r.pts += 1; } else r.d++;
  }
  return r;
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
