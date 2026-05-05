import { useTranslation } from 'react-i18next';

export default function LanguageToggle() {
    const { t, i18n } = useTranslation();
    const isEn = i18n.language?.startsWith('en');

    const toggle = () => {
        i18n.changeLanguage(isEn ? 'fr' : 'en');
    };

    return (
        <button
            onClick={toggle}
            title={t('lang.switchTo')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-widest border border-surface-container-high hover:bg-surface-container-low text-on-surface-variant hover:text-on-surface transition-colors"
        >
            {t('lang.toggle')}
        </button>
    );
}
