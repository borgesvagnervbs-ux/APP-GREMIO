// Primeiro acesso: escolher 5 dos 20 sites e 5 dos 20 canais.
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, DISPLAY, Loading, s } from "../components/ui";
import { prefsReady, useSession } from "../lib/session";
import { useSources } from "../lib/sources";
import { useTheme } from "../lib/theme";

const MAX = 5;

function subs(n: number | null) {
  if (!n) return null;
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace(".", ",")} mi inscritos` : `${Math.round(n / 1000)} mil inscritos`;
}

export default function Escolher() {
  const t = useTheme(); const ins = useSafeAreaInsets();
  const { prefs, savePrefs } = useSession();
  const { sources, error, retry } = useSources();
  const [step, setStep] = useState<1 | 2>(1);
  const [sites, setSites] = useState<string[]>(prefs?.sites ?? []);
  const [channels, setChannels] = useState<string[]>(prefs?.channels ?? []);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isSites = step === 1;
  const list = sources.filter((x) => x.kind === (isSites ? "site" : "canal")).sort((a, b) => a.rank - b.rank).slice(0, 20);
  const chosen = isSites ? sites : channels;
  const setChosen = isSites ? setSites : setChannels;
  const full = chosen.length >= MAX;

  function toggle(id: string) {
    setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length < MAX ? [...c, id] : c));
  }
  async function next() {
    if (isSites) return setStep(2);
    setSaving(true); setErr(null);
    try { await savePrefs({ sites, channels }); router.replace("/inicio"); }
    catch (e) { setErr("Não foi possível salvar: " + (e as Error).message); }
    finally { setSaving(false); }
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ backgroundColor: t.head, paddingTop: ins.top + 18, paddingBottom: 18 }}>
        <View style={[s.wrap, { gap: 6 }]}>
          <View style={[s.row, { gap: 6, marginBottom: 8 }]}>
            <View style={[st.step, { backgroundColor: "#fff" }]} /><View style={[st.step, { backgroundColor: isSites ? "#24384e" : "#fff" }]} />
          </View>
          <Text style={[st.title]}>{isSites ? "Escolha 5 sites" : "Escolha 5 canais"}</Text>
          <Text style={{ color: "#b9c7d6", fontSize: 14 }}>
            {isSites ? "Os 20 sites que mais falam do Grêmio. Você vai ver as notícias dos 5 que escolher."
              : "Os 20 canais do YouTube mais seguidos sobre o Grêmio. Você vai ver os vídeos e as lives dos 5 que escolher."}
          </Text>
        </View>
      </View>

      {!list.length ? <Loading error={error} onRetry={retry} /> :
        <ScrollView contentContainerStyle={{ paddingVertical: 16, paddingBottom: 110 }}>
          <View style={[s.wrap, st.grid]}>
            {list.map((src, i) => {
              const on = chosen.includes(src.id);
              const off = full && !on;
              const extra = !isSites ? subs(src.yt_subscribers) : null;
              return (
                <Pressable key={src.id} onPress={() => toggle(src.id)} disabled={off} accessibilityRole="checkbox" accessibilityState={{ checked: on, disabled: off }}
                  style={[st.pick, { backgroundColor: t.surface, borderColor: on ? t.blue : t.line, opacity: off ? 0.45 : 1 }]}>
                  <Text style={[st.rank, { color: t.muted }]}>{i + 1}º</Text>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: t.fg, fontWeight: "600", fontSize: 14 }}>{src.name}</Text>
                    <Text style={{ color: t.muted, fontSize: 11 }}>{extra ?? (isSites ? "site" : "canal")}</Text>
                  </View>
                  <View style={[st.check, { borderColor: on ? t.blue : t.line, backgroundColor: on ? t.blue : "transparent" }]}>
                    {on ? <Text style={{ color: t.blueInk, fontSize: 12, fontWeight: "700" }}>✓</Text> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>}

      <View style={[st.foot, { backgroundColor: t.surface, borderTopColor: t.line, paddingBottom: ins.bottom + 12 }]}>
        {err ? <Text style={[s.wrap, { color: t.fg, marginBottom: 8 }]}>{err}</Text> : null}
        <View style={[s.wrap, s.row, { gap: 12 }]}>
          {(!isSites || prefsReady(prefs)) ? <View style={{ width: 96 }}><Button label="Voltar" ghost onPress={() => (isSites ? router.replace("/inicio") : setStep(1))} /></View> : null}
          <Text style={[st.count, { color: t.fg }]}>{chosen.length}/{MAX}</Text>
          <View style={{ flex: 1 }}><Button label={saving ? "Salvando..." : isSites ? "Continuar" : "Começar"} onPress={next} disabled={chosen.length !== MAX || saving} /></View>
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  step: { flex: 1, height: 4, borderRadius: 2 },
  title: { fontFamily: DISPLAY, color: "#fff", fontSize: 32, fontWeight: "800", textTransform: "uppercase" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pick: { flexBasis: "48%", flexGrow: 1, flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 12, borderWidth: 1.5 },
  rank: { fontFamily: DISPLAY, fontWeight: "700", fontSize: 16, width: 26 },
  check: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  foot: { position: "absolute", left: 0, right: 0, bottom: 0, borderTopWidth: 1, paddingTop: 12 },
  count: { fontFamily: DISPLAY, fontWeight: "700", fontSize: 20 },
});
