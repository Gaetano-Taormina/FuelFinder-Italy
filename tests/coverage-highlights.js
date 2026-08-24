import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const coveragePath = path.join(__dirname, 'coverage', 'coverage-summary.json');

if (!fs.existsSync(coveragePath)) {
    console.error('⚠️ File coverage-summary.json non trovato!');
    process.exit(1);
}

const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf-8'));
const total = coverage.total;

const highlights = [
    '',
    '==================================================',
    'PUNTI SALIENTI DELLA COVERAGE',
    '==================================================',
    `Linee Totali: ${total.lines.pct}% (${total.lines.covered}/${total.lines.total})`,
    `Funzioni: ${total.functions.pct}% (${total.functions.covered}/${total.functions.total})`,
    `Statements: ${total.statements.pct}% (${total.statements.covered}/${total.statements.total})`,
    `Branches: ${total.branches.pct}% (${total.branches.covered}/${total.branches.total})`,
];

if (total.statements.pct === 100 && total.branches.pct === 100 && total.functions.pct === 100 && total.lines.pct === 100) {
    highlights.push('PERFETTO! Hai raggiunto il 100% di coverage globale su tutto!');
} else {
    const files = Object.keys(coverage).filter(k => k !== 'total');
    const sorted = files.sort((a, b) => coverage[a].statements.pct - coverage[b].statements.pct);
    const worst = sorted[0];
    if (worst) {
        const worstName = worst.split(/(\/|\\)/).pop();
        highlights.push(`Attenzione: Il file meno coperto è "${worstName}" con il ${coverage[worst].statements.pct}% di statements coperti.`);
    }
}

highlights.push('==================================================');
highlights.push('');

console.log(highlights.join('\n'));
