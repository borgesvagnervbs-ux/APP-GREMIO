// Moldura comum das abas: rolagem com "puxar para atualizar" e botão da conta.
import { router } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSession } from "../lib/session";
import { useTheme } from "../lib/theme";
import { s } from "./ui";

export function AccountButton() {
  const { name } = useSession();
  return (
    <Pressable onPress={() => router.push("/conta")} accessibilityRole="button" accessibilityLabel="Minha conta"
      style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#0a1a2c", fontWeight: "800", fontSize: 16 }}>{(name || "T").slice(0, 1).toUpperCase()}</Text>
    </Pressable>
  );
}

export function Scroll({ refreshing, onRefresh, children }: { refreshing: boolean; onRefresh: () => void; children: ReactNode }) {
  const t = useTheme();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.blue} colors={[t.blue]} />}>
      <View style={[s.wrap, { gap: 10 }]}>{children}</View>
    </ScrollView>
  );
}
