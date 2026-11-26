import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { AccountButton, Scroll } from "../../components/screen";
import { Empty, Header, ItemCard, LiveBanner, Loading, MatchCard, Section, useLoad } from "../../components/ui";
import { FINISHED, getAnyNews, getAnyVideos, getLives, getMatches, getNews, getVideos, LIVE_MATCH, type Item, type Match } from "../../lib/data";
import { useSession } from "../../lib/session";
import { useSources } from "../../lib/sources";
import { useTheme } from "../../lib/theme";

type Home = { news: Item[]; moreNews: Item[]; videos: Item[]; moreVideos: Item[]; lives: Item[]; matches: Match[] };
const MIN_NEWS = 8, MIN_VIDEOS = 4;

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
    const [news, videos, lives, matches] = await Promise.all([
      safe(getNews(sites, 12), [], errs), safe(getVideos(channels, MIN_VIDEOS), [], errs), safe(getLives(channels), [], errs), safe(getMatches(), [], errs)]);
    // A tela nunca fica vazia: se os sites/canais escolhidos têm pouca coisa, completa com as últimas de todos.
    const [moreNews, moreVideos] = await Promise.all([
      news.length < MIN_NEWS ? safe(getAnyNews(news.map((n) => n.id), MIN_NEWS - news.length + 4), [], errs) : Promise.resolve([]),
      videos.length < MIN_VIDEOS ? safe(getAnyVideos(videos.map((v) => v.id), MIN_VIDEOS - videos.length + 2), [], errs) : Promise.resolve([]),
    ]);
    if (errs.length === 4) throw new Error(errs[0]);
    return { news, moreNews, videos, moreVideos, lives, matches };
  }, [sites.join(), channels.join()], { news: [], moreNews: [], videos: [], moreVideos: [], lives: [], matches: [] });

  const live = data.lives.find((l) => l.live_status === "live") ?? data.lives[0];
  const next = data.matches.find((m) => LIVE_MATCH.includes(m.status)) ?? data.matches.find((m) => !FINISHED.includes(m.status) && Date.parse(m.kickoff_at) > Date.now() - 3 * 3600_000);
  const first = !data.news.length && !data.moreNews.length && !data.videos.length && !data.moreVideos.length;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title={`Olá, ${name || "torcedor"}`} subtitle="As últimas do Tricolor" right={<AccountButton />} />
      {loading && first ? <Loading /> : error && first ? <Loading error={error} onRetry={reload} /> :
        <Scroll refreshing={refreshing} onRefresh={reload}>
          {live ? <LiveBanner item={live} src={byId[live.source_id]} onPress={() => router.navigate("/lives")} /> : null}
          {next ? <><Section title="Próximo jogo" /><MatchCard m={next} highlight /></> : null}

          <Section title="Notícias" note="dos seus 5 sites" />
          {data.news.map((it) => <ItemCard key={it.id} item={it} src={byId[it.source_id]} />)}
          {data.moreNews.length ? <>
            {data.news.length ? <Section title="Mais notícias" note="de outros sites" /> : <Text style={{ color: t.muted, fontSize: 12 }}>Seus sites não publicaram nada sobre o Grêmio por enquanto. Veja as últimas de outros sites:</Text>}
            {data.moreNews.map((it) => <ItemCard key={it.id} item={it} src={byId[it.source_id]} />)}
          </> : null}
          {!data.news.length && !data.moreNews.length ? <Empty>Nenhuma notícia por enquanto. Puxe a tela para baixo para atualizar.</Empty> : null}

          <Section title="Vídeos recentes" note="dos seus 5 canais" />
          {data.videos.map((it) => <ItemCard key={it.id} item={it} src={byId[it.source_id]} />)}
          {data.moreVideos.length ? <>
            <Text style={{ color: t.muted, fontSize: 12 }}>{data.videos.length ? "Mais vídeos de outros canais:" : "Seus canais não postaram vídeos do Grêmio nos últimos dias. Veja os de outros canais:"}</Text>
            {data.moreVideos.map((it) => <ItemCard key={it.id} item={it} src={byId[it.source_id]} />)}
          </> : null}
          {!data.videos.length && !data.moreVideos.length ? <Empty>Nenhum vídeo por enquanto.</Empty> : null}
          <Pressable onPress={() => router.navigate("/videos")} style={{ paddingVertical: 10, alignItems: "center" }}>
            <Text style={{ color: t.blue, fontWeight: "600" }}>Ver todos os vídeos</Text>
          </Pressable>
        </Scroll>}
    </View>
  );
}
