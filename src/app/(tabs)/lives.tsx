import { useState } from "react";
import { Text, View } from "react-native";
import { AccountButton, Scroll } from "../../components/screen";
import { Empty, Header, LiveCard, Loading, Section, useLoad } from "../../components/ui";
import { getLives } from "../../lib/data";
import { useSession } from "../../lib/session";
import { useSources } from "../../lib/sources";
import { useTheme } from "../../lib/theme";

export default function Lives() {
  const t = useTheme();
  const { prefs, reminders, toggleReminder, mode } = useSession();
  const { byId } = useSources();
  const channels = prefs?.channels ?? [];
  const [err, setErr] = useState<string | null>(null);
  const { data, loading, refreshing, error, reload } = useLoad(() => getLives(channels), [channels.join()], []);
  const now = data.filter((l) => l.live_status === "live");
  const soon = data.filter((l) => l.live_status !== "live");

  async function toggle(id: string) {
    setErr(null);
    try { await toggleReminder(id); } catch (e) { setErr("Não foi possível salvar o lembrete: " + (e as Error).message); }
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Header title="Lives" subtitle="Ao vivo agora e agendadas nos seus canais" right={<AccountButton />} />
      {loading && !data.length ? <Loading /> : error && !data.length ? <Loading error={error} onRetry={reload} /> :
        <Scroll refreshing={refreshing} onRefresh={reload}>
          {err ? <Text style={{ color: t.fg, marginTop: 12 }}>{err}</Text> : null}
          <Section title="Ao vivo agora" />
          {now.length ? now.map((l) => <LiveCard key={l.id} item={l} src={byId[l.source_id]} reminded={false} onToggle={() => {}} />)
            : <Empty>Nenhum dos seus canais está ao vivo neste momento.</Empty>}
          <Section title="Em breve" />
          {soon.length ? soon.map((l) => <LiveCard key={l.id} item={l} src={byId[l.source_id]} reminded={reminders.includes(l.id)} onToggle={() => toggle(l.id)} />)
            : <Empty>Nenhuma live agendada. Assim que um canal marcar, ela aparece aqui.</Empty>}
          <Text style={{ color: t.muted, fontSize: 12, marginTop: 14 }}>
            {mode === "guest" ? "Seus lembretes ficam salvos neste aparelho. " : ""}O aviso no celular (notificação) chega na versão instalada do app.
          </Text>
        </Scroll>}
    </View>
  );
}
