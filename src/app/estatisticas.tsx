// Estatísticas do Grêmio de acordo com os filtros (campeonato + casa/fora).
// Mesmas métricas que os sites de estatística (Sofascore, FBref, ogol): totais e médias por jogo.
import { router, useLocalSearchParams } from "expo-router";
import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Empty, Header, Loading, MatchCard, MatchFilters, s, Section, useLoad } from "../components/ui";
import { competitionsIn, filterMatches, FINISHED, getMatches, gremioStats, num, type Match, type Scorer, type Where } from "../lib/data";
import { useTheme } from "../lib/theme";

export default function Estatisticas() {
  const t = useTheme();
  const p = useLocalSearchParams<{ comp?: string; where?: string }>();
  const [comp, setComp] = useState(p.comp || "todos");
  const [where, setWhere] = useState<Where>((["todos", "casa", "fora"].includes(p.where ?? "") ? p.where : "todos") as Where);
  const { data, loading, error, reload } = useLoad<Match[]>(getMatches, [], []);
  const back = () => (router.canGoBack() ? router.back() : router.replace("/jogos"));
  const close = <Pressable onPress={back} accessibilityRole="button" style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: "#fff" }}>
    <Text style={{ color: "#000", fontSize: 15, fontWeight: "600" }}>Voltar</Text></Pressable>;

  const comps = competitionsIn(data);
  const list = filterMatches(data, comp, where).filter((m) => FINISHED.includes(m.status));
  const st = gremioStats(list);
  const scope = `${comp === "todos" ? "Todos os campeonatos" : comp} · ${where === "casa" ? "em casa" : where === "fora" ? "fora de casa" : "casa e fora"}`;

  const card = (children: ReactNode) => <View style={[s.card, { backgroundColor: t.surface, borderColor: t.line, padding: 12 }]}>{children}</View>;
  const tile = (value: string | number, label: string, dark?: boolean) => (
    <View key={label} style={{ flexBasis: "30%", flexGrow: 1, alignItems: "center", paddingVertical: 10, paddingHorizontal: 4, borderRadius: 10, backgroundColor: dark ? "#000" : t.chip }}>
      <Text style={[s.score, { minWidth: 0, fontSize: 26, color: dark ? "#fff" : t.blue }]}>{value}</Text>
      <Text style={{ color: dark ? "#fff" : t.fg, fontSize: 11, textAlign: "center" }}>{label}</Text>
    </View>
  );
  const grid = (tiles: ReactNode[]) => <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{tiles}</View>;
  const pct = (x: number | null) => (x == null ? "—" : `${Math.round(x * 100)}%`);

  const ranking = (rows: Scorer[], value: (r: Scorer) => number, extra?: (r: Scorer) => string) => card(rows.length ? rows.slice(0, 10).map((r, i) => (
    <View key={r.name} style={[s.row, { gap: 10, paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: t.line }]}>
      <Text style={{ width: 22, color: i < 3 ? t.blue : t.muted, fontWeight: "800", textAlign: "center" }}>{i + 1}</Text>
      <Text style={{ flex: 1, color: t.fg, fontWeight: i < 3 ? "700" : "500" }} numberOfLines={1}>{r.name}</Text>
      {extra ? <Text style={{ color: t.muted, fontSize: 12 }}>{extra(r)}</Text> : null}
      <Text style={[s.h3, { color: t.fg, minWidth: 28, textAlign: "right" }]}>{value(r)}</Text>
    </View>
  )) : <Text style={{ color: t.muted }}>Sem dados com esses filtros.</Text>);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title="Estatísticas" subtitle="Números do Grêmio em 2026" right={close} />
      {loading && !data.length ? <Loading /> : error && !data.length ? <Loading error={error} onRetry={reload} /> :
        <ScrollView contentContainerStyle={[s.wrap, { gap: 10, paddingVertical: 14, paddingBottom: 40 }]}>
          <MatchFilters comps={comps} comp={comp} onComp={setComp} where={where} onWhere={setWhere} />
          <Text style={{ color: t.muted, fontSize: 12 }}>{scope} · {st.j} jogo{st.j === 1 ? "" : "s"} encerrado{st.j === 1 ? "" : "s"}</Text>

          {!st.j ? <Empty>Nenhum jogo encerrado com esses filtros.</Empty> : <>
            <Section title="Campanha" />
            {grid([tile(st.j, "Jogos", true), tile(st.v, "Vitórias", true), tile(st.e, "Empates", true), tile(st.d, "Derrotas", true), tile(st.pts, "Pontos", true), tile(pct(st.aproveitamento), "Aproveitamento", true)])}

            <Section title="Gols" />
            {grid([
              tile(st.gp, "Gols feitos"), tile(st.gc, "Gols sofridos"), tile(st.gp - st.gc > 0 ? `+${st.gp - st.gc}` : st.gp - st.gc, "Saldo"),
              tile(num(st.mediaGp, 2), "Média de gols feitos por jogo"), tile(num(st.mediaGc, 2), "Média de gols sofridos por jogo"), tile(num(st.j ? (st.gp + st.gc) / st.j : null, 2), "Média de gols por jogo (total)"),
              tile(st.semSofrer, "Jogos sem sofrer gol"), tile(st.semMarcar, "Jogos sem marcar"), tile(`${st.goalsBy.first} / ${st.goalsBy.second}`, "Gols no 1º / 2º tempo"),
            ])}

            <Section title="Cartões e escanteios" note={st.nStats < st.j ? `${st.nStats} de ${st.j} jogos com esses dados` : undefined} />
            {st.nStats ? grid([
              tile(num(st.yellow), "Cartões amarelos por jogo"), tile(st.yellowTotal, "Amarelos no total"), tile(st.redTotal, "Cartões vermelhos"),
              tile(num(st.corners), "Escanteios a favor por jogo"), tile(num(st.cornersAg), "Escanteios contra por jogo"), tile(st.cornersTotal, "Escanteios a favor no total"),
            ]) : <Empty>Os números de cartões e escanteios desses jogos ainda estão sendo baixados. Volte em alguns minutos.</Empty>}

            {st.nStats ? <>
              <Section title="Jogo" note="média por jogo" />
              {grid([
                tile(st.poss == null ? "—" : `${num(st.poss, 0)}%`, "Posse de bola"), tile(num(st.shots), "Finalizações"), tile(num(st.onTarget), "Chutes no gol"),
                tile(num(st.shotsAg), "Finalizações sofridas"), tile(num(st.fouls), "Faltas cometidas"), tile(pct(st.passAcc), "Passes certos"),
                tile(num(st.offsides), "Impedimentos"), tile(num(st.saves), "Defesas do goleiro"),
              ])}
            </> : null}

            <Section title="Artilheiros" note={st.ownGoalsFor ? `+ ${st.ownGoalsFor} gol${st.ownGoalsFor > 1 ? "s" : ""} contra a favor` : undefined} />
            {ranking(st.scorers, (r) => r.goals, (r) => [r.pens ? `${r.pens} de pênalti` : "", r.assists ? `${r.assists} assist.` : ""].filter(Boolean).join(" · "))}

            <Section title="Assistências" />
            {ranking(st.assists, (r) => r.assists)}

            {st.best ? <><Section title="Maior vitória" /><MatchCard m={st.best} onPress={() => router.push(`/jogo/${st.best!.id}`)} /></> : null}
            {st.worst ? <><Section title="Pior derrota" /><MatchCard m={st.worst} onPress={() => router.push(`/jogo/${st.worst!.id}`)} /></> : null}

            <Text style={{ color: t.muted, fontSize: 11, marginTop: 12 }}>
              Fonte: dados oficiais das partidas (ESPN), os mesmos usados por sites de estatística como Sofascore e ogol. Artilharia conta só gols com autor registrado{st.nEvents < st.j ? ` (${st.nEvents} de ${st.j} jogos)` : ""}.
            </Text>
          </>}
        </ScrollView>}
    </View>
  );
}
