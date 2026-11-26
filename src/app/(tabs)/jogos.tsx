import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { AccountButton, Scroll } from "../../components/screen";
import { Chips, Empty, Header, Loading, MatchCard, MatchFilters, openLink, s, Section, StandingsTable, useLoad } from "../../components/ui";
import { competitionsIn, filterMatches, FINISHED, getMatches, getStandings, record, type Match, type Standing, type Where } from "../../lib/data";
import { useTheme } from "../../lib/theme";

type Tab = "agenda" | "resultados" | "tabela";

export default function Jogos() {
  const t = useTheme();
  const [tab, setTab] = useState<Tab>("tabela");
  const [where, setWhere] = useState<Where>("todos");
  const [comp, setComp] = useState("todos");
  const { data, loading, refreshing, error, reload } = useLoad<{ matches: Match[]; table: Standing[] }>(async () => {
    const [matches, table] = await Promise.all([getMatches(), getStandings()]);
    return { matches, table };
  }, [], { matches: [], table: [] });
  const comps = competitionsIn(data.matches);
  const filtered = filterMatches(data.matches, comp, where);
  const upcoming = filtered.filter((m) => !FINISHED.includes(m.status));
  const results = filtered.filter((m) => FINISHED.includes(m.status)).reverse();
  const rec = record(results);
  const empty = !data.matches.length && !data.table.length;
  const gremio = data.table.find((r) => r.is_gremio);
  const scope = `2026 · ${comp === "todos" ? "todos os campeonatos" : comp}${where === "casa" ? " · em casa" : where === "fora" ? " · fora" : ""}`;

  const link = (label: string, url: string) => (
    <Pressable onPress={() => openLink(url)} style={{ paddingVertical: 6 }}>
      <Text style={{ color: t.blue, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
  const filters = <View style={{ marginTop: 14 }}><MatchFilters comps={comps} comp={comp} onComp={setComp} where={where} onWhere={setWhere} /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title="Jogos" subtitle="Tabela, próximos jogos, resultados e estatísticas" right={<AccountButton />}>
        <Chips<Tab> value={tab} onChange={setTab} options={[{ id: "tabela", label: "Tabela do Brasileirão" }, { id: "agenda", label: "Próximos jogos" }, { id: "resultados", label: "Resultados" }]} />
      </Header>
      {loading && empty ? <Loading /> : error && empty ? <Loading error={error} onRetry={reload} /> :
        <Scroll refreshing={refreshing} onRefresh={reload}>
          {tab === "agenda" ? <>
            {filters}
            <Section title="Próximos jogos" note={scope} />
            {upcoming.length ? upcoming.map((m, i) => <MatchCard key={m.id} m={m} highlight={i === 0} />) : <Empty>Nenhum jogo marcado com esses filtros.</Empty>}
          </> : tab === "resultados" ? <>
            {filters}
            <Section title="Resultados" note={scope} />
            <View style={[s.card, { backgroundColor: "#000", borderColor: "#000", padding: 12, marginBottom: 4 }]}>
              <View style={[s.row, { justifyContent: "space-between" }]}>
                {[["Jogos", rec.j], ["Vitórias", rec.v], ["Empates", rec.e], ["Derrotas", rec.d], ["Pontos", rec.pts]].map(([label, n]) => (
                  <View key={label} style={{ alignItems: "center", flex: 1 }}>
                    <Text style={[s.score, { color: label === "Pontos" ? "#5fb0f0" : "#fff", minWidth: 0, fontSize: 26 }]}>{n}</Text>
                    <Text style={{ color: "#fff", fontSize: 11 }}>{label}</Text>
                  </View>
                ))}
              </View>
              <Text style={{ color: "#cfd8e3", fontSize: 12, textAlign: "center", marginTop: 8 }}>
                {rec.gp} gols marcados · {rec.gc} sofridos{rec.j ? ` · ${Math.round((rec.pts / (rec.j * 3)) * 100)}% de aproveitamento` : ""}
              </Text>
              <Pressable onPress={() => router.push({ pathname: "/estatisticas", params: { comp, where } })} accessibilityRole="button"
                style={({ pressed }) => [s.btn, { marginTop: 12, paddingVertical: 11, backgroundColor: t.blue, borderColor: t.blue, opacity: pressed ? 0.85 : 1 }]}>
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>📊  Estatísticas</Text>
              </Pressable>
            </View>
            {results.length ? results.map((m) => <MatchCard key={m.id} m={m} onPress={() => router.push(`/jogo/${m.id}`)} />) : <Empty>Nenhum resultado com esses filtros.</Empty>}
          </> : <>
            <Section title="Tabela do Brasileirão" note="Série A 2026" />
            {gremio ? <View style={[s.card, s.row, { backgroundColor: t.head, borderColor: t.head, padding: 14, gap: 12, marginBottom: 4 }]}>
              <Text style={[s.score, { color: "#fff", minWidth: 0 }]}>{gremio.position}º</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.h3, { color: "#fff" }]}>Grêmio</Text>
                <Text style={{ color: t.headMuted, fontSize: 13 }}>{gremio.points} pontos em {gremio.played} jogos · {gremio.won}V {gremio.draw}E {gremio.lost}D</Text>
              </View>
            </View> : null}
            {data.table.length ? <StandingsTable rows={data.table} /> : <Empty>Tabela indisponível no momento.</Empty>}
            <Text style={{ color: t.muted, fontSize: 12, marginTop: 14 }}>Quer mais detalhes?</Text>
            {link("Ver no ge", "https://ge.globo.com/futebol/times/gremio/")}
          </>}
        </Scroll>}
    </View>
  );
}
