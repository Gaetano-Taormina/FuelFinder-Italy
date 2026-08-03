import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import * as tar from 'tar';

const DOWNLOADS_DIR = path.join(process.env.USERPROFILE, 'Downloads');
const STORICO_DIR = path.join(process.cwd(), 'server', 'storico_csv');
const PROCESSED_DIR = path.join(DOWNLOADS_DIR, 'Processed_MIMIT');

async function run() {
    console.log(`🔍 Controllo file in ${DOWNLOADS_DIR}`);
    
    if (!fs.existsSync(STORICO_DIR)) fs.mkdirSync(STORICO_DIR, { recursive: true });
    if (!fs.existsSync(PROCESSED_DIR)) fs.mkdirSync(PROCESSED_DIR, { recursive: true });

    const files = fs.readdirSync(DOWNLOADS_DIR).filter(f => f.endsWith('.tar.gz'));
    console.log(`Trovati ${files.length} archivi da elaborare.`);

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const tarPath = path.join(DOWNLOADS_DIR, file);
        console.log(`\n📦 [${i+1}/${files.length}] Estrazione di: ${file}`);
        
        // Creiamo una cartella specifica per questo trimestre
        const folderName = file.replace('.tar.gz', '');
        const targetDir = path.join(STORICO_DIR, folderName);
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
        
        try {
            await tar.x({
                file: tarPath,
                cwd: targetDir
            });
            
            // Spostiamo i CSV fuori dalle sottocartelle (es. ftproot) ma sempre dentro targetDir
            function flattenDir(currentPath) {
                const items = fs.readdirSync(currentPath);
                for (const item of items) {
                    const itemPath = path.join(currentPath, item);
                    if (fs.statSync(itemPath).isDirectory()) {
                        flattenDir(itemPath);
                        try { fs.rmdirSync(itemPath); } catch(e) {}
                    } else if (item.endsWith('.csv')) {
                        if (currentPath !== targetDir) {
                            fs.renameSync(itemPath, path.join(targetDir, item));
                        }
                    }
                }
            }
            flattenDir(targetDir);

            console.log(`⚙️  Avvio elaborazione dei CSV del trimestre ${folderName}...`);
            execSync(`node server/process-folder.js "server/storico_csv/${folderName}"`, { stdio: 'inherit' });
            
            console.log(`✅ Trimestre completato. I file CSV originali sono conservati intatti in: ${folderName}`);
            fs.renameSync(tarPath, path.join(PROCESSED_DIR, file));
            
        } catch (e) {
            console.error(`❌ Errore critico elaborando ${file}:`, e.message);
        }
    }
    console.log(`\n🎉 TUTTI GLI ARCHIVI SONO STATI PROCESSATI CON SUCCESSO!`);
}

run();
