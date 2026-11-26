import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Button, DISPLAY, s } from "../components/ui";
import { useSession } from "../lib/session";
import { supabase } from "../lib/supabase";
import { useTheme } from "../lib/theme";

function traduz(msg: string): string {
  if (/invalid login/i.test(msg)) return "E-mail ou senha incorretos.";
  if (/already registered/i.test(msg)) return "Este e-mail já tem conta. Use Entrar.";
  if (/password.*(6|characters)/i.test(msg)) return "A senha precisa ter pelo menos 6 caracteres.";
  if (/email not confirmed/i.test(msg)) return "Confirme seu e-mail pelo link que enviamos e tente de novo.";
  if (/valid email|invalid.*email/i.test(msg)) return "Digite um e-mail válido.";
  if (/rate limit/i.test(msg)) return "Muitas tentativas. Espere um minuto e tente de novo.";
  return "Não deu certo: " + msg;
}

export default function Login() {
  const t = useTheme();
  const { enterAsGuest } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok?: boolean } | null>(null);

  async function entrar() {
    setBusy(true); setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pass });
    setBusy(false);
    if (error) setMsg({ text: traduz(error.message) }); else router.replace("/");
  }
  async function criar() {
    setBusy(true); setMsg(null);
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password: pass, options: { data: { name: name.trim() || undefined } } });
    setBusy(false);
    if (error) return setMsg({ text: traduz(error.message) });
    if (data.session) router.replace("/");
    else setMsg({ ok: true, text: "Conta criada! Enviamos um link para o seu e-mail. Abra o link para confirmar e depois toque em Entrar." });
  }
  async function visitante() { await enterAsGuest(name); router.replace("/"); }

  const input = [st.input, { color: "#fff" }];
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: t.head }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingVertical: 48 }} keyboardShouldPersistTaps="handled">
        <View style={[s.wrap, { gap: 18 }]}>
          <View style={[s.row, { gap: 6 }]}>
            <View style={[st.stripe, { backgroundColor: "#0b6fc2" }]} />
            <View style={[st.stripe, { backgroundColor: "#000", borderWidth: 1, borderColor: "#2a3a4c" }]} />
            <View style={[st.stripe, { backgroundColor: "#fff" }]} />
          </View>
          <Text style={st.brand}>{"Tricolor\nem Dia"}</Text>
          <Text style={{ color: "#b9c7d6", fontSize: 15, maxWidth: 360 }}>
            Tudo sobre o Grêmio num lugar só: notícias dos sites que você escolher, vídeos dos seus canais favoritos, aviso de lives e a tabela de jogos.
          </Text>

          <View style={{ gap: 10 }}>
            <Text style={st.label}>Seu nome</Text>
            <TextInput nativeID="name" value={name} onChangeText={setName} placeholder="Ex.: Vagner" placeholderTextColor="#6f8297" style={input} autoComplete="given-name" />
            <Text style={st.label}>E-mail</Text>
            <TextInput nativeID="email" value={email} onChangeText={setEmail} placeholder="voce@email.com" placeholderTextColor="#6f8297" style={input}
              autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
            <Text style={st.label}>Senha</Text>
            <TextInput nativeID="senha" value={pass} onChangeText={setPass} placeholder="mínimo 6 caracteres" placeholderTextColor="#6f8297" style={input}
              secureTextEntry autoComplete="password" onSubmitEditing={entrar} />
          </View>

          {msg ? <Text accessibilityLiveRegion="polite" style={{ color: msg.ok ? "#9fd0ff" : "#ffffff", backgroundColor: msg.ok ? "#0f2a44" : "#1b2a3b", padding: 12, borderRadius: 10 }}>{msg.text}</Text> : null}

          <View style={{ gap: 10 }}>
            <Button label={busy ? "Aguarde..." : "Entrar"} onPress={entrar} disabled={busy || !email || !pass} />
            <Button label="Criar conta" onPress={criar} ghost dark disabled={busy || !email || pass.length < 6} />
            <Button label="Entrar sem cadastro" onPress={visitante} ghost dark disabled={busy} />
          </View>
          <Text style={{ color: "#8193a7", fontSize: 12 }}>
            Sem cadastro, suas escolhas ficam salvas só neste aparelho. App de torcedor, sem vínculo oficial com o clube.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  stripe: { height: 8, width: 44, borderRadius: 2 },
  brand: { fontFamily: DISPLAY, color: "#fff", fontSize: 50, lineHeight: 50, fontWeight: "800", textTransform: "uppercase" },
  label: { color: "#b9c7d6", fontSize: 12, letterSpacing: 1, textTransform: "uppercase" },
  input: { borderWidth: 1, borderColor: "#2a3c52", backgroundColor: "#0f2235", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16 },
});
