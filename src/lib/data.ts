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
  competition?: string; grp?: string; goals_for?: number; goals_against?: number;
};
export type Prefs = { sites: string[]; channels: string[] };

/** Títulos de verdade têm pelo menos 3 palavras (descarta lixo como "Tópicos"). */
const realNews = (list: Item[]) => list.filter((i) => i.kind !== "noticia" || i.title.trim().split(/\s+/).length >= 3);

function check<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return (r.data ?? []) as T;
}

export async function getSources(): Promise<Source[]> {
  return check(await supabase.from("sources").select("id,kind,name,rank,yt_subscribers").order("kind").order("rank"));
}

/** Sites e canais que só falam do Grêmio: tudo deles vale. */
export const GREMIO_SOURCES = new Set(["oficial", "gremiotv", "bage", "ccd", "careca"]);
const GREMIO_RE = /gr[eê]mio|tricolor ga[uú]cho|imortal tricolor|\bgre-?nal\b|arena do gr/i;
/** Só o que é sobre o Grêmio: fontes do Grêmio valem sempre; nas outras, o título ou o resumo precisa citar o clube. */
export const aboutGremio = (i: Item) => GREMIO_SOURCES.has(i.source_id) || GREMIO_RE.test(i.title) || GREMIO_RE.test(i.summary ?? "");

/** Notícias do Grêmio vindas só dos sites escolhidos (as mais recentes primeiro, mesmo que antigas). */
export async function getNews(sites: string[], limit = 60): Promise<Item[]> {
  if (!sites.length) return [];
  const rows: Item[] = check(await supabase.from("items").select("*").eq("kind", "noticia")
    .in("source_id", sites).order("published_at", { ascending: false }).limit(400));
  return realNews(rows).filter(aboutGremio).slice(0, limit);
}

export async function getItem(id: string): Promise<Item | null> {
  const r = await supabase.from("items").select("*").eq("id", id).maybeSingle();
  if (r.error) throw new Error(r.error.message);
  return r.data as Item | null;
}
/** Id do vídeo no YouTube a partir do item (id "v_XXXX" ou link watch?v=). */
export function ytId(item: Item): string | null {
  if (item.id.startsWith("v_")) return item.id.slice(2);
  return item.url.match(/[?&]v=([\w-]{6,})/)?.[1] ?? null;
}

/** O mais recente de cada fonte (uma notícia por site, um vídeo por canal), do mais novo para o mais antigo. */
export function latestPerSource(list: Item[]): Item[] {
  const seen = new Set<string>();
  return list.filter((i) => (seen.has(i.source_id) ? false : (seen.add(i.source_id), true)));
}

/** Vídeos do Grêmio vindos só dos canais escolhidos. */
export async function getVideos(channels: string[], limit = 40): Promise<Item[]> {
  if (!channels.length) return [];
  const rows: Item[] = check(await supabase.from("items").select("*").eq("kind", "video")
    .in("source_id", channels).order("published_at", { ascending: false }).limit(400));
  return rows.filter(aboutGremio).slice(0, limit);
}

/** Lives agendadas ou acontecendo agora (agendadas há mais de 6h que nunca começaram ficam de fora). */
export async function getLives(channels: string[]): Promise<Item[]> {
  if (!channels.length) return [];
  const since = new Date(Date.now() - 6 * 3600_000).toISOString();
  const rows: Item[] = check(await supabase.from("items").select("*").eq("kind", "live")
    .in("source_id", channels).in("live_status", ["upcoming", "live"])
    .order("live_starts_at", { ascending: true }).limit(30));
  return rows.filter((l) => aboutGremio(l) && (l.live_status === "live" || (l.live_starts_at ?? "") >= since));
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
/** Logos oficiais, guardadas dentro do app (assets/ligas) para aparecerem sempre, mesmo sem acesso ao site de origem. */
export const COMPETITIONS: { name: string; short: string; logo: number | null }[] = [
  { name: "Brasileirão", short: "Brasileirão", logo: require("../../assets/ligas/brasileirao.png") },
  { name: "Copa do Brasil", short: "Copa do Brasil", logo: require("../../assets/ligas/copa-do-brasil.png") },
  { name: "Libertadores", short: "Libertadores", logo: null },
  { name: "Sul-Americana", short: "Sul-Americana", logo: require("../../assets/ligas/sul-americana.png") },
  { name: "Gauchão", short: "Gauchão", logo: require("../../assets/ligas/gauchao.png") },
];
/** Escudos dos clubes gaúchos guardados no app (os da ESPN vinham errados ou faltando). */
const CRESTS: Record<string, number> = {
  "avenida": require("../../assets/times/avenida.png"),
  "brasil de pelotas": require("../../assets/times/brasil-de-pelotas.png"),
  "caxias": require("../../assets/times/caxias.png"),
  "caxias do sul": require("../../assets/times/caxias.png"),
  "ec pelotas": require("../../assets/times/ec-pelotas.png"),
  "pelotas": require("../../assets/times/ec-pelotas.png"),
  "guarany de bagé": require("../../assets/times/guarany.png"),
  "guarany": require("../../assets/times/guarany.png"),
  "internacional": require("../../assets/times/internacional.png"),
  "juventude": require("../../assets/times/juventude.png"),
  "monsoon": require("../../assets/times/monsoon.png"),
  "novo hamburgo": require("../../assets/times/novo-hamburgo.png"),
  "são josé-rs": require("../../assets/times/sao-jose.png"),
  "são luiz-rs": require("../../assets/times/sao-luiz.png"),
  "são luiz": require("../../assets/times/sao-luiz.png"),
  "ypiranga": require("../../assets/times/ypiranga.png"),
  "ypiranga-rs": require("../../assets/times/ypiranga.png"),
};
export const localCrest = (team: string) => CRESTS[team.trim().toLowerCase()] ?? null;

/** Ícone de cada site e canal, guardado dentro do app. */
const SOURCE_ICONS: Record<string, number> = {
  bage: require("../../assets/fontes/bage.png"),
  bandrs: require("../../assets/fontes/bandrs.png"),
  c_band: require("../../assets/fontes/c_band.png"),
  c_bands: require("../../assets/fontes/c_bands.png"),
  c_caze: require("../../assets/fontes/c_caze.png"),
  c_cpovo: require("../../assets/fontes/c_cpovo.png"),
  c_desimp: require("../../assets/fontes/c_desimp.png"),
  c_espn: require("../../assets/fontes/c_espn.png"),
  c_gaucha: require("../../assets/fontes/c_gaucha.png"),
  c_ge: require("../../assets/fontes/c_ge.png"),
  c_guaiba: require("../../assets/fontes/c_guaiba.png"),
  c_gzh: require("../../assets/fontes/c_gzh.png"),
  c_jp: require("../../assets/fontes/c_jp.png"),
  c_lance: require("../../assets/fontes/c_lance.png"),
  c_premiere: require("../../assets/fontes/c_premiere.png"),
  c_sportv: require("../../assets/fontes/c_sportv.png"),
  c_tnt: require("../../assets/fontes/c_tnt.png"),
  c_uol: require("../../assets/fontes/c_uol.png"),
  careca: require("../../assets/fontes/careca.png"),
  ccd: require("../../assets/fontes/ccd.png"),
  cnn: require("../../assets/fontes/cnn.png"),
  cpovo: require("../../assets/fontes/cpovo.png"),
  espn: require("../../assets/fontes/espn.png"),
  estadao: require("../../assets/fontes/estadao.png"),
  folha: require("../../assets/fontes/folha.png"),
  gazeta: require("../../assets/fontes/gazeta.png"),
  ge: require("../../assets/fontes/ge.png"),
  goal: require("../../assets/fontes/goal.png"),
  gremiotv: require("../../assets/fontes/gremiotv.png"),
  guaiba: require("../../assets/fontes/guaiba.png"),
  gzh: require("../../assets/fontes/gzh.png"),
  jc: require("../../assets/fontes/jc.png"),
  lance: require("../../assets/fontes/lance.png"),
  oficial: require("../../assets/fontes/oficial.png"),
  osul: require("../../assets/fontes/osul.png"),
  placar: require("../../assets/fontes/placar.png"),
  terra: require("../../assets/fontes/terra.png"),
  torcedores: require("../../assets/fontes/torcedores.png"),
  trivela: require("../../assets/fontes/trivela.png"),
  uol: require("../../assets/fontes/uol.png"),
};
export const sourceIcon = (id: string) => SOURCE_ICONS[id] ?? null;

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
  // Brasileirão vem de "standings"; Gauchão, Libertadores e Sul-Americana (com grupos) de "standings_groups"
  const [bra, groups] = await Promise.all([
    supabase.from("standings").select("*").order("position"),
    supabase.from("standings_groups").select("*").order("position"),
  ]);
  const rows: Standing[] = check(bra);
  return [...rows.map((r) => ({ ...r, competition: "Brasileirão", grp: "" })), ...(groups.error ? [] : (groups.data as Standing[]))];
}

/** Como o Grêmio aparece em cada campeonato: tabela (pontos corridos), classificação (grupos) ou mata-mata. */
export type CompView = "tabela" | "fase" | "agenda" | "resultados";
export function viewsFor(comp: string): { id: CompView; label: string }[] {
  const base: { id: CompView; label: string }[] = [{ id: "agenda", label: "Próximos jogos" }, { id: "resultados", label: "Resultados" }];
  if (comp === "Brasileirão" || comp === "Gauchão") return [{ id: "tabela", label: "Tabela" }, ...base];
  if (comp === "Libertadores" || comp === "Sul-Americana") return [{ id: "tabela", label: "Classificação" }, ...base];
  if (comp === "Copa do Brasil") return [{ id: "fase", label: "Fase e confronto" }, ...base];
  return base;
}

/** Confrontos de mata-mata (ida e volta) do Grêmio num campeonato, do mais recente para o mais antigo. */
export type Tie = { round: string; opponent: string; legs: Match[]; pro: number; contra: number; done: boolean; pens: string | null; result: "classificado" | "eliminado" | "andamento" | "a_disputar" };
export function ties(list: Match[]): Tie[] {
  const groups = new Map<string, Match[]>();
  for (const m of list) {
    const opp = isGremio(m.home_team) ? m.away_team : m.home_team;
    const key = `${m.round ?? "Fase inicial"}|${opp}`;
    groups.set(key, [...(groups.get(key) ?? []), m]);
  }
  const out: Tie[] = [];
  for (const [key, legs] of groups) {
    legs.sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at));
    const [round, opponent] = key.split("|");
    const fin = legs.filter((m) => FINISHED.includes(m.status) && m.home_goals != null);
    const r = record(fin);
    const done = fin.length === legs.length;
    const note = legs[legs.length - 1].note ?? "";
    let result: Tie["result"] = fin.length === 0 ? "a_disputar" : "andamento";
    if (done && /(advance|win)/i.test(note)) result = /(gr[eê]mio|\bGRE\b) (advance|win)/i.test(note) ? "classificado" : "eliminado";
    else if (done && !/1st Leg/i.test(note)) result = r.gp > r.gc ? "classificado" : r.gp < r.gc ? "eliminado" : "andamento";
    const p = note.match(/(gr[eê]mio|\bGRE\b) advance (\d+)-(\d+) on penalties/i) ?? note.match(/advance (\d+)-(\d+) on penalties/i);
    const pens = p ? (p.length === 4 ? `Grêmio ${p[2]} × ${p[3]}` : `${p[1]} × ${p[2]}`) : null;
    out.push({ round, opponent, legs, pro: r.gp, contra: r.gc, done, pens, result });
  }
  return out.sort((a, b) => b.legs[0].kickoff_at.localeCompare(a.legs[0].kickoff_at));
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
