// Tela do vídeo: toca o vídeo do YouTube dentro do app.
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { YouTubePlayer } from "../../components/player";
import { Header, openLink, s, useLoad } from "../../components/ui";
import { ago, getItem, views, type Item } from "../../lib/data";
import { useSources } from "../../lib/sources";
import { useTheme } from "../../lib/theme";


export default function Video() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { byId } = useSources();
  const { data: item } = useLoad<Item | null>(() => getItem(`v_${id}`), [id], null);
  const back = () => (router.canGoBack() ? router.back() : router.replace("/videos"));
  const close = <Pressable onPress={back} accessibilityRole="button" style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: "#fff" }}>
    <Text style={{ color: "#000", fontSize: 15, fontWeight: "600" }}>Voltar</Text></Pressable>;
  const src = item ? byId[item.source_id] : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title="Vídeo" subtitle={src?.name ?? "YouTube"} right={close} />
      <ScrollView contentContainerStyle={[s.wrap, { gap: 12, paddingVertical: 14, paddingBottom: 40 }]}>
        <YouTubePlayer id={String(id)} />
        {item ? <View style={{ gap: 4 }}>
          <Text style={{ color: t.fg, fontWeight: "700", fontSize: 17, lineHeight: 22 }}>{item.title}</Text>
          <Text style={{ color: t.muted, fontSize: 13 }}>{[src?.name, ago(item.published_at), item.views ? views(item.views) : null].filter(Boolean).join(" · ")}</Text>
        </View> : null}
        <Pressable onPress={() => openLink(`https://www.youtube.com/watch?v=${id}`)} style={{ paddingVertical: 8 }}>
          <Text style={{ color: t.muted, fontSize: 12 }}>O vídeo não carregou? Alguns canais só deixam assistir no YouTube. <Text style={{ color: t.blue, fontWeight: "600" }}>Abrir no YouTube</Text></Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
