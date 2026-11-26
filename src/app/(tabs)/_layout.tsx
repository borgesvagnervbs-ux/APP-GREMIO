import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { Platform, Text } from "react-native";
import { prefsReady, useSession } from "../../lib/session";
import { useTheme } from "../../lib/theme";

type Icon = keyof typeof Ionicons.glyphMap;
function label(text: string) {
  return function TabLabel({ color }: { color: string }) { return <Text style={{ color, fontSize: 12, lineHeight: 16, fontWeight: "600" }}>{text}</Text>; };
}
function icon(name: Icon) {
  return function TabIcon({ color, size }: { color: string; size: number }) { return <Ionicons name={name} color={color} size={size} />; };
}

export default function TabsLayout() {
  const t = useTheme();
  const { mode, prefs } = useSession();
  if (mode === "out") return <Redirect href="/login" />;
  if (mode !== "loading" && !prefsReady(prefs)) return <Redirect href="/escolher" />;
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: t.blue,
      tabBarInactiveTintColor: t.muted,
      tabBarStyle: { backgroundColor: t.surface, borderTopColor: t.line, ...(Platform.OS === "web" ? { height: 64, paddingTop: 0, paddingBottom: 0 } : null) },
      tabBarItemStyle: Platform.OS === "web" ? { height: 64, paddingVertical: 6 } : undefined,
      sceneStyle: { backgroundColor: t.bg },
    }}>
      <Tabs.Screen name="inicio" options={{ title: "Início", tabBarLabel: label("Início"), tabBarIcon: icon("home") }} />
      <Tabs.Screen name="videos" options={{ title: "Vídeos", tabBarLabel: label("Vídeos"), tabBarIcon: icon("play-circle") }} />
      <Tabs.Screen name="lives" options={{ title: "Lives", tabBarLabel: label("Lives"), tabBarIcon: icon("radio") }} />
      <Tabs.Screen name="jogos" options={{ title: "Jogos", tabBarLabel: label("Jogos"), tabBarIcon: icon("football") }} />
    </Tabs>
  );
}
