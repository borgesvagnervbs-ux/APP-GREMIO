// Player do YouTube dentro do app: no navegador usa o "iframe" oficial do YouTube;
// no celular (app instalado) usa uma WebView com o mesmo player. O vídeo não é baixado: só é exibido.
import { Platform, View } from "react-native";
import { WebView } from "react-native-webview";

export const embedUrl = (id: string) => `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&playsinline=1&rel=0&modestbranding=1`;

export function YouTubePlayer({ id }: { id: string }) {
  return (
    <View style={{ width: "100%", aspectRatio: 16 / 9, backgroundColor: "#000", borderRadius: 12, overflow: "hidden" }}>
      {Platform.OS === "web"
        ? <iframe src={embedUrl(id)} title="Vídeo do YouTube" style={{ width: "100%", height: "100%", border: 0 }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
        : <WebView source={{ uri: embedUrl(id) }} allowsFullscreenVideo allowsInlineMediaPlayback mediaPlaybackRequiresUserAction={false} style={{ flex: 1, backgroundColor: "#000" }} />}
    </View>
  );
}
