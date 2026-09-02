/* oxlint-disable no-console */
import { createClient } from '@libsql/client';

async function bakeDb() {
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
