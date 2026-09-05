#!/usr/bin/env node
/* oxlint-disable no-console */
import { spawn } from 'node:child_process';
import process from 'node:process';

const target = process.argv[2] || 'all';
const isWin = process.platform === 'win32';

const suites = {
    unit: {
        cmd: 'pnpm',
        args: ['exec', 'vitest', 'run', '--project', 'unit'],
        desc: 'Component and Unit Tests (Vitest in-memory)'
    },
    integration: {
        cmd: 'pnpm',
        args: ['exec', 'vitest', 'run', '--project', 'integration'],
        desc: 'Integration Flow Tests (Context, UI & API Pipeline)'
    },
    e2e: {
        cmd: 'pnpm',
        args: ['exec', 'playwright', 'test'],
        desc: 'End-to-End Tests in Real Headless Browser (Playwright)'
    },
    coverage: {
        cmd: 'pnpm',
        args: ['exec', 'vitest', 'run', '--coverage', '--coverage.reporter=text', '--coverage.reporter=json-summary'],
        desc: 'Global v8 Code Coverage Analysis'
    }
};

function runCommand(command, args) {
    return new Promise((resolve, reject) => {
        const proc = spawn(command, args, { stdio: 'inherit', shell: isWin });
        proc.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Command exited with error code ${code}`));
        });
        proc.on('error', reject);
    });
}

async function main() {
    console.log(`\n🚀 [FuelFinder Test Runner] Selected Mode: ${target.toUpperCase()}\n`);

    try {
        if (target === 'all') {
            console.log(`=== 1/3: ${suites.unit.desc} ===`);
            await runCommand(suites.unit.cmd, suites.unit.args);

            console.log(`\n=== 2/3: ${suites.integration.desc} ===`);
            await runCommand(suites.integration.cmd, suites.integration.args);

            console.log(`\n=== 3/3: ${suites.e2e.desc} ===`);
            await runCommand(suites.e2e.cmd, suites.e2e.args);

            console.log('\n✅ All 3 test suites (Unit, Integration, E2E) completed successfully!\n');
        } else if (suites[target]) {
            console.log(`=== Running: ${suites[target].desc} ===`);
            await runCommand(suites[target].cmd, suites[target].args);
            if (target === 'coverage') {
                await runCommand('node', ['tests/coverage-highlights.js']);
            }
            console.log(`\n✅ Suite ${target.toUpperCase()} completed successfully!\n`);
        } else {
            console.error(`❌ Invalid target: "${target}". Available: unit, integration, e2e, coverage, all.`);
            process.exit(1);
        }
    } catch (err) {
        console.error(`\n❌ [TEST FAILED] ${err.message}\n`);
        process.exit(1);
    }
}

main();
