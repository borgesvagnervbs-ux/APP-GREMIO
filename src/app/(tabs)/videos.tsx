import { useState } from "react";
import { View } from "react-native";
import { AccountButton, Scroll } from "../../components/screen";
import { Chips, Empty, Header, ItemCard, Loading, useLoad } from "../../components/ui";
import { getVideos, type Item } from "../../lib/data";
import { useSession } from "../../lib/session";
import { useSources } from "../../lib/sources";
import { useTheme } from "../../lib/theme";

export default function Videos() {
  const t = useTheme();
  const { prefs } = useSession();
  const { byId } = useSources();
  const channels = prefs?.channels ?? [];
  const [filter, setFilter] = useState("todos");
  // só vídeos do Grêmio, só dos canais escolhidos
  const { data, loading, refreshing, error, reload } = useLoad<Item[]>(() => getVideos(channels, 60), [channels.join()], []);
  const list = filter === "todos" ? data : data.filter((v) => v.source_id === filter);
  const options = [{ id: "todos", label: "Todos" }, ...channels.map((id) => ({ id, label: byId[id]?.name ?? id }))];

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title="Vídeos" subtitle="Dos 5 canais que você escolheu" right={<AccountButton />}>
        <Chips options={options} value={filter} onChange={setFilter} />
      </Header>
      {loading && !data.length ? <Loading /> : error && !data.length ? <Loading error={error} onRetry={reload} /> :
        <Scroll refreshing={refreshing} onRefresh={reload}>
          <View style={{ height: 6 }} />
          {list.length ? list.map((it) => <ItemCard key={it.id} item={it} src={byId[it.source_id]} />)
            : <Empty>{filter === "todos" ? "Seus canais ainda não postaram vídeos do Grêmio." : "Nenhum vídeo recente deste canal sobre o Grêmio."}</Empty>}
        </Scroll>}
    </View>
  );
}
