import type { PastWork } from '@/lib/types';
import type { Language } from '@/lib/types';
import { t } from '@/lib/i18n';

interface Props {
  work: PastWork;
  lang: Language;
}

function scoreColor(score: number) {
  if (score >= 75) return { border: '#4a7c59', bg: 'oklch(93% 0.048 152)', text: '#2d5a3d' };
  if (score >= 50) return { border: '#8a6a28', bg: 'oklch(93% 0.052 63)',  text: '#5c4318' };
  return               { border: '#8b3228', bg: 'oklch(93% 0.048 27)',   text: '#6b2218' };
}

export default function GalleryCard({ work, lang }: Props) {
  const c = scoreColor(work.score);
  const lvLabel = lang === 'zh' ? `第${work.level}关` : `Lv.${work.level}`;

  return (
    <div className="relative bg-white overflow-hidden cursor-pointer transition-colors hover:bg-stone-50">
      {/* Drawing thumbnail */}
      <div className="aspect-[4/3] bg-white flex items-center justify-center p-3">
        {work.imageBase64 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={work.imageBase64} alt={work.prompt} className="w-full h-full object-contain" />
        ) : (
          <div className="w-full h-full bg-stone-100" />
        )}
      </div>

      {/* Score stamp (hanko-style: slightly rotated square) */}
      <div
        className="absolute top-2 right-2 w-10 h-10 flex items-center justify-center text-sm font-bold"
        style={{
          border: `1.5px solid ${c.border}`,
          background: c.bg,
          color: c.text,
          transform: 'rotate(4deg)',
          fontFamily: "'Shippori Mincho B1', serif",
        }}
      >
        {work.score}
      </div>

      {/* Level badge */}
      <div
        className="absolute top-2 left-2 text-[10px] px-1.5 py-0.5 text-stone-100"
        style={{ background: 'rgba(26,26,36,0.72)', backdropFilter: 'blur(4px)' }}
      >
        {lvLabel}
      </div>

      {/* Prompt label */}
      <div className="px-2.5 py-2 border-t border-stone-100">
        <p className="text-[11px] text-stone-400 truncate">
          <b className="text-stone-600 font-medium">{t(lang, 'home.gallery.drawLabel')}</b>{' '}
          {work.prompt}
        </p>
      </div>
    </div>
  );
}
