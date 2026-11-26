import { Image } from "expo-image";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Image as RNImage, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ago, cityPt, dateTime, notePt, duration, compLogo, localCrest, sourceIcon, ytId, FINISHED, LIVE_MATCH, until, views, type Item, type Match, type Source, type Standing, type Where } from "../lib/data";
import { BRAND, CREST_URL, SHADES, useTheme, type Theme } from "../lib/theme";

export const DISPLAY = Platform.select({ web: "'Barlow Condensed','Arial Narrow',system-ui,sans-serif", default: undefined });

export function openLink(url: string) {
  if (!/^https:\/\//.test(url)) return;
  if (Platform.OS === "web") window.open(url, "_blank", "noopener");
  else WebBrowser.openBrowserAsync(url);
}

/** Vídeos e lives tocam dentro do app; notícias abrem no site. */
export function openItem(item: Item) {
  const id = item.kind !== "noticia" ? ytId(item) : null;
  if (id) router.push(`/video/${id}`); else openLink(item.url);
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

/** Cabeçalho em três colunas verticais, nesta ordem: azul (escudo e título), branco (descrição) e preto (botão da conta).
 *  O que vier em `children` (abas) fica logo abaixo, no fundo claro. */
export function Header({ title, subtitle, right, children }: { title: string; subtitle?: string; right?: ReactNode; children?: ReactNode }) {
  const t = useTheme(); const ins = useSafeAreaInsets();
  return (
    <View>
      <View style={[s.row, { alignItems: "stretch", minHeight: ins.top + 96 }]}>
        <View style={[s.col, { backgroundColor: BRAND.blue, paddingTop: ins.top + 10 }]}>
          <View style={[s.crestBox, { width: 40, height: 40, borderRadius: 20 }]}><Crest size={30} /></View>
          <Text style={[s.h3, { color: "#fff", textAlign: "center", fontSize: 16, lineHeight: 18 }]} numberOfLines={2}>{title}</Text>
        </View>
        <View style={[s.col, { backgroundColor: BRAND.white, paddingTop: ins.top + 10 }]}>
          {subtitle ? <Text style={{ color: "#0d1622", fontSize: 12, lineHeight: 15, fontWeight: "600", textAlign: "center" }} numberOfLines={4}>{subtitle}</Text> : null}
        </View>
        <View style={[s.col, { backgroundColor: BRAND.black, paddingTop: ins.top + 10 }]}>{right}</View>
      </View>
      <View style={{ height: 1, backgroundColor: t.line }} />
      {children ? <View style={{ backgroundColor: t.bg, paddingTop: 12 }}>{children}</View> : null}
    </View>
  );
}

export function Chips<T extends string>({ options, value, onChange, padded = true }: { options: { id: T; label: string; icon?: number | null }[]; value: T; onChange: (v: T) => void; padded?: boolean }) {
  const t = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[padded ? s.wrapH : null, { gap: 8, paddingBottom: padded ? 4 : 0 }]}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable key={o.id} onPress={() => onChange(o.id)} accessibilityRole="button" accessibilityState={{ selected: on }}
            style={[s.chip, s.row, { gap: 6, borderColor: on ? t.blue : t.line, backgroundColor: on ? t.blue : t.surface, paddingVertical: o.icon ? 4 : 7 }]}>
            {o.icon ? <View style={s.logoBox}><RNImage source={o.icon} style={{ width: 20, height: 20 }} resizeMode="contain" /></View> : null}
            <Text style={{ color: on ? t.blueInk : t.fg, fontSize: 13, fontWeight: on ? "700" : "500" }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Campeonatos com logo. */
export function CompChips({ comps, comp, onComp }: { comps: string[]; comp: string; onComp: (c: string) => void }) {
  return <Chips<string> padded={false} value={comp} onChange={onComp}
    options={[{ id: "todos", label: "Todos" }, ...comps.map((c) => ({ id: c, label: c, icon: compLogo(c) }))]} />;
}

/** Casa e fora / Em casa / Fora. */
export function WhereButtons({ where, onWhere }: { where: Where; onWhere: (w: Where) => void }) {
  const t = useTheme();
  return (
    <View style={[s.row, { gap: 8 }]}>
      {(["todos", "casa", "fora"] as Where[]).map((w) => {
        const on = w === where;
        return (
          <Pressable key={w} onPress={() => onWhere(w)} accessibilityRole="button" accessibilityState={{ selected: on }}
            style={[s.chip, { flex: 1, alignItems: "center", paddingVertical: 9, borderColor: on ? "#000" : t.line, backgroundColor: on ? "#000" : t.surface }]}>
            <Text style={{ color: on ? "#fff" : t.fg, fontWeight: "700" }}>{w === "todos" ? "Casa e fora" : w === "casa" ? "Em casa" : "Fora"}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Filtros dos jogos: campeonato (com logo) + todos/casa/fora. Os dois valem juntos. */
export function MatchFilters({ comps, comp, onComp, where, onWhere }: { comps: string[]; comp: string; onComp: (c: string) => void; where: Where; onWhere: (w: Where) => void }) {
  return <View style={{ gap: 8 }}><CompChips comps={comps} comp={comp} onComp={onComp} /><WhereButtons where={where} onWhere={onWhere} /></View>;
}

export function CompLogo({ name, size = 18 }: { name: string; size?: number }) {
  const logo = compLogo(name);
  return logo ? <View style={[s.logoBox, { width: size + 4, height: size + 4 }]}><RNImage source={logo} style={{ width: size, height: size }} resizeMode="contain" accessibilityLabel={name} /></View> : null;
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
        src && sourceIcon(src.id) ? <View style={{ alignItems: "center", gap: 6 }}>
          <View style={{ backgroundColor: "#fff", borderRadius: 10, padding: 6 }}><RNImage source={sourceIcon(src.id)!} style={{ width: 40, height: 40 }} resizeMode="contain" /></View>
          <Text numberOfLines={1} style={[s.thumbLabel, { fontSize: 11 }]}>{src.name}</Text>
        </View> : <Text numberOfLines={2} style={s.thumbLabel}>{src?.name ?? ""}</Text>}
      {wide && item.kind === "video" ? <View style={s.play}><View style={s.playTri} /></View> : null}
      {item.duration_s ? <Text style={s.dur}>{duration(item.duration_s)}</Text> : null}
    </View>
  );
}

export function ItemCard({ item, src }: { item: Item; src?: Source }) {
  const t = useTheme();
  const isVideo = item.kind !== "noticia";
  return (
    <Pressable onPress={() => openItem(item)} accessibilityRole="link"
      style={({ pressed }) => [s.card, s.item, { backgroundColor: t.surface, borderColor: t.line, opacity: pressed ? 0.85 : 1 }]}>
      <View style={{ width: isVideo ? 128 : 92 }}><Thumb item={item} src={src} wide={isVideo} /></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={[s.row, { gap: 6, flexWrap: "wrap" }]}>
          {sourceIcon(item.source_id) ? <RNImage source={sourceIcon(item.source_id)!} style={{ width: 16, height: 16, borderRadius: item.kind === "noticia" ? 3 : 8 }} resizeMode="contain" /> : null}
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
    <Pressable onPress={() => openItem(item)} accessibilityRole="button" accessibilityLabel={`Assistir: ${item.title}`}
      style={({ pressed }) => [s.card, { backgroundColor: t.surface, borderColor: now ? t.blue : t.line, padding: 14, gap: 10, opacity: pressed ? 0.85 : 1 }]}>
      <View style={[s.row, { justifyContent: "space-between" }]}>
        <View style={[s.row, { gap: 8 }]}>
          <Text style={[s.tag, { backgroundColor: now ? t.blue : "#000", color: now ? t.blueInk : "#fff" }]}>{now ? "AO VIVO AGORA" : "AO VIVO EM BREVE"}</Text>
          {sourceIcon(item.source_id) ? <RNImage source={sourceIcon(item.source_id)!} style={{ width: 18, height: 18, borderRadius: 9 }} resizeMode="contain" /> : null}
          <Text style={{ color: t.blue, fontWeight: "600", fontSize: 12 }}>{src?.name}</Text>
        </View>
        {!now && item.live_starts_at ? <Text style={[s.count, { color: t.blue }]}>{until(item.live_starts_at)}</Text> : null}
      </View>
      <View style={[s.row, { gap: 12 }]}>
        {item.image_url ? <View style={{ width: 112 }}><Thumb item={item} src={src} wide /></View> : null}
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.fg, fontWeight: "600", fontSize: 16 }}>{item.title}</Text>
          {item.live_starts_at && !now ? <Text style={{ color: t.muted, fontSize: 12, marginTop: 4 }}>{dateTime(item.live_starts_at)}</Text> : null}
        </View>
      </View>
      {!now ? <View style={[s.row, { justifyContent: "flex-end" }]}>
        <Pressable onPress={onToggle} accessibilityRole="switch" accessibilityState={{ checked: reminded }}
          style={[s.toggle, { backgroundColor: reminded ? t.blue : t.chip, borderColor: reminded ? t.blue : t.line }]}>
          <Text style={{ color: reminded ? t.blueInk : t.fg, fontWeight: "600", fontSize: 13 }}>{reminded ? "✓ Lembrete salvo" : "Me avise"}</Text>
        </Pressable>
      </View> : null}
    </Pressable>
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

function TeamCrest({ uri, team }: { uri: string | null; team?: string }) {
  const local = team ? localCrest(team) : null;
  if (local) return <RNImage source={local} style={{ width: 28, height: 28 }} resizeMode="contain" />;
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
        <View style={[s.row, { flex: 1, gap: 8 }]}><TeamCrest uri={m.home_logo} team={m.home_team} /><Text numberOfLines={1} style={[s.team, { color: t.fg, flexShrink: 1 }]}>{m.home_team}</Text></View>
        <Text style={[s.score, { color: live ? t.blue : t.fg }]}>{done || live ? `${m.home_goals ?? 0} × ${m.away_goals ?? 0}` : "×"}</Text>
        <View style={[s.row, { flex: 1, gap: 8, justifyContent: "flex-end" }]}><Text numberOfLines={1} style={[s.team, { color: t.fg, flexShrink: 1, textAlign: "right" }]}>{m.away_team}</Text><TeamCrest uri={m.away_logo} team={m.away_team} /></View>
      </View>
      {m.note ? <Text style={{ color: t.fg, fontSize: 12, textAlign: "center" }}>{notePt(m.note)}</Text> : null}
      <View style={[s.row, { justifyContent: "space-between", flexWrap: "wrap", gap: 6 }]}>
        <Text style={{ color: t.muted, fontSize: 12 }}>{live ? "Em andamento · " : highlight ? "Próximo jogo · " : ""}{dateTime(m.kickoff_at)}</Text>
        <View style={[s.row, { gap: 5, flexShrink: 1 }]}><CompLogo name={m.competition} size={14} /><Text style={{ color: t.muted, fontSize: 12, flexShrink: 1 }}>{m.competition}{m.round ? ` · ${m.round}` : ""}</Text></View>
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

export function StandingsTable({ rows, zones = true }: { rows: Standing[]; zones?: boolean }) {
  const t = useTheme();
  const head = (txt: string, w: number, left?: boolean) => <Text style={{ width: w, color: t.muted, fontSize: 11, fontWeight: "600", textAlign: left ? "left" : "center" }}>{txt}</Text>;
  const cell = (txt: string | number, w: number, bold?: boolean, color?: string) => <Text style={{ width: w, textAlign: "center", color: color ?? t.fg, fontWeight: bold ? "700" : "400", fontVariant: ["tabular-nums"] }}>{txt}</Text>;
  return (
    <View style={[s.card, { backgroundColor: t.surface, borderColor: t.line, paddingVertical: 6 }]}>
      <View style={[s.row, s.trow, { borderLeftWidth: 4, borderLeftColor: "transparent" }]}>{head("#", 26)}<View style={{ flex: 1 }}>{head("Time", 100, true)}</View>{head("P", 34)}{head("J", 28)}{head("V", 28)}{head("SG", 34)}</View>
      {rows.map((r) => (
        <View key={r.position} style={[s.row, s.trow, r.is_gremio && { backgroundColor: t.chip }, { borderTopColor: t.line, borderTopWidth: StyleSheet.hairlineWidth, borderLeftWidth: 4, borderLeftColor: !zones ? "transparent" : r.position <= 6 ? t.blue : r.position > rows.length - 4 ? t.fg : "transparent" }]}>
          {cell(r.position, 26, true, r.is_gremio ? t.blue : undefined)}
          <View style={[s.row, { flex: 1, gap: 8, minWidth: 0 }]}><TeamCrest uri={r.crest} team={r.team} />
            <Text numberOfLines={1} style={{ color: r.is_gremio ? t.blue : t.fg, fontWeight: r.is_gremio ? "700" : "400", flexShrink: 1 }}>{r.team}</Text></View>
          {cell(r.points, 34, true)}{cell(r.played, 28)}{cell(r.won, 28)}{cell(r.goal_diff > 0 ? `+${r.goal_diff}` : r.goal_diff, 34)}
        </View>
      ))}
      <View style={[s.row, { gap: 14, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4, flexWrap: "wrap" }]}>
        {zones ? <>
          <View style={[s.row, { gap: 6 }]}><View style={{ width: 10, height: 10, backgroundColor: t.blue }} /><Text style={{ color: t.muted, fontSize: 11 }}>Libertadores (1º ao 6º)</Text></View>
          <View style={[s.row, { gap: 6 }]}><View style={{ width: 10, height: 10, backgroundColor: t.fg }} /><Text style={{ color: t.muted, fontSize: 11 }}>Rebaixamento (4 últimos)</Text></View>
        </> : null}
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
  col: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 8, paddingBottom: 10 },
  logoBox: { width: 24, height: 24, borderRadius: 5, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  trow: { paddingHorizontal: 8, paddingVertical: 7 },
});

export type { Theme };
