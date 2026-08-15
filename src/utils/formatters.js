export const formatStationName = (name) => {
    if (!name) return 'Distributore';
    
    if (name.toUpperCase() === 'POMPE BIANCHE') return 'Pompe Bianche';

    let cleanName = name
        .replace(/(?:\b|\s)(S\.A\.S\.|S\.R\.L\.|S\.N\.C\.|S\.P\.A\.|S\.A\.P\.A\.|S\.R\.L\.S\.|S\.C\.A\.R\.L\.|S\.S\.)(?:\s|$)/gi, ' ')
        .replace(/\b(SAS|SRL|SNC|SPA|SAPA|SRLS|SCARL)\b/gi, ' ')
        .replace(/(?:^|\s)& C\.?(?:\s|$)/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    cleanName = cleanName.replace(/[,.\-]$/, '').trim();

    if (cleanName === cleanName.toUpperCase() && cleanName.length > 4) {
        cleanName = cleanName.split(' ').map(word => {
            const lower = word.toLowerCase();
            if (['di', 'e', 'da', 'il', 'la', 'lo', 'i', 'gli', 'le', 'un', 'una', 'del', 'della', 'dei', 'degli', 'delle'].includes(lower)) return lower;
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }).join(' ');
    }

    return cleanName || 'Distributore';
};
