import { useState } from "react";
import { View } from "react-native";
import { AccountButton, Scroll } from "../../components/screen";
import { Chips, Empty, Header, ItemCard, Loading, Section, useLoad } from "../../components/ui";
import { getAnyVideos, getVideos, type Item } from "../../lib/data";
import { useSession } from "../../lib/session";
import { useSources } from "../../lib/sources";
import { useTheme } from "../../lib/theme";

export default function Videos() {
  const t = useTheme();
  const { prefs } = useSession();
  const { byId } = useSources();
  const channels = prefs?.channels ?? [];
  const [filter, setFilter] = useState("todos");
  const { data: res, loading, refreshing, error, reload } = useLoad<{ mine: Item[]; more: Item[] }>(async () => {
    const mine = await getVideos(channels, 60);
    // a tela nunca fica vazia: se seus canais postaram pouco, mostra também os de outros canais
    const more = mine.length < 8 ? await getAnyVideos(mine.map((v) => v.id), 12).catch(() => []) : [];
    return { mine, more };
  }, [channels.join()], { mine: [], more: [] });
  const data = res.mine;
  const list = filter === "todos" ? data : data.filter((v) => v.source_id === filter);
  const options = [{ id: "todos", label: "Todos" }, ...channels.map((id) => ({ id, label: byId[id]?.name ?? id }))];

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title="Vídeos" subtitle="Dos 5 canais que você escolheu" right={<AccountButton />}>
        <Chips options={options} value={filter} onChange={setFilter} />
      </Header>
      {loading && !data.length && !res.more.length ? <Loading /> : error && !data.length && !res.more.length ? <Loading error={error} onRetry={reload} /> :
        <Scroll refreshing={refreshing} onRefresh={reload}>
          <View style={{ height: 6 }} />
          {list.length ? list.map((it) => <ItemCard key={it.id} item={it} src={byId[it.source_id]} />)
            : <Empty>{filter === "todos" ? "Seus canais não postaram vídeos do Grêmio nos últimos dias." : "Nenhum vídeo recente deste canal sobre o Grêmio."}</Empty>}
          {res.more.length ? <>
            <Section title="De outros canais" note="vídeos recentes do Grêmio" />
            {res.more.map((it) => <ItemCard key={it.id} item={it} src={byId[it.source_id]} />)}
          </> : null}
        </Scroll>}
    </View>
  );
}
