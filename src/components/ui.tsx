import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ago, cityPt, dateTime, notePt, duration, FINISHED, LIVE_MATCH, until, views, type Item, type Match, type Source, type Standing } from "../lib/data";
import { BRAND, CREST_URL, SHADES, useTheme, type Theme } from "../lib/theme";

export const DISPLAY = Platform.select({ web: "'Barlow Condensed','Arial Narrow',system-ui,sans-serif", default: undefined });

export function openLink(url: string) {
  if (!/^https:\/\//.test(url)) return;
  if (Platform.OS === "web") window.open(url, "_blank", "noopener");
  else WebBrowser.openBrowserAsync(url);
}

/** Carrega dados, recarrega ao puxar a tela e sozinho a cada 5 minutos. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[], initial: T) {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fnRef = useRef(fn); fnRef.current = fn;
  const load = useCallback(async (pull = false) => {
    if (pull) setRefreshing(true); else setLoading(true);
    try { setData(await fnRef.current()); setError(null); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); const t = setInterval(() => load(true), 5 * 60_000); return () => clearInterval(t); }, deps);
  return { data, loading, refreshing, error, reload: () => load(true) };
}

// ---------- cabeçalho tricolor ----------
/** Faixa com as três cores, lado a lado: azul, branco e preto. */
export function StripeBand({ height = 8 }: { height?: number }) {
  return <View style={{ flexDirection: "row", height }}>{[BRAND.blue, BRAND.white, BRAND.black].map((c) => <View key={c} style={{ flex: 1, backgroundColor: c }} />)}</View>;
}

export function Crest({ size = 40 }: { size?: number }) {
  return <Image source={{ uri: CREST_URL }} style={{ width: size, height: size }} contentFit="contain" accessibilityLabel="Escudo do Grêmio" />;
}

/** Cabeçalho em três faixas, nesta ordem: azul (escudo e título), branco (descrição) e preto (abas). */
export function Header({ title, subtitle, right, children }: { title: string; subtitle?: string; right?: ReactNode; children?: ReactNode }) {
  const t = useTheme(); const ins = useSafeAreaInsets();
  return (
    <View>
      <View style={{ backgroundColor: BRAND.blue, paddingTop: ins.top + 10, paddingBottom: 12 }}>
        <View style={[s.wrap, s.row, { justifyContent: "space-between" }]}>
          <View style={[s.row, { flexShrink: 1, gap: 10 }]}>
            <View style={s.crestBox}><Crest size={34} /></View>
            <Text style={[s.h1, { color: "#fff", flexShrink: 1 }]} numberOfLines={1}>{title}</Text>
          </View>
          {right}
        </View>
      </View>
      <View style={{ backgroundColor: BRAND.white, paddingVertical: 8, minHeight: 12 }}>
        {subtitle ? <Text style={[s.wrap, { color: "#0d1622", fontSize: 13, fontWeight: "500" }]}>{subtitle}</Text> : null}
      </View>
      <View style={{ backgroundColor: BRAND.black, paddingTop: children ? 10 : 0, minHeight: 18 }}>{children}</View>
      <View style={{ height: 1, backgroundColor: t.line }} />
    </View>
  );
}

export function Chips<T extends string>({ options, value, onChange }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s.wrapH, { gap: 8, paddingBottom: 12 }]}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable key={o.id} onPress={() => onChange(o.id)} accessibilityRole="button" accessibilityState={{ selected: on }}
            style={[s.chip, { borderColor: on ? BRAND.blue : "rgba(255,255,255,0.5)", backgroundColor: on ? BRAND.blue : "transparent" }]}>
            <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: on ? "600" : "400" }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function Section({ title, note }: { title: string; note?: string }) {
  const t = useTheme();
  return (
    <View style={[s.row, { justifyContent: "space-between", alignItems: "baseline", marginTop: 22, marginBottom: 10 }]}>
      <Text style={[s.h2, { color: t.fg }]}>{title}</Text>
      {note ? <Text style={{ color: t.muted, fontSize: 12 }}>{note}</Text> : null}
    </View>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  const t = useTheme();
  return <View style={[s.card, { backgroundColor: t.surface, borderColor: t.line, padding: 22, alignItems: "center" }]}>
    <Text style={{ color: t.muted, textAlign: "center" }}>{children}</Text></View>;
}

export function Loading({ error, onRetry }: { error?: string | null; onRetry?: () => void }) {
  const t = useTheme();
  if (error) return <View style={{ padding: 24, gap: 10, alignItems: "center" }}>
    <Text style={{ color: t.fg, textAlign: "center" }}>Não foi possível carregar agora. Verifique sua internet.</Text>
    {onRetry ? <Button label="Tentar de novo" onPress={onRetry} /> : null}</View>;
  return <View style={{ padding: 40 }}><ActivityIndicator color={t.blue} /></View>;
}

export function Button({ label, onPress, ghost, disabled, dark }: { label: string; onPress: () => void; ghost?: boolean; disabled?: boolean; dark?: boolean }) {
  const t = useTheme();
  const bg = ghost ? (dark ? "rgba(0,0,0,0.25)" : "transparent") : dark ? "#000" : t.blue;
  const fg = ghost ? (dark ? "#fff" : t.fg) : dark ? "#fff" : t.blueInk;
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button"
      style={({ pressed }) => [s.btn, { backgroundColor: bg, borderColor: ghost ? (dark ? "rgba(255,255,255,0.6)" : t.line) : bg, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 }]}>
      <Text style={{ color: fg, fontWeight: "600", fontSize: 15 }}>{label}</Text>
    </Pressable>
  );
}

// ---------- miniatura ----------
function Thumb({ item, src, wide }: { item: Item; src?: Source; wide?: boolean }) {
  const shade = SHADES[((src?.rank ?? 1) - 1) % SHADES.length];
  return (
    <View style={[s.thumb, { aspectRatio: wide ? 16 / 11 : 1, backgroundColor: shade }]}>
      {item.image_url ? <Image source={{ uri: item.image_url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} /> :
        <Text numberOfLines={2} style={s.thumbLabel}>{src?.name ?? ""}</Text>}
      {wide && item.kind === "video" ? <View style={s.play}><View style={s.playTri} /></View> : null}
      {item.duration_s ? <Text style={s.dur}>{duration(item.duration_s)}</Text> : null}
    </View>
  );
}

export function ItemCard({ item, src }: { item: Item; src?: Source }) {
  const t = useTheme();
  const isVideo = item.kind !== "noticia";
  return (
    <Pressable onPress={() => openLink(item.url)} accessibilityRole="link"
      style={({ pressed }) => [s.card, s.item, { backgroundColor: t.surface, borderColor: t.line, opacity: pressed ? 0.85 : 1 }]}>
      <View style={{ width: isVideo ? 128 : 92 }}><Thumb item={item} src={src} wide={isVideo} /></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={[s.row, { gap: 6, flexWrap: "wrap" }]}>
          <Text style={{ color: t.blue, fontWeight: "600", fontSize: 12 }}>{src?.name ?? item.source_id}</Text>
          <Text style={{ color: t.muted, fontSize: 12 }}>· {ago(item.published_at)}</Text>
          {isVideo && item.views ? <Text style={{ color: t.muted, fontSize: 12 }}>· {views(item.views)}</Text> : null}
        </View>
        <Text numberOfLines={3} style={{ color: t.fg, fontWeight: "600", fontSize: 15, lineHeight: 20, marginTop: 3 }}>{item.title}</Text>
      </View>
    </Pressable>
  );
}

export function LiveCard({ item, src, reminded, onToggle }: { item: Item; src?: Source; reminded: boolean; onToggle: () => void }) {
  const t = useTheme();
  const now = item.live_status === "live";
  return (
    <View style={[s.card, { backgroundColor: t.surface, borderColor: now ? t.blue : t.line, padding: 14, gap: 10 }]}>
      <View style={[s.row, { justifyContent: "space-between" }]}>
        <View style={[s.row, { gap: 8 }]}>
          <Text style={[s.tag, { backgroundColor: now ? t.blue : "#000", color: now ? t.blueInk : "#fff" }]}>{now ? "AO VIVO AGORA" : "AO VIVO EM BREVE"}</Text>
          <Text style={{ color: t.blue, fontWeight: "600", fontSize: 12 }}>{src?.name}</Text>
        </View>
        {!now && item.live_starts_at ? <Text style={[s.count, { color: t.blue }]}>{until(item.live_starts_at)}</Text> : null}
      </View>
      <Pressable onPress={() => openLink(item.url)}>
        <Text style={{ color: t.fg, fontWeight: "600", fontSize: 16 }}>{item.title}</Text>
        {item.live_starts_at && !now ? <Text style={{ color: t.muted, fontSize: 12, marginTop: 4 }}>{dateTime(item.live_starts_at)}</Text> : null}
      </Pressable>
      <View style={[s.row, { justifyContent: "space-between" }]}>
        <Pressable onPress={() => openLink(item.url)}><Text style={{ color: t.fg, textDecorationLine: "underline" }}>{now ? "Assistir no YouTube" : "Abrir no YouTube"}</Text></Pressable>
        {!now ? <Pressable onPress={onToggle} accessibilityRole="switch" accessibilityState={{ checked: reminded }}
          style={[s.toggle, { backgroundColor: reminded ? t.blue : t.chip, borderColor: reminded ? t.blue : t.line }]}>
          <Text style={{ color: reminded ? t.blueInk : t.fg, fontWeight: "600", fontSize: 13 }}>{reminded ? "✓ Lembrete salvo" : "Me avise"}</Text>
        </Pressable> : null}
      </View>
    </View>
  );
}

export function LiveBanner({ item, src, onPress }: { item: Item; src?: Source; onPress: () => void }) {
  const t = useTheme();
  const now = item.live_status === "live";
  return (
    <Pressable onPress={onPress} style={[s.card, s.row, { backgroundColor: t.blue, borderColor: t.blue, padding: 14, gap: 12, marginTop: 14 }]}>
      <View style={[s.dot, { backgroundColor: t.blueInk }]} />
      <View style={{ flex: 1 }}>
        <Text style={[s.h3, { color: t.blueInk }]}>{src?.name} {now ? "está ao vivo" : `entra ao vivo em ${until(item.live_starts_at!)}`}</Text>
        <Text numberOfLines={1} style={{ color: t.blueInk, fontSize: 13 }}>{item.title}</Text>
      </View>
      <Text style={[s.mini, { backgroundColor: "#000", color: "#fff" }]}>Ver</Text>
    </Pressable>
  );
}

function TeamCrest({ uri }: { uri: string | null }) {
  return uri ? <Image source={{ uri }} style={{ width: 28, height: 28 }} contentFit="contain" /> : <View style={{ width: 28, height: 28 }} />;
}

export function venueText(m: Match): string | null {
  return [m.venue, cityPt(m.city)].filter(Boolean).join(" · ") || null;
}

export function MatchCard({ m, highlight, onPress }: { m: Match; highlight?: boolean; onPress?: () => void }) {
  const t = useTheme();
  const done = FINISHED.includes(m.status), live = LIVE_MATCH.includes(m.status);
  const place = venueText(m);
  const body = (
    <>
      <View style={[s.row, { justifyContent: "space-between", gap: 8 }]}>
        <View style={[s.row, { flex: 1, gap: 8 }]}><TeamCrest uri={m.home_logo} /><Text numberOfLines={1} style={[s.team, { color: t.fg, flexShrink: 1 }]}>{m.home_team}</Text></View>
        <Text style={[s.score, { color: live ? t.blue : t.fg }]}>{done || live ? `${m.home_goals ?? 0} × ${m.away_goals ?? 0}` : "×"}</Text>
        <View style={[s.row, { flex: 1, gap: 8, justifyContent: "flex-end" }]}><Text numberOfLines={1} style={[s.team, { color: t.fg, flexShrink: 1, textAlign: "right" }]}>{m.away_team}</Text><TeamCrest uri={m.away_logo} /></View>
      </View>
      {m.note ? <Text style={{ color: t.fg, fontSize: 12, textAlign: "center" }}>{notePt(m.note)}</Text> : null}
      <View style={[s.row, { justifyContent: "space-between", flexWrap: "wrap", gap: 6 }]}>
        <Text style={{ color: t.muted, fontSize: 12 }}>{live ? "Em andamento · " : highlight ? "Próximo jogo · " : ""}{dateTime(m.kickoff_at)}</Text>
        <Text style={{ color: t.muted, fontSize: 12 }}>{m.competition}{m.round ? ` · ${m.round}` : ""}</Text>
      </View>
      <View style={[s.row, { gap: 6, justifyContent: "space-between" }]}>
        <Text numberOfLines={2} style={{ color: t.fg, fontSize: 12, flexShrink: 1 }}>📍 {place ?? "Local a confirmar"}</Text>
        {onPress ? <Text style={{ color: t.blue, fontSize: 12, fontWeight: "700", flexShrink: 0 }}>Ver resumo ›</Text> : null}
      </View>
    </>
  );
  const style = [s.card, { backgroundColor: t.surface, borderColor: highlight ? t.blue : t.line, padding: 14, gap: 8 }];
  return onPress
    ? <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Resumo de ${m.home_team} ${m.home_goals} x ${m.away_goals} ${m.away_team}`}
        style={({ pressed }) => [...style, { opacity: pressed ? 0.85 : 1 }]}>{body}</Pressable>
    : <View style={style}>{body}</View>;
}

export function StandingsTable({ rows }: { rows: Standing[] }) {
  const t = useTheme();
  const head = (txt: string, w: number, left?: boolean) => <Text style={{ width: w, color: t.muted, fontSize: 11, fontWeight: "600", textAlign: left ? "left" : "center" }}>{txt}</Text>;
  const cell = (txt: string | number, w: number, bold?: boolean, color?: string) => <Text style={{ width: w, textAlign: "center", color: color ?? t.fg, fontWeight: bold ? "700" : "400", fontVariant: ["tabular-nums"] }}>{txt}</Text>;
  return (
    <View style={[s.card, { backgroundColor: t.surface, borderColor: t.line, paddingVertical: 6 }]}>
      <View style={[s.row, s.trow, { borderLeftWidth: 4, borderLeftColor: "transparent" }]}>{head("#", 26)}<View style={{ flex: 1 }}>{head("Time", 100, true)}</View>{head("P", 34)}{head("J", 28)}{head("V", 28)}{head("SG", 34)}</View>
      {rows.map((r) => (
        <View key={r.position} style={[s.row, s.trow, r.is_gremio && { backgroundColor: t.chip }, { borderTopColor: t.line, borderTopWidth: StyleSheet.hairlineWidth, borderLeftWidth: 4, borderLeftColor: r.position <= 6 ? t.blue : r.position > rows.length - 4 ? t.fg : "transparent" }]}>
          {cell(r.position, 26, true, r.is_gremio ? t.blue : undefined)}
          <View style={[s.row, { flex: 1, gap: 8, minWidth: 0 }]}><TeamCrest uri={r.crest} />
            <Text numberOfLines={1} style={{ color: r.is_gremio ? t.blue : t.fg, fontWeight: r.is_gremio ? "700" : "400", flexShrink: 1 }}>{r.team}</Text></View>
          {cell(r.points, 34, true)}{cell(r.played, 28)}{cell(r.won, 28)}{cell(r.goal_diff > 0 ? `+${r.goal_diff}` : r.goal_diff, 34)}
        </View>
      ))}
      <View style={[s.row, { gap: 14, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4, flexWrap: "wrap" }]}>
        <View style={[s.row, { gap: 6 }]}><View style={{ width: 10, height: 10, backgroundColor: t.blue }} /><Text style={{ color: t.muted, fontSize: 11 }}>Libertadores (1º ao 6º)</Text></View>
        <View style={[s.row, { gap: 6 }]}><View style={{ width: 10, height: 10, backgroundColor: t.fg }} /><Text style={{ color: t.muted, fontSize: 11 }}>Rebaixamento (4 últimos)</Text></View>
        <Text style={{ color: t.muted, fontSize: 11 }}>P pontos · J jogos · V vitórias · SG saldo</Text>
      </View>
    </View>
  );
}

export const s = StyleSheet.create({
  wrap: { width: "100%", maxWidth: 600, alignSelf: "center", paddingHorizontal: 16 },
  wrapH: { paddingHorizontal: 16 },
  row: { flexDirection: "row", alignItems: "center" },
  h1: { fontFamily: DISPLAY, fontSize: 26, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  h2: { fontFamily: DISPLAY, fontSize: 21, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 },
  h3: { fontFamily: DISPLAY, fontSize: 17, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  card: { borderRadius: 12, borderWidth: 1 },
  item: { flexDirection: "row", gap: 12, padding: 10 },
  thumb: { width: "100%", borderRadius: 8, overflow: "hidden", justifyContent: "flex-end", padding: 6 },
  thumbLabel: { color: "#fff", fontFamily: DISPLAY, fontWeight: "700", fontSize: 13, textTransform: "uppercase" },
  play: { position: "absolute", top: "50%", left: "50%", marginTop: -15, marginLeft: -15, width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" },
  playTri: { marginLeft: 3, width: 0, height: 0, borderLeftWidth: 10, borderLeftColor: "#fff", borderTopWidth: 6, borderTopColor: "transparent", borderBottomWidth: 6, borderBottomColor: "transparent" },
  dur: { position: "absolute", right: 4, bottom: 4, backgroundColor: "rgba(0,0,0,0.75)", color: "#fff", fontSize: 11, paddingHorizontal: 4, borderRadius: 3 },
  tag: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: "hidden" },
  count: { fontFamily: DISPLAY, fontSize: 24, fontWeight: "700" },
  toggle: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  btn: { borderRadius: 10, borderWidth: 1, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  dot: { width: 10, height: 10, borderRadius: 5 },
  mini: { fontWeight: "700", fontSize: 13, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, overflow: "hidden" },
  team: { fontFamily: DISPLAY, fontSize: 17, fontWeight: "700", textTransform: "uppercase" },
  score: { fontFamily: DISPLAY, fontSize: 24, fontWeight: "800", minWidth: 64, textAlign: "center", fontVariant: ["tabular-nums"] },
  crestBox: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  trow: { paddingHorizontal: 8, paddingVertical: 7 },
});

export type { Theme };
