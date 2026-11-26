import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

// Endereço e chave PÚBLICA do projeto "GRÊMIO APP" no Supabase.
// A chave pública pode ficar no app: a segurança vem das regras (RLS) do banco.
export const SUPABASE_URL = "https://wdvsktovaklouzsfrwno.supabase.co";
export const SUPABASE_KEY = "sb_publishable_QlHPRw26fRg4aJ-myzJISA_K0XFFuyd";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    // no navegador o Supabase usa o armazenamento do próprio navegador
    storage: Platform.OS === "web" ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === "web",
  },
});
