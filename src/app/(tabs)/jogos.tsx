import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { AccountButton, Scroll } from "../../components/screen";
import { Chips, Empty, Header, Loading, MatchCard, openLink, Section, StandingsTable, useLoad } from "../../components/ui";
import { FINISHED, getMatches, getStandings, type Match, type Standing } from "../../lib/data";
import { useTheme } from "../../lib/theme";

type Tab = "agenda" | "resultados" | "tabela";

export default function Jogos() {
  const t = useTheme();
  const [tab, setTab] = useState<Tab>("agenda");
  const { data, loading, refreshing, error, reload } = useLoad<{ matches: Match[]; table: Standing[] }>(async () => {
    const [matches, table] = await Promise.all([getMatches(), getStandings()]);
    return { matches, table };
  }, [], { matches: [], table: [] });
  const upcoming = data.matches.filter((m) => !FINISHED.includes(m.status));
  const results = data.matches.filter((m) => FINISHED.includes(m.status)).reverse();
  const empty = !data.matches.length && !data.table.length;

  const link = (label: string, url: string) => (
    <Pressable onPress={() => openLink(url)} style={{ paddingVertical: 6 }}>
      <Text style={{ color: t.blue, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title="Jogos" subtitle="Agenda, resultados e tabela do Brasileirão" right={<AccountButton />}>
        <Chips<Tab> value={tab} onChange={setTab} options={[{ id: "agenda", label: "Próximos" }, { id: "resultados", label: "Resultados" }, { id: "tabela", label: "Tabela" }]} />
      </Header>
      {loading && empty ? <Loading /> : error && empty ? <Loading error={error} onRetry={reload} /> :
        <Scroll refreshing={refreshing} onRefresh={reload}>
          {tab === "agenda" ? <>
            <Section title="Próximos jogos" />
            {upcoming.length ? upcoming.map((m, i) => <MatchCard key={m.id} m={m} highlight={i === 0} />) : <Empty>Nenhum jogo marcado por enquanto.</Empty>}
          </> : tab === "resultados" ? <>
            <Section title="Resultados" />
            {results.length ? results.map((m) => <MatchCard key={m.id} m={m} />) : <Empty>Nenhum resultado ainda.</Empty>}
          </> : <>
            <Section title="Brasileirão" note="Série A" />
            {data.table.length ? <StandingsTable rows={data.table} /> : <Empty>Tabela indisponível no momento.</Empty>}
          </>}
          <Text style={{ color: t.muted, fontSize: 12, marginTop: 14 }}>Por enquanto mostramos só o Brasileirão. Para Copa do Brasil, Libertadores e Gauchão:</Text>
          {link("Ver no ge", "https://ge.globo.com/futebol/times/gremio/")}
          {link("Ver todos os jogos no Google", "https://www.google.com/search?q=jogos+do+Gr%C3%AAmio")}
        </Scroll>}
    </View>
  );
}
