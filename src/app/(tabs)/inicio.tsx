import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { AccountButton, Scroll } from "../../components/screen";
import { CompLogo, Empty, Header, ItemCard, LiveBanner, Loading, MatchCard, s, Section, StandingsTable, useLoad } from "../../components/ui";
import { FINISHED, getLives, getMatches, getNews, getStandings, getVideos, latestPerSource, LIVE_MATCH, type Item, type Match, type Standing } from "../../lib/data";
import { useSession } from "../../lib/session";
import { useSources } from "../../lib/sources";
import { useTheme } from "../../lib/theme";

type Home = { news: Item[]; videos: Item[]; lives: Item[]; matches: Match[]; table: Standing[] };

/** Se uma parte falhar, as outras continuam aparecendo. */
async function safe<T>(p: Promise<T>, fallback: T, errs: string[]): Promise<T> {
  try { return await p; } catch (e) { errs.push((e as Error).message); return fallback; }
}

export default function Inicio() {
  const t = useTheme();
  const { name, prefs } = useSession();
  const { byId } = useSources();
  const sites = prefs?.sites ?? [], channels = prefs?.channels ?? [];
  const { data, loading, refreshing, error, reload } = useLoad<Home>(async () => {
    const errs: string[] = [];
    // A notícia mais recente do Grêmio em cada um dos 5 sites, e o vídeo mais recente em cada um dos 5 canais.
    const [news, videos, lives, matches, table] = await Promise.all([
      safe(getNews(sites, 400), [], errs), safe(getVideos(channels, 400), [], errs), safe(getLives(channels), [], errs),
      safe(getMatches(), [], errs), safe(getStandings(), [], errs)]);
    if (errs.length === 5) throw new Error(errs[0]);
    return { news: latestPerSource(news), videos: latestPerSource(videos), lives, matches, table };
  }, [sites.join(), channels.join()], { news: [], videos: [], lives: [], matches: [], table: [] });

  const live = data.lives.find((l) => l.live_status === "live") ?? data.lives[0];
  const next = data.matches.find((m) => LIVE_MATCH.includes(m.status)) ?? data.matches.find((m) => !FINISHED.includes(m.status) && Date.parse(m.kickoff_at) > Date.now() - 3 * 3600_000);
  const first = !data.news.length && !data.videos.length;

  /** Tabela do campeonato do próximo jogo: no Brasileirão, 2 times acima e 2 abaixo do Grêmio; nos outros, o grupo do Grêmio. */
  const table = () => {
    if (!next) return null;
    const rows = data.table.filter((r) => r.competition === next.competition);
    const me = rows.find((r) => r.is_gremio);
    if (!me) return null;
    const br = next.competition === "Brasileirão";
    const list = br ? rows.filter((r) => Math.abs(r.position - me.position) <= 2) : rows.filter((r) => (r.grp ?? "") === (me.grp ?? ""));
    const label = br || next.competition === "Gauchão" ? "Tabela" : "Classificação";
    return <>
      <View style={[s.row, { justifyContent: "space-between", alignItems: "center", marginTop: 22, marginBottom: 10 }]}>
        <View style={[s.row, { gap: 8, flexShrink: 1 }]}>
          <CompLogo name={next.competition} size={22} />
          <Text style={[s.h2, { color: t.fg, flexShrink: 1 }]} numberOfLines={1}>{label} · {next.competition}</Text>
        </View>
        {!br && me.grp ? <Text style={{ color: t.muted, fontSize: 12 }}>{me.grp}</Text> : null}
      </View>
      <StandingsTable rows={list} zones={br} total={br ? rows.length : undefined} />
      <Pressable onPress={() => router.navigate("/jogos")} style={{ paddingVertical: 10, alignItems: "center" }}>
        <Text style={{ color: t.blue, fontWeight: "600" }}>Ver tabela completa</Text>
      </Pressable>
    </>;
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title={`Olá, ${name || "torcedor"}`} subtitle="As últimas do Tricolor" right={<AccountButton />} />
      {loading && first ? <Loading /> : error && first ? <Loading error={error} onRetry={reload} /> :
        <Scroll refreshing={refreshing} onRefresh={reload}>
          {live ? <LiveBanner item={live} src={byId[live.source_id]} onPress={() => router.navigate({ pathname: "/videos", params: { aba: "lives" } })} /> : null}
          {next ? <><Section title="Próximo jogo" /><MatchCard m={next} highlight /></> : null}
          {table()}

          <Section title="Notícias" note="a mais recente de cada site" />
          {data.news.map((it) => <ItemCard key={it.id} item={it} src={byId[it.source_id]} />)}
          {!data.news.length ? <Empty>Seus sites ainda não publicaram notícias do Grêmio. Você pode trocar os sites em Conta.</Empty> : null}
          <Pressable onPress={() => router.navigate("/noticias")} style={{ paddingVertical: 10, alignItems: "center" }}>
            <Text style={{ color: t.blue, fontWeight: "600" }}>Ver todas as notícias</Text>
          </Pressable>

          <Section title="Vídeos" note="o mais recente de cada canal" />
          {data.videos.map((it) => <ItemCard key={it.id} item={it} src={byId[it.source_id]} />)}
          {!data.videos.length ? <Empty>Seus canais ainda não postaram vídeos do Grêmio.</Empty> : null}
          <Pressable onPress={() => router.navigate("/videos")} style={{ paddingVertical: 10, alignItems: "center" }}>
            <Text style={{ color: t.blue, fontWeight: "600" }}>Ver todos os vídeos</Text>
          </Pressable>
        </Scroll>}
    </View>
  );
}
