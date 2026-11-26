import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, s } from "../components/ui";
import { useSession } from "../lib/session";
import { useSources } from "../lib/sources";
import { useTheme } from "../lib/theme";

export default function Conta() {
  const t = useTheme(); const ins = useSafeAreaInsets();
  const { name, mode, session, prefs, signOut } = useSession();
  const { byId } = useSources();
  const names = (ids: string[] = []) => ids.map((id) => byId[id]?.name ?? id).join(", ");
  const back = () => (router.canGoBack() ? router.back() : router.replace("/inicio"));

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ backgroundColor: t.head, paddingTop: ins.top + 10, paddingBottom: 16 }}>
        <View style={[s.wrap, s.row, { justifyContent: "space-between" }]}>
          <Text style={[s.h1, { color: t.headFg }]}>Minha conta</Text>
          <Pressable onPress={back} accessibilityRole="button" style={{ padding: 6 }}><Text style={{ color: t.headFg, fontSize: 15 }}>Fechar</Text></Pressable>
        </View>
      </View>
      <ScrollView contentContainerStyle={[s.wrap, { gap: 14, paddingVertical: 18 }]}>
        <View style={[s.card, { backgroundColor: t.surface, borderColor: t.line, padding: 14, gap: 4 }]}>
          <Text style={[s.h3, { color: t.fg }]}>{name}</Text>
          <Text style={{ color: t.muted }}>{mode === "user" ? session?.user.email : "Visitante (sem cadastro)"}</Text>
        </View>
        <View style={[s.card, { backgroundColor: t.surface, borderColor: t.line, padding: 14, gap: 8 }]}>
          <Text style={{ color: t.muted, fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>Seus sites</Text>
          <Text style={{ color: t.fg }}>{names(prefs?.sites)}</Text>
          <Text style={{ color: t.muted, fontSize: 12, textTransform: "uppercase", letterSpacing: 1, marginTop: 6 }}>Seus canais</Text>
          <Text style={{ color: t.fg }}>{names(prefs?.channels)}</Text>
        </View>
        <Button label="Trocar sites e canais" onPress={() => router.push("/escolher")} />
        <Button label="Sair" ghost onPress={async () => { await signOut(); router.replace("/login"); }} />
        <Text style={{ color: t.muted, fontSize: 12 }}>App de torcedor, sem vínculo oficial com o Grêmio. Notícias e vídeos abrem no site ou no YouTube de quem publicou.</Text>
      </ScrollView>
    </View>
  );
}
