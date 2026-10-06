// Preferencias pequeñas: tema, nombre del paciente y si ya se vio el tutorial.
import { Preferences } from '@capacitor/preferences';

const KEYS = { theme: 'tema', patient: 'nombrePaciente', tutorial: 'tutorialVisto' };
export const THEMES = ['auto', 'light', 'dark'];

async function get(key) {
  return (await Preferences.get({ key })).value;
}
async function set(key, value) {
  await Preferences.set({ key, value: String(value) });
}

export async function getTheme() {
  const v = await get(KEYS.theme);
  return THEMES.includes(v) ? v : 'auto';
}
export const setTheme = (v) => set(KEYS.theme, v);

export async function getPatientName() {
  return (await get(KEYS.patient)) ?? '';
}
export const setPatientName = (v) => set(KEYS.patient, v.trim().slice(0, 80));

export async function getTutorialSeen() {
  return (await get(KEYS.tutorial)) === 'true';
}
export const setTutorialSeen = (v) => set(KEYS.tutorial, Boolean(v));
