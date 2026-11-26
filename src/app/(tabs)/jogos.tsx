// Aba Jogos. Ordem dos filtros, todos ligados entre si:
// 1) campeonato  2) tabela/classificação/fase, próximos jogos, resultados  3) casa e fora / em casa / fora
import { router } from "expo-router";
import { useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { AccountButton, Scroll } from "../../components/screen";
import { Chips, CompChips, CompLogo, Empty, Header, Loading, MatchCard, s, Section, StandingsTable, useLoad, WhereButtons } from "../../components/ui";
import { competitionsIn, filterMatches, FINISHED, getMatches, getStandings, isGremio, record, ties, viewsFor, type CompView, type Match, type Standing, type Tie, type Where } from "../../lib/data";
import { useTheme } from "../../lib/theme";

const GROUP_STAGE = /grupos|1ª fase|classificação|^$/i;
const RESULT_TXT: Record<Tie["result"], string> = { classificado: "Classificado", eliminado: "Eliminado", andamento: "Em andamento", a_disputar: "A disputar" };

export default function Jogos() {
  const t = useTheme();
  const [comp, setCompState] = useState("Brasileirão");
  const [view, setView] = useState<CompView>("tabela");
  const [where, setWhere] = useState<Where>("todos");
  const { data, loading, refreshing, error, reload } = useLoad<{ matches: Match[]; table: Standing[] }>(async () => {
    const [matches, table] = await Promise.all([getMatches(), getStandings()]);
    return { matches, table };
  }, [], { matches: [], table: [] });

  const comps = competitionsIn(data.matches);
  const views = viewsFor(comp);
  const cur: CompView = views.some((v) => v.id === view) ? view : views[0].id;
  const setComp = (c: string) => {
    setCompState(c);
    const vs = viewsFor(c);
    // ao trocar de campeonato, mantém "próximos"/"resultados"; senão abre a tabela/fase do novo campeonato
    if (!vs.some((v) => v.id === view) || view === "tabela" || view === "fase") setView(vs[0].id);
  };

  const filtered = filterMatches(data.matches, comp, where);
  const upcoming = filtered.filter((m) => !FINISHED.includes(m.status));
  const results = filtered.filter((m) => FINISHED.includes(m.status)).reverse();
  const rec = record(results);
  const empty = !data.matches.length && !data.table.length;
  const whereTxt = where === "casa" ? " · em casa" : where === "fora" ? " · fora" : "";
  const scope = `2026 · ${comp === "todos" ? "todos os campeonatos" : comp}${whereTxt}`;

  const summary = (extra?: ReactNode) => (
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
      {extra}
      <Pressable onPress={() => router.push({ pathname: "/estatisticas", params: { comp, where } })} accessibilityRole="button"
        style={({ pressed }) => [s.btn, { marginTop: 12, paddingVertical: 11, backgroundColor: t.blue, borderColor: t.blue, opacity: pressed ? 0.85 : 1 }]}>
        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>📊  Estatísticas</Text>
      </Pressable>
    </View>
  );

  const standings = () => {
    const rows = data.table.filter((r) => r.competition === comp);
    const label = comp === "Brasileirão" || comp === "Gauchão" ? "Tabela" : "Classificação";
    const groups = [...new Set(rows.map((r) => r.grp ?? ""))].sort((a, b) => Number(rows.some((r) => r.grp === b && r.is_gremio)) - Number(rows.some((r) => r.grp === a && r.is_gremio)) || a.localeCompare(b));
    const me = rows.find((r) => r.is_gremio);
    return <>
      <Section title={`${label} · ${comp}`} note={whereTxt ? `campanha do Grêmio${whereTxt}` : "2026"} />
      {me && where === "todos" ? <View style={[s.card, s.row, { backgroundColor: t.head, borderColor: t.head, padding: 14, gap: 12, marginBottom: 4 }]}>
        <Text style={[s.score, { color: "#fff", minWidth: 0 }]}>{me.position}º</Text>
        <View style={{ flex: 1 }}>
          <Text style={[s.h3, { color: "#fff" }]}>Grêmio{me.grp ? ` · ${me.grp}` : ""}</Text>
          <Text style={{ color: t.headMuted, fontSize: 13 }}>{me.points} pontos em {me.played} jogos · {me.won}V {me.draw}E {me.lost}D</Text>
        </View>
      </View> : null}
      {where !== "todos" ? summary() : null}
      {/* primeiro a fase mais longe que o Grêmio chegou (final, semi, quartas...), depois os grupos, com o do Grêmio primeiro */}
      {comp !== "Brasileirão" ? playoffs() : null}
      {comp !== "Brasileirão" && rows.length ? <Section title={comp === "Gauchão" ? "Fase de classificação" : "Fase de grupos"} note={me?.grp ? `grupo do Grêmio primeiro` : undefined} /> : null}
      {rows.length ? groups.map((g) => <View key={g} style={{ gap: 6 }}>
        {g ? <Text style={[s.h3, { color: t.fg, marginTop: 6 }]}>{g}</Text> : null}
        <StandingsTable rows={rows.filter((r) => (r.grp ?? "") === g)} zones={comp === "Brasileirão"} />
      </View>) : <Empty>{label} do {comp} indisponível no momento.</Empty>}
    </>;
  };

  const tieCard = (tie: Tie) => {
    const legs = tie.legs.filter((m) => where === "todos" || isGremio(m.home_team) === (where === "casa"));
    const color = tie.result === "classificado" ? t.blue : tie.result === "eliminado" ? "#000" : t.muted;
    return (
      <View key={tie.round + tie.opponent} style={[s.card, { backgroundColor: t.surface, borderColor: t.line, padding: 12, gap: 8 }]}>
        <View style={[s.row, { justifyContent: "space-between", gap: 8 }]}>
          <View style={{ flexShrink: 1 }}>
            <Text style={[s.h3, { color: t.fg }]}>{tie.round}</Text>
            <Text style={{ color: t.muted, fontSize: 13 }}>Grêmio × {tie.opponent}{tie.legs.length > 1 ? " · ida e volta" : " · jogo único"}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[s.tag, { backgroundColor: color, color: "#fff" }]}>{(tie.result === "classificado" && /final$/i.test(tie.round) && !/semi|quartas|oitavas/i.test(tie.round) ? "CAMPEÃO" : RESULT_TXT[tie.result].toUpperCase())}</Text>
            {tie.legs.length > 1 && tie.result !== "a_disputar" ? <Text style={{ color: t.fg, fontSize: 12, marginTop: 4 }}>Agregado: Grêmio {tie.pro} × {tie.contra}</Text> : null}
            {tie.pens ? <Text style={{ color: t.fg, fontSize: 12 }}>Pênaltis: {tie.pens}</Text> : null}
          </View>
        </View>
        {legs.length ? legs.map((m) => <MatchCard key={m.id} m={m} onPress={FINISHED.includes(m.status) ? () => router.push(`/jogo/${m.id}`) : undefined} />)
          : <Text style={{ color: t.muted, fontSize: 12 }}>Nenhum jogo {where === "casa" ? "em casa" : "fora"} neste confronto.</Text>}
      </View>
    );
  };

  const knockout = () => {
    const list = ties(data.matches.filter((m) => m.competition === comp));
    return <>
      <Section title="Fase e confronto" note={comp} />
      {list.length ? list.map(tieCard) : <Empty>Nenhum confronto encontrado.</Empty>}
    </>;
  };

  /** Mata-matas depois da fase de grupos/classificação (Gauchão, Sul-Americana, Libertadores). */
  const playoffs = () => {
    const list = ties(data.matches.filter((m) => m.competition === comp && !GROUP_STAGE.test(m.round ?? "")));
    return list.length ? <>
      <Section title="Mata-mata" note="da fase mais recente para a primeira" />
      {list.map(tieCard)}
    </> : null;
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title="Jogos" subtitle="Tabelas, jogos, resultados e estatísticas" right={<AccountButton />} />
      {loading && empty ? <Loading /> : error && empty ? <Loading error={error} onRetry={reload} /> :
        <Scroll refreshing={refreshing} onRefresh={reload}>
          <View style={{ gap: 10, marginTop: 14 }}>
            <CompChips comps={comps} comp={comp} onComp={setComp} />
            <Chips<CompView> padded={false} value={cur} onChange={setView} options={views} />
            <WhereButtons where={where} onWhere={setWhere} />
          </View>
          {comp !== "todos" ? <View style={[s.row, { gap: 8, marginTop: 4 }]}><CompLogo name={comp} size={22} /><Text style={{ color: t.muted, fontSize: 12 }}>{scope}</Text></View> : null}

          {cur === "tabela" ? standings() : cur === "fase" ? knockout() : cur === "agenda" ? <>
            <Section title="Próximos jogos" note={scope} />
            {upcoming.length ? upcoming.map((m, i) => <MatchCard key={m.id} m={m} highlight={i === 0} />) : <Empty>Nenhum jogo marcado com esses filtros.</Empty>}
          </> : <>
            <Section title="Resultados" note={scope} />
            {summary()}
            {results.length ? results.map((m) => <MatchCard key={m.id} m={m} onPress={() => router.push(`/jogo/${m.id}`)} />) : <Empty>Nenhum resultado com esses filtros.</Empty>}
          </>}
        </Scroll>}
    </View>
  );
}
