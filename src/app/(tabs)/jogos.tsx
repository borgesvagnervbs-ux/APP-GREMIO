import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { AccountButton, Scroll } from "../../components/screen";
import { Chips, Empty, Header, Loading, MatchCard, openLink, s, Section, StandingsTable, useLoad } from "../../components/ui";
import { FINISHED, getMatches, getStandings, isGremio, record, type Match, type Standing } from "../../lib/data";
import { useTheme } from "../../lib/theme";

type Tab = "agenda" | "resultados" | "tabela";
type Where = "todos" | "casa" | "fora";

export default function Jogos() {
  const t = useTheme();
  const [tab, setTab] = useState<Tab>("tabela");
  const [where, setWhere] = useState<Where>("todos");
  const { data, loading, refreshing, error, reload } = useLoad<{ matches: Match[]; table: Standing[] }>(async () => {
    const [matches, table] = await Promise.all([getMatches(), getStandings()]);
    return { matches, table };
  }, [], { matches: [], table: [] });
  const upcoming = data.matches.filter((m) => !FINISHED.includes(m.status));
  const allResults = data.matches.filter((m) => FINISHED.includes(m.status)).reverse();
  const results = where === "todos" ? allResults : allResults.filter((m) => isGremio(m.home_team) === (where === "casa"));
  const rec = record(results);
  const empty = !data.matches.length && !data.table.length;
  const gremio = data.table.find((r) => r.is_gremio);

  const link = (label: string, url: string) => (
    <Pressable onPress={() => openLink(url)} style={{ paddingVertical: 6 }}>
      <Text style={{ color: t.blue, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title="Jogos" subtitle="Tabela, próximos jogos e resultados" right={<AccountButton />}>
        <Chips<Tab> value={tab} onChange={setTab} options={[{ id: "tabela", label: "Tabela do Brasileirão" }, { id: "agenda", label: "Próximos jogos" }, { id: "resultados", label: "Resultados" }]} />
      </Header>
      {loading && empty ? <Loading /> : error && empty ? <Loading error={error} onRetry={reload} /> :
        <Scroll refreshing={refreshing} onRefresh={reload}>
          {tab === "agenda" ? <>
            <Section title="Próximos jogos" />
            {upcoming.length ? upcoming.map((m, i) => <MatchCard key={m.id} m={m} highlight={i === 0} />) : <Empty>Nenhum jogo marcado por enquanto.</Empty>}
          </> : tab === "resultados" ? <>
            <Section title="Resultados" note="2026 · todos os campeonatos" />
            <View style={[s.row, { gap: 8, marginBottom: 4 }]}>
              {(["todos", "casa", "fora"] as Where[]).map((w) => {
                const on = w === where;
                return (
                  <Pressable key={w} onPress={() => setWhere(w)} accessibilityRole="button" accessibilityState={{ selected: on }}
                    style={[s.chip, { flex: 1, alignItems: "center", paddingVertical: 9, borderColor: on ? t.blue : t.line, backgroundColor: on ? t.blue : t.surface }]}>
                    <Text style={{ color: on ? t.blueInk : t.fg, fontWeight: "700" }}>{w === "todos" ? "Todos" : w === "casa" ? "Em casa" : "Fora"}</Text>
                  </Pressable>
                );
              })}
            </View>
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
            </View>
            {results.length ? results.map((m) => <MatchCard key={m.id} m={m} onPress={() => router.push(`/jogo/${m.id}`)} />) : <Empty>Nenhum resultado ainda.</Empty>}
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
          </>}
          <Text style={{ color: t.muted, fontSize: 12, marginTop: 14 }}>Por enquanto mostramos só o Brasileirão. Para Copa do Brasil, Libertadores e Gauchão:</Text>
          {link("Ver no ge", "https://ge.globo.com/futebol/times/gremio/")}
          {link("Ver todos os jogos no Google", "https://www.google.com/search?q=jogos+do+Gr%C3%AAmio")}
        </Scroll>}
    </View>
  );
}
