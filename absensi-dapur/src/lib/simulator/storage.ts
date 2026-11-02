import { parseScenario, type Scenario } from "./model";
export const STORAGE_KEY = "djati:simulator-operasional:v1";
export function loadScenario(): Scenario | null {
  const text = localStorage.getItem(STORAGE_KEY);
  return text ? parseScenario(text) : null;
}
export function saveScenario(s: Scenario) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}
export function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
