import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { AccountButton, Scroll } from "../../components/screen";
import { Empty, Header, ItemCard, LiveBanner, Loading, MatchCard, Section, useLoad } from "../../components/ui";
import { FINISHED, getLives, getMatches, getNews, getVideos, LIVE_MATCH, type Item, type Match } from "../../lib/data";
import { useSession } from "../../lib/session";
import { useSources } from "../../lib/sources";
import { useTheme } from "../../lib/theme";

type Home = { news: Item[]; videos: Item[]; lives: Item[]; matches: Match[] };

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
    // Só o que é do Grêmio e só dos sites/canais escolhidos; se não houver nada novo, aparecem os mais antigos deles.
    const [news, videos, lives, matches] = await Promise.all([
      safe(getNews(sites, 12), [], errs), safe(getVideos(channels, 4), [], errs), safe(getLives(channels), [], errs), safe(getMatches(), [], errs)]);
    if (errs.length === 4) throw new Error(errs[0]);
    return { news, videos, lives, matches };
  }, [sites.join(), channels.join()], { news: [], videos: [], lives: [], matches: [] });

  const live = data.lives.find((l) => l.live_status === "live") ?? data.lives[0];
  const next = data.matches.find((m) => LIVE_MATCH.includes(m.status)) ?? data.matches.find((m) => !FINISHED.includes(m.status) && Date.parse(m.kickoff_at) > Date.now() - 3 * 3600_000);
  const first = !data.news.length && !data.videos.length;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title={`Olá, ${name || "torcedor"}`} subtitle="As últimas do Tricolor" right={<AccountButton />} />
      {loading && first ? <Loading /> : error && first ? <Loading error={error} onRetry={reload} /> :
        <Scroll refreshing={refreshing} onRefresh={reload}>
          {live ? <LiveBanner item={live} src={byId[live.source_id]} onPress={() => router.navigate("/lives")} /> : null}
          {next ? <><Section title="Próximo jogo" /><MatchCard m={next} highlight /></> : null}

          <Section title="Notícias" note="dos seus 5 sites" />
          {data.news.map((it) => <ItemCard key={it.id} item={it} src={byId[it.source_id]} />)}
          {!data.news.length ? <Empty>Seus sites ainda não publicaram notícias do Grêmio. Você pode trocar os sites em Conta.</Empty> : null}

          <Section title="Vídeos recentes" note="dos seus 5 canais" />
          {data.videos.map((it) => <ItemCard key={it.id} item={it} src={byId[it.source_id]} />)}
          {!data.videos.length ? <Empty>Seus canais ainda não postaram vídeos do Grêmio.</Empty> : null}
          <Pressable onPress={() => router.navigate("/videos")} style={{ paddingVertical: 10, alignItems: "center" }}>
            <Text style={{ color: t.blue, fontWeight: "600" }}>Ver todos os vídeos</Text>
          </Pressable>
        </Scroll>}
    </View>
  );
}
