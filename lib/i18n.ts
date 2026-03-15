import en from '../locales/en.json';
import zh from '../locales/zh.json';
import type { Language } from './types';

type Strings = Record<string, string>;
const packs: Record<Language, Strings> = { en, zh };

export function t(lang: Language, key: string): string {
  return packs[lang][key] ?? packs['en'][key] ?? key;
}

export function getTranslations(lang: Language): Strings {
  return packs[lang];
}
