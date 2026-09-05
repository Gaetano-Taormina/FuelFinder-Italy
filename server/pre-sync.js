/* oxlint-disable no-console */
import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';

async function bakeDb() {
    const dbPath = path.join(process.cwd(), 'server', 'database.sqlite');
    
    // Se il database locale esiste già ed è valido, salta per preservare la quota Turso
    if (fs.existsSync(dbPath) && fs.statSync(dbPath).size > 1024 * 100 && !process.env.FORCE_SYNC) {
        console.log("⚡ [Pre-Build] Local database already present and valid. Skipping remote Turso sync.");
        return;
    }

    if (!process.env.TURSO_DATABASE_URL) {
        console.log("No TURSO_DATABASE_URL provided. Skipping DB bake.");
        return;
    }

    console.log("Baking SQLite DB from Turso during build phase...");
    
    try {
        const db = createClient({
            url: 'file:server/database.sqlite',
            syncUrl: process.env.TURSO_DATABASE_URL,
            authToken: process.env.TURSO_AUTH_TOKEN
        });

        await db.sync();
        console.log("✅ DB baked successfully! The server will start instantly.");
    } catch (e) {
        console.error("⚠️ Failed to bake DB. It will sync on first startup instead.", e);
    }
}

bakeDb();
