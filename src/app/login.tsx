import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Button, Crest, DISPLAY, s, StripeBand } from "../components/ui";
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
      <StripeBand height={10} />
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingVertical: 48 }} keyboardShouldPersistTaps="handled">
        <View style={[s.wrap, { gap: 18 }]}>
          <View style={st.crest}><Crest size={64} /></View>
          <Text style={st.brand}>{"Tricolor\nem Dia"}</Text>
          <Text style={{ color: t.headMuted, fontSize: 15, maxWidth: 360 }}>
            Tudo sobre o Grêmio num lugar só: notícias dos sites que você escolher, vídeos dos seus canais favoritos, aviso de lives e a tabela de jogos.
          </Text>

          <View style={{ gap: 10 }}>
            <Text style={st.label}>Seu nome</Text>
            <TextInput nativeID="name" value={name} onChangeText={setName} placeholder="Ex.: Vagner" placeholderTextColor="#9cc3e4" style={input} autoComplete="given-name" />
            <Text style={st.label}>E-mail</Text>
            <TextInput nativeID="email" value={email} onChangeText={setEmail} placeholder="voce@email.com" placeholderTextColor="#9cc3e4" style={input}
              autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
            <Text style={st.label}>Senha</Text>
            <TextInput nativeID="senha" value={pass} onChangeText={setPass} placeholder="mínimo 6 caracteres" placeholderTextColor="#9cc3e4" style={input}
              secureTextEntry autoComplete="password" onSubmitEditing={entrar} />
          </View>

          {msg ? <Text accessibilityLiveRegion="polite" style={{ color: "#ffffff", backgroundColor: msg.ok ? "#000000" : "rgba(0,0,0,0.55)", padding: 12, borderRadius: 10 }}>{msg.text}</Text> : null}

          <View style={{ gap: 10 }}>
            <Button label={busy ? "Aguarde..." : "Entrar"} dark onPress={entrar} disabled={busy || !email || !pass} />
            <Button label="Criar conta" onPress={criar} ghost dark disabled={busy || !email || pass.length < 6} />
            <Button label="Entrar sem cadastro" onPress={visitante} ghost dark disabled={busy} />
          </View>
          <Text style={{ color: t.headMuted, fontSize: 12 }}>
            Sem cadastro, suas escolhas ficam salvas só neste aparelho. App de torcedor, sem vínculo oficial com o clube.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  crest: { width: 84, height: 84, borderRadius: 42, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  brand: { fontFamily: DISPLAY, color: "#fff", fontSize: 50, lineHeight: 50, fontWeight: "800", textTransform: "uppercase" },
  label: { color: "#ffffff", fontSize: 12, letterSpacing: 1, textTransform: "uppercase" },
  input: { borderWidth: 1, borderColor: "rgba(255,255,255,0.45)", backgroundColor: "rgba(0,0,0,0.35)", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16 },
});
