// Resumo de um jogo: placar, local, arbitragem, gols, cartões, substituições e escalações.
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Empty, Header, Loading, MatchCard, s, Section, useLoad } from "../../components/ui";
import { cityPt, getMatch, type Lineup, type Match, type MatchEvent, type Player } from "../../lib/data";
import { useTheme } from "../../lib/theme";

const GOALS: MatchEvent["type"][] = ["gol", "penalti", "contra"];

export default function Jogo() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: m, loading, error, reload } = useLoad<Match | null>(() => getMatch(Number(id)), [id], null);
  const back = () => (router.canGoBack() ? router.back() : router.replace("/jogos"));
  const close = <Pressable onPress={back} accessibilityRole="button" style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: "#000" }}>
    <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}>Voltar</Text></Pressable>;

  if (!m) return <View style={{ flex: 1, backgroundColor: t.bg }}><Header title="Resumo do jogo" right={close} />
    {loading ? <Loading /> : <Loading error={error ?? "Jogo não encontrado"} onRetry={reload} />}</View>;

  const d = m.details;
  const team = (side: "home" | "away") => (side === "home" ? m.home_team : m.away_team);
  const ev = d?.events ?? [];
  const goals = ev.filter((e) => GOALS.includes(e.type));
  const cards = ev.filter((e) => e.type === "amarelo" || e.type === "vermelho");
  const subs = ev.filter((e) => e.type === "sub");
  const info = (label: string, value: string | null | undefined) => value ? (
    <View style={[s.row, { justifyContent: "space-between", gap: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: t.line }]}>
      <Text style={{ color: t.muted, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: t.fg, fontSize: 14, fontWeight: "600", flexShrink: 1, textAlign: "right" }}>{value}</Text>
    </View>) : null;
  const card = (children: React.ReactNode) => <View style={[s.card, { backgroundColor: t.surface, borderColor: t.line, padding: 12 }]}>{children}</View>;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title="Resumo do jogo" subtitle={`${m.competition}${m.round ? ` · ${m.round}` : ""}`} right={close} />
      <ScrollView contentContainerStyle={[s.wrap, { gap: 10, paddingVertical: 14, paddingBottom: 40 }]}>
        <MatchCard m={m} />

        {card(<>
          <Text style={[s.h3, { color: t.fg, marginBottom: 4 }]}>Ficha do jogo</Text>
          {info("Estádio", m.venue)}{info("Cidade", cityPt(m.city))}{info("Árbitro", m.referee ?? "Não informado")}
          {info("Público", d?.attendance ? d.attendance.toLocaleString("pt-BR") + " pessoas" : null)}
        </>)}

        {!d ? <Empty>O resumo deste jogo ainda está sendo preparado. Volte em alguns minutos.</Empty> : <>
          <Section title="Gols" />
          {card(goals.length ? goals.map((g, i) => <EventRow key={i} e={g} team={team(g.side)} />) : <Text style={{ color: t.muted }}>Sem gols.</Text>)}

          {cards.length ? <><Section title="Cartões" />{card(cards.map((c, i) => <EventRow key={i} e={c} team={team(c.side)} />))}</> : null}

          {subs.length ? <><Section title="Substituições" />{card(subs.map((c, i) => <EventRow key={i} e={c} team={team(c.side)} />))}</> : null}

          <Section title="Escalações" />
          <LineupCard l={d.lineups.home} name={m.home_team} />
          <LineupCard l={d.lineups.away} name={m.away_team} />
        </>}
        <Text style={{ color: t.muted, fontSize: 11, marginTop: 8 }}>Dados: ESPN e football-data.org.</Text>
      </ScrollView>
    </View>
  );
}

function Badge({ text, dark }: { text: string; dark?: boolean }) {
  const t = useTheme();
  return <Text style={{ fontSize: 10, fontWeight: "800", paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3, overflow: "hidden",
    backgroundColor: dark ? "#000" : t.chip, color: dark ? "#fff" : t.fg, borderWidth: 1, borderColor: dark ? "#000" : t.line }}>{text}</Text>;
}

function EventRow({ e, team }: { e: MatchEvent; team: string }) {
  const t = useTheme();
  const icon = { gol: "⚽", penalti: "⚽", contra: "⚽", penalti_perdido: "✕", amarelo: "", vermelho: "", sub: "⇄" }[e.type];
  const extra = e.type === "gol" && e.other ? `assistência: ${e.other}` : e.type === "penalti" ? "de pênalti" : e.type === "contra" ? "gol contra"
    : e.type === "sub" ? `saiu ${e.other ?? "?"}` : null;
  return (
    <View style={[s.row, { gap: 10, paddingVertical: 7 }]}>
      <Text style={{ width: 52, color: t.blue, fontWeight: "800", fontVariant: ["tabular-nums"] }}>{e.min}</Text>
      {e.type === "amarelo" ? <Badge text="CA" /> : e.type === "vermelho" ? <Badge text="CV" dark /> : <Text style={{ width: 22, textAlign: "center", color: t.fg }}>{icon}</Text>}
      <View style={{ flex: 1 }}>
        <Text style={{ color: t.fg, fontWeight: "600" }}>{e.type === "sub" ? `Entrou ${e.player}` : e.player}</Text>
        <Text style={{ color: t.muted, fontSize: 12 }}>{team}{extra ? ` · ${extra}` : ""}</Text>
      </View>
    </View>
  );
}

function PlayerRow({ p }: { p: Player }) {
  const t = useTheme();
  return (
    <View style={[s.row, { gap: 8, paddingVertical: 5 }]}>
      <Text style={{ width: 24, textAlign: "right", color: t.muted, fontVariant: ["tabular-nums"] }}>{p.n ?? ""}</Text>
      <Text style={{ width: 32, color: t.muted, fontSize: 11, fontWeight: "700" }}>{p.pos === "SUB" ? "" : p.pos}</Text>
      <Text style={{ flex: 1, color: t.fg }} numberOfLines={1}>{p.name}</Text>
      {p.goals ? <Text style={{ color: t.fg }}>{"⚽".repeat(p.goals)}</Text> : null}
      {p.card === "amarelo" ? <Badge text="CA" /> : p.card === "vermelho" ? <Badge text="CV" dark /> : null}
      {p.out ? <Text style={{ color: t.muted, fontSize: 12 }}>⇣ {p.out}</Text> : null}
      {p.in ? <Text style={{ color: t.blue, fontSize: 12, fontWeight: "700" }}>⇡ {p.in}</Text> : null}
    </View>
  );
}

function LineupCard({ l, name }: { l: Lineup | null; name: string }) {
  const t = useTheme();
  if (!l) return <Empty>Escalação de {name} não disponível.</Empty>;
  const used = l.bench.filter((p) => p.in), unused = l.bench.filter((p) => !p.in);
  return (
    <View style={[s.card, { backgroundColor: t.surface, borderColor: t.line, padding: 12 }]}>
      <View style={[s.row, { justifyContent: "space-between", marginBottom: 6 }]}>
        <Text style={[s.h3, { color: t.fg }]}>{name}</Text>
        {l.formation ? <Text style={{ color: t.blue, fontWeight: "700" }}>{l.formation}</Text> : null}
      </View>
      {l.starters.map((p, i) => <PlayerRow key={i} p={p} />)}
      {used.length ? <><Text style={{ color: t.muted, fontSize: 12, marginTop: 8, marginBottom: 2, textTransform: "uppercase", letterSpacing: 1 }}>Entraram</Text>
        {used.map((p, i) => <PlayerRow key={i} p={p} />)}</> : null}
      {unused.length ? <Text style={{ color: t.muted, fontSize: 12, marginTop: 8 }}>No banco: {unused.map((p) => p.name).join(", ")}</Text> : null}
    </View>
  );
}
