// Porta de entrada: manda cada pessoa para a tela certa.
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { prefsReady, useSession } from "../lib/session";
import { useTheme } from "../lib/theme";

export default function Index() {
  const { mode, prefs } = useSession();
  const t = useTheme();
  if (mode === "loading") return <View style={{ flex: 1, justifyContent: "center", backgroundColor: t.head }}><ActivityIndicator color="#fff" /></View>;
  if (mode === "out") return <Redirect href="/login" />;
  if (!prefsReady(prefs)) return <Redirect href="/escolher" />;
  return <Redirect href="/inicio" />;
}
