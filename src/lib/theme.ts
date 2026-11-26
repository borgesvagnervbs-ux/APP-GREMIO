// Cores do app: só azul, preto e branco (regra do projeto: nada de vermelho).
import { useColorScheme } from "react-native";

const light = {
  bg: "#f3f6fa",
  surface: "#ffffff",
  fg: "#0d1622",
  muted: "#5b6b7e",
  line: "#dce3ec",
  blue: "#0b6fc2",
  blueInk: "#ffffff",
  head: "#0a1a2c",
  headFg: "#ffffff",
  headMuted: "#93a4b8",
  chip: "#e7eef6",
};
const dark: typeof light = {
  bg: "#08111c",
  surface: "#0f1c2b",
  fg: "#e8eef5",
  muted: "#93a4b8",
  line: "#1e2f43",
  blue: "#3a9bea",
  blueInk: "#04121f",
  head: "#050c15",
  headFg: "#ffffff",
  headMuted: "#93a4b8",
  chip: "#16283c",
};
export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === "dark" ? dark : light;
}

// Tons usados nas miniaturas sem foto (só azul e preto)
export const SHADES = ["#0b6fc2", "#0a1a2c", "#1f5f99", "#000000", "#2f7fcf"];
