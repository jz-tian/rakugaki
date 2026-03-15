'use client';

import { setGameState } from '@/lib/storage';
import type { Language } from '@/lib/types';

interface Props {
  lang: Language;
  onChange: (lang: Language) => void;
}

export default function LanguageToggle({ lang, onChange }: Props) {
  function switchTo(l: Language) {
    setGameState({ language: l });
    onChange(l);
  }

  return (
    <div className="flex border border-stone-300" style={{ borderRadius: '2px' }}>
      {(['en', 'zh'] as Language[]).map(l => (
        <button
          key={l}
          onClick={() => switchTo(l)}
          className={`px-3 py-1 text-xs font-medium transition-colors border-r last:border-r-0 border-stone-300 ${
            lang === l
              ? 'bg-stone-800 text-stone-100'
              : 'text-stone-400 hover:text-stone-600 bg-transparent'
          }`}
        >
          {l === 'en' ? 'EN' : '中文'}
        </button>
      ))}
    </div>
  );
}
