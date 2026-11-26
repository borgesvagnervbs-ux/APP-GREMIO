import { Stack } from "expo-router";
import Head from "expo-router/head";
import { StatusBar } from "expo-status-bar";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SessionProvider } from "../lib/session";
import { SourcesProvider } from "../lib/sources";
import { useTheme } from "../lib/theme";

function FontLink() {
  if (Platform.OS !== "web") return null;
  return (
    <Head>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&display=swap" />
    </Head>
  );
}

export default function RootLayout() {
  const t = useTheme();
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <SourcesProvider>
          <FontLink />
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }}>
            <Stack.Screen name="conta" options={{ presentation: "modal" }} />
          </Stack>
        </SourcesProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
