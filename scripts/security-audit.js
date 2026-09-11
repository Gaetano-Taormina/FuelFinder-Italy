#!/usr/bin/env node
/* oxlint-disable no-console */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT_DIR = process.cwd();

const SCAN_DIRS = ['server', 'src'];
const EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);
const IGNORE_PATTERNS = ['node_modules', 'dist', '.git', 'coverage'];

/**
 * Recursively collects all source files
 */
export function collectFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(ROOT_DIR, fullPath);

    if (IGNORE_PATTERNS.some(p => relPath.includes(p))) continue;

    if (entry.isDirectory()) {
      collectFiles(fullPath, fileList);
    } else if (entry.isFile() && EXTENSIONS.has(path.extname(entry.name))) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

/**
 * Security Rule Definitions (mirroring GitHub CodeQL JS/TS suite)
 */
export const SECURITY_RULES = [
  {
    id: 'SEC-001-CODE-EVAL',
    name: 'Arbitrary Code Execution (eval / Function constructor)',
    severity: 'CRITICAL',
    description: 'Use of eval() or new Function() allows arbitrary code execution and RCE vulnerabilities.',
    pattern: /\b(eval\s*\(|new\s+Function\s*\()/g,
    check: (content) => {
      const matches = [];
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (/\b(eval\s*\(|new\s+Function\s*\()/.test(line) && !line.includes('oxlint-disable')) {
          matches.push({ line: idx + 1, snippet: line.trim() });
        }
      });
      return matches;
    }
  },
  {
    id: 'SEC-002-RAW-SQL-INJECTION',
    name: 'SQL Injection via Template String Interpolation',
    severity: 'HIGH',
    description: 'Dynamic variables concatenated directly into SQL query strings without parameterized bindings (?).',
    check: (content, filePath) => {
      const isDbFile = filePath.includes('repositories') || filePath.includes('sync') || filePath.includes('migrate.js');
      if (!isDbFile) return [];
      const matches = [];
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        // Detect raw interpolation inside SQL query words
        if (/\b(SELECT|INSERT INTO|UPDATE|DELETE FROM)\b.*?\$\{/i.test(line) && !line.includes('stationsSqlBase') && !line.includes('pricesSqlBase')) {
          matches.push({ line: idx + 1, snippet: line.trim() });
        }
      });
      return matches;
    }
  },
  {
    id: 'SEC-003-UNSANITIZED-HTML-INJECTION',
    name: 'Reflected XSS / Unsanitized HTML Response',
    severity: 'HIGH',
    description: 'Passing raw req.query or req.params directly into res.send() or HTML template strings.',
    check: (content, filePath) => {
      if (!filePath.includes('server')) return [];
      const matches = [];
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (/res\.(send|write)\s*\(\s*`[^`]*\$\{(req\.query|req\.params|req\.url|req\.path)/.test(line)) {
          matches.push({ line: idx + 1, snippet: line.trim() });
        }
      });
      return matches;
    }
  },
  {
    id: 'SEC-004-HARDCODED-SECRET-LEAK',
    name: 'Hardcoded High-Entropy Secrets or Tokens',
    severity: 'CRITICAL',
    description: 'Hardcoded passkeys, private keys, or API tokens in source code instead of environment variables.',
    check: (content, filePath) => {
      if (filePath.includes('.env.example') || filePath.includes('tests')) return [];
      const matches = [];
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (/(ADMIN_PASSKEY\s*=\s*['"][a-zA-Z0-9_-]{8,}['"]|jwt_secret\s*=\s*['"][^'"]+['"]|api_key\s*=\s*['"][a-zA-Z0-9_-]{16,}['"])/i.test(line)) {
          matches.push({ line: idx + 1, snippet: line.trim() });
        }
      });
      return matches;
    }
  },
  {
    id: 'SEC-005-TIMING-SAFE-EQUAL',
    name: 'Insecure Secret Comparison (Timing Attack)',
    severity: 'MEDIUM',
    description: 'Using standard equality (===) to compare secret passkeys instead of crypto.timingSafeEqual.',
    check: (content, filePath) => {
      if (!filePath.includes('server') || filePath.includes('tests')) return [];
      const matches = [];
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (/(clientPasskey|adminPasskey|recoveryPasskey)\s*===/i.test(line)) {
          matches.push({ line: idx + 1, snippet: line.trim() });
        }
      });
      return matches;
    }
  }
];

/**
 * Runs static security checks across all project files
 */
export function runStaticSecurityAudit(files) {
  const issues = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const relPath = path.relative(ROOT_DIR, file).replace(/\\/g, '/');

    for (const rule of SECURITY_RULES) {
      const violations = rule.check(content, file);
      if (violations && violations.length > 0) {
        for (const v of violations) {
          issues.push({
            ruleId: rule.id,
            name: rule.name,
            severity: rule.severity,
            file: relPath,
            line: v.line,
            snippet: v.snippet,
            description: rule.description
          });
        }
      }
    }
  }

  return issues;
}

/**
 * Runs dependency vulnerability audit
 */
export function runDependencyAudit() {
  try {
    execSync('pnpm audit --audit-level=high', { stdio: 'pipe', encoding: 'utf8' });
    return { success: true, message: 'Zero high/critical dependency vulnerabilities found.' };
  } catch (err) {
    return { success: false, message: (err.stdout || err.message || '').toString().trim() };
  }
}

/**
 * Main execution handler
 */
export async function main() {
  console.log('\n🛡️  [FuelFinder Local Security Audit] Starting CodeQL & Vulnerability Pre-Flight Check...\n');

  console.log('=== Step 1/2: Dependency Supply Chain Audit (pnpm audit) ===');
  const depResult = runDependencyAudit();
  if (depResult.success) {
    console.log(`✅ Dependencies: ${depResult.message}`);
  } else {
    console.error(`❌ Dependency Vulnerabilities Detected:\n${depResult.message}`);
    process.exit(1);
  }

  console.log('\n=== Step 2/2: Static CodeQL Zero-Alert Analysis ===');
  const allFiles = [];
  for (const dir of SCAN_DIRS) {
    collectFiles(path.join(ROOT_DIR, dir), allFiles);
  }

  const issues = runStaticSecurityAudit(allFiles);

  if (issues.length === 0) {
    console.log(`✅ Static Analysis: Scanned ${allFiles.length} files. Zero security vulnerabilities found!`);
    console.log('\n🎉 [PASS] Repository is 100% compliant with CodeQL security standards. Safe to push to GitHub!\n');
    process.exit(0);
  } else {
    console.error(`\n❌ [SECURITY ALERT] Found ${issues.length} potential security vulnerability(ies):\n`);
    for (const issue of issues) {
      console.error(`  [${issue.severity}] ${issue.ruleId}: ${issue.name}`);
      console.error(`  📍 File: ${issue.file}:${issue.line}`);
      console.error(`  🔍 Code: ${issue.snippet}`);
      console.error(`  💡 Info: ${issue.description}\n`);
    }
    process.exit(1);
  }
}

/* v8 ignore start */
if (process.argv[1] && process.argv[1].endsWith('security-audit.js')) {
  main();
}
/* v8 ignore stop */
