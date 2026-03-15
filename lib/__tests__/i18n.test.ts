import { t, getTranslations } from '../i18n';

describe('i18n', () => {
  it('returns English string by key', () => {
    expect(t('en', 'home.cta.start')).toBe('Start Drawing');
  });

  it('returns Chinese string by key', () => {
    expect(t('zh', 'home.cta.start')).toBe('开始作画');
  });

  it('falls back to key if not found', () => {
    expect(t('en', 'nonexistent.key')).toBe('nonexistent.key');
  });

  it('getTranslations returns full object', () => {
    const tr = getTranslations('en');
    expect(tr['home.cta.start']).toBe('Start Drawing');
  });
});
