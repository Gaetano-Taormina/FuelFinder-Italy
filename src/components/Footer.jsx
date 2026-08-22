import { useTranslation } from 'react-i18next';

export default function Footer() {
    const { t } = useTranslation();

    return (
        <footer className="mt-8 mb-4 text-center text-sm text-slate-700 dark:text-slate-300">
            <p dangerouslySetInnerHTML={{ __html: t('footer_text') }} />
        </footer>
    );
}
