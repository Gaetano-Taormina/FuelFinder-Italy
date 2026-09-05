#!/usr/bin/env node
/* oxlint-disable no-console */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import process from 'node:process';

const type = process.argv[2] || 'patch';
const pkgPath = path.resolve('package.json');

if (!fs.existsSync(pkgPath)) {
    console.error('❌ package.json not found!');
    process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const [major, minor, patch] = pkg.version.split('.').map(Number);

let newVersion;
if (type === 'major') {
    newVersion = `${major + 1}.0.0`;
} else if (type === 'minor') {
    newVersion = `${major}.${minor + 1}.0`;
} else if (type === 'patch') {
    newVersion = `${major}.${minor}.${patch + 1}`;
} else if (/^\d+\.\d+\.\d+/.test(type)) {
    newVersion = type;
} else {
    console.error(`❌ Invalid release type: "${type}". Use: patch, minor, major, or explicit version (e.g. 1.3.0).`);
    process.exit(1);
}

pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

const tagName = `v${newVersion}`;
console.log(`\n🚀 Preparing release ${tagName}...\n`);

try {
    // Run linter and tests before tagging
    console.log('📦 Running linter and tests...');
    execSync('pnpm run lint', { stdio: 'inherit' });
    execSync('pnpm run test:coverage', { stdio: 'inherit' });

    // Stage package.json and commit
    execSync('git add package.json', { stdio: 'inherit' });
    execSync(`git commit -m "chore(release): ${tagName}"`, { stdio: 'inherit' });
    execSync(`git tag -a ${tagName} -m "Release ${tagName}"`, { stdio: 'inherit' });

    console.log(`\n✅ Successfully created release commit and tag ${tagName}!\n`);
    console.log(`👉 To push to GitHub and trigger automatic release workflow, run:`);
    console.log(`   git push origin main --tags\n`);
} catch (error) {
    console.error(`\n❌ [RELEASE FAILED] ${error.message}\n`);
    process.exit(1);
}
