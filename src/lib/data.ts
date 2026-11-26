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
  /** Versão leve dos detalhes, usada nas estatísticas (sem escalações). */
  events?: MatchEvent[] | null; stats?: { home: TeamStats | null; away: TeamStats | null } | null;
};
export type MatchEvent = { min: string; side: "home" | "away"; type: "gol" | "penalti" | "contra" | "amarelo" | "vermelho" | "sub" | "penalti_perdido"; player: string; other?: string | null };
export type Player = { n: string | null; name: string; pos: string; in?: string | null; out?: string | null; goals?: number; card?: "amarelo" | "vermelho" | null };
export type Lineup = { team: string; formation: string | null; starters: Player[]; bench: Player[] };
export type TeamStats = Partial<Record<"possessionPct" | "totalShots" | "shotsOnTarget" | "wonCorners" | "foulsCommitted" | "yellowCards" | "redCards" | "offsides" | "saves" | "accuratePasses" | "totalPasses", number>>;
export type MatchDetails = { v?: number; events: MatchEvent[]; lineups: { home: Lineup | null; away: Lineup | null }; attendance: number | null; stats?: { home: TeamStats | null; away: TeamStats | null } | null };
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
  const r = await supabase.from("matches").select(`${MATCH_COLS},events:details->events,stats:details->stats`).order("kickoff_at");
  return check(r as unknown as { data: Match[] | null; error: { message: string } | null });
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

// ---------- campeonatos ----------
/** Logos oficiais (servidor de imagens da ESPN) e ordem de exibição. */
export const COMPETITIONS: { name: string; short: string; logo: string }[] = [
  { name: "Brasileirão", short: "Brasileirão", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/85.png" },
  { name: "Copa do Brasil", short: "Copa do Brasil", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/528.png" },
  { name: "Libertadores", short: "Libertadores", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/58.png" },
  { name: "Sul-Americana", short: "Sul-Americana", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/1208.png" },
  { name: "Gauchão", short: "Gauchão", logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/2272.png" },
];
export const compLogo = (name: string) => COMPETITIONS.find((c) => c.name === name)?.logo ?? null;
/** Campeonatos que aparecem nos jogos do ano, na ordem acima (os desconhecidos vão para o fim). */
export function competitionsIn(list: Match[]): string[] {
  const names = [...new Set(list.map((m) => m.competition))];
  const order = (n: string) => { const i = COMPETITIONS.findIndex((c) => c.name === n); return i < 0 ? 99 : i; };
  return names.sort((a, b) => order(a) - order(b));
}

export type Where = "todos" | "casa" | "fora";
export function filterMatches(list: Match[], comp: string, where: Where): Match[] {
  return list.filter((m) => (comp === "todos" || m.competition === comp) && (where === "todos" || isGremio(m.home_team) === (where === "casa")));
}

// ---------- estatísticas ----------
const avg = (sum: number, n: number) => (n ? sum / n : null);
export type Scorer = { name: string; goals: number; pens: number; assists: number };

/** Números do Grêmio numa lista de jogos encerrados (mesmas contas dos sites de estatística: total e média por jogo). */
export function gremioStats(list: Match[]) {
  const rec = record(list);
  let semSofrer = 0, semMarcar = 0;
  let best: { m: Match; diff: number } | null = null, worst: { m: Match; diff: number } | null = null;
  const sums = { corners: 0, cornersAg: 0, yellow: 0, red: 0, poss: 0, shots: 0, onTarget: 0, fouls: 0, shotsAg: 0, offsides: 0, saves: 0, passes: 0, passesOk: 0 };
  let nStats = 0, nEvents = 0;
  const scorers = new Map<string, Scorer>();
  const sc = (name: string) => { let x = scorers.get(name); if (!x) scorers.set(name, x = { name, goals: 0, pens: 0, assists: 0 }); return x; };
  const goalsBy = { first: 0, second: 0 };
  let ownGoalsFor = 0;
  for (const m of list) {
    if (m.home_goals == null || m.away_goals == null) continue;
    const home = isGremio(m.home_team);
    const pro = home ? m.home_goals : m.away_goals, contra = home ? m.away_goals : m.home_goals;
    if (contra === 0) semSofrer++;
    if (pro === 0) semMarcar++;
    const diff = pro - contra;
    if (diff > 0 && (!best || diff > best.diff || (diff === best.diff && pro > (isGremio(best.m.home_team) ? best.m.home_goals! : best.m.away_goals!)))) best = { m, diff };
    if (diff < 0 && (!worst || diff < worst.diff)) worst = { m, diff };
    const mine = home ? "home" : "away", theirs = home ? "away" : "home";
    const st = m.stats?.[mine], op = m.stats?.[theirs];
    if (st && op) {
      nStats++;
      sums.corners += st.wonCorners ?? 0; sums.cornersAg += op.wonCorners ?? 0;
      sums.yellow += st.yellowCards ?? 0; sums.red += st.redCards ?? 0;
      sums.poss += st.possessionPct ?? 0; sums.shots += st.totalShots ?? 0; sums.onTarget += st.shotsOnTarget ?? 0;
      sums.fouls += st.foulsCommitted ?? 0; sums.shotsAg += op.totalShots ?? 0; sums.offsides += st.offsides ?? 0;
      sums.saves += st.saves ?? 0; sums.passes += st.totalPasses ?? 0; sums.passesOk += st.accuratePasses ?? 0;
    }
    if (m.events) {
      nEvents++;
      for (const e of m.events ?? []) {
        // gol contra marcado pelo adversário aparece do lado de quem se beneficiou
        if ((e.type === "gol" || e.type === "penalti") && e.side === mine) {
          const x = sc(e.player); x.goals++; if (e.type === "penalti") x.pens++;
          if (e.other) sc(e.other).assists++;
          const min = parseInt(e.min, 10);
          if (!isNaN(min)) { if (min <= 45) goalsBy.first++; else goalsBy.second++; } // "45'+3'" ainda é 1º tempo
        }
        if (e.type === "contra" && e.side === mine) ownGoalsFor++;
      }
    }
  }
  const list2 = [...scorers.values()];
  return {
    ...rec, semSofrer, semMarcar, best: best?.m ?? null, worst: worst?.m ?? null,
    mediaGp: avg(rec.gp, rec.j), mediaGc: avg(rec.gc, rec.j), aproveitamento: rec.j ? rec.pts / (rec.j * 3) : null,
    nStats, nEvents,
    corners: avg(sums.corners, nStats), cornersAg: avg(sums.cornersAg, nStats), cornersTotal: sums.corners,
    yellow: avg(sums.yellow, nStats), yellowTotal: sums.yellow, red: avg(sums.red, nStats), redTotal: sums.red,
    poss: avg(sums.poss, nStats), shots: avg(sums.shots, nStats), onTarget: avg(sums.onTarget, nStats),
    shotsAg: avg(sums.shotsAg, nStats), fouls: avg(sums.fouls, nStats), offsides: avg(sums.offsides, nStats),
    saves: avg(sums.saves, nStats), passAcc: sums.passes ? sums.passesOk / sums.passes : null,
    goalsBy, ownGoalsFor,
    scorers: list2.filter((x) => x.goals > 0).sort((a, b) => b.goals - a.goals || a.pens - b.pens || b.assists - a.assists || a.name.localeCompare(b.name)),
    assists: list2.filter((x) => x.assists > 0).sort((a, b) => b.assists - a.assists || a.name.localeCompare(b.name)),
  };
}
export type GremioStats = ReturnType<typeof gremioStats>;

/** 1,8 · 0,5 · — */
export function num(n: number | null, dec = 1): string {
  return n == null ? "—" : n.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
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
