import { useLocalSearchParams, router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { LivesBody } from "../../components/lives";
import { AccountButton, Scroll } from "../../components/screen";
import { Chips, Empty, Header, ItemCard, Loading, NavTabs, useLoad } from "../../components/ui";
import { getVideos, sourceIcon, type Item } from "../../lib/data";
import { useSession } from "../../lib/session";
import { useSources } from "../../lib/sources";
import { useTheme } from "../../lib/theme";

type Aba = "videos" | "lives";

/** Aba Vídeos, com duas abas internas: Vídeos (dos 5 canais) e Lives. */
export default function Videos() {
  const t = useTheme();
  const params = useLocalSearchParams<{ aba?: string }>();
  const aba: Aba = params.aba === "lives" ? "lives" : "videos";
  const setAba = (a: Aba) => router.setParams({ aba: a });
  const { prefs } = useSession();
  const { byId } = useSources();
  const channels = prefs?.channels ?? [];
  const [filter, setFilter] = useState("todos");
  // só vídeos do Grêmio, só dos canais escolhidos
  const { data, loading, refreshing, error, reload } = useLoad<Item[]>(() => getVideos(channels, 60), [channels.join()], []);
  const list = filter === "todos" ? data : data.filter((v) => v.source_id === filter);
  const options = [{ id: "todos", label: "Todos" }, ...channels.map((id) => ({ id, label: byId[id]?.name ?? id, icon: sourceIcon(id) }))];

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title="Vídeos" subtitle={aba === "videos" ? "Dos 5 canais que você escolheu" : "Ao vivo agora e agendadas nos seus canais"} right={<AccountButton />}>
        <NavTabs<Aba> value={aba} onChange={setAba} tabs={[{ id: "videos", label: "Vídeos", icon: "play-circle" }, { id: "lives", label: "Lives", icon: "radio" }]} />
        {aba === "videos" ? <View style={{ paddingTop: 10 }}><Chips options={options} value={filter} onChange={setFilter} /></View> : null}
      </Header>
      {aba === "lives" ? <LivesBody /> :
        loading && !data.length ? <Loading /> : error && !data.length ? <Loading error={error} onRetry={reload} /> :
          <Scroll refreshing={refreshing} onRefresh={reload}>
            <View style={{ height: 6 }} />
            {list.length ? list.map((it) => <ItemCard key={it.id} item={it} src={byId[it.source_id]} />)
              : <Empty>{filter === "todos" ? "Seus canais ainda não postaram vídeos do Grêmio." : "Nenhum vídeo recente deste canal sobre o Grêmio."}</Empty>}
          </Scroll>}
    </View>
  );
}
