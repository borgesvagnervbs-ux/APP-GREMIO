import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { Platform } from "react-native";
import { prefsReady, useSession } from "../../lib/session";
import { useTheme } from "../../lib/theme";

type Icon = keyof typeof Ionicons.glyphMap;
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
      tabBarStyle: { backgroundColor: t.surface, borderTopColor: t.line, ...(Platform.OS === "web" ? { height: 62, paddingTop: 6, paddingBottom: 8 } : null) },
      tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
      sceneStyle: { backgroundColor: t.bg },
    }}>
      <Tabs.Screen name="inicio" options={{ title: "Início", tabBarIcon: icon("home") }} />
      <Tabs.Screen name="videos" options={{ title: "Vídeos", tabBarIcon: icon("play-circle") }} />
      <Tabs.Screen name="lives" options={{ title: "Lives", tabBarIcon: icon("radio") }} />
      <Tabs.Screen name="jogos" options={{ title: "Jogos", tabBarIcon: icon("football") }} />
    </Tabs>
  );
}
