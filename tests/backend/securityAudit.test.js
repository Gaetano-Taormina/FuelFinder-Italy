import { describe, it, expect } from 'vitest';
import path from 'node:path';
import {
  collectFiles,
  runStaticSecurityAudit,
  runDependencyAudit,
  SECURITY_RULES
} from '../../scripts/security-audit.js';

describe('Local Security Audit Script (scripts/security-audit.js)', () => {
  it('collects files recursively from valid directories and ignores specified folders', () => {
    const files = collectFiles(path.join(process.cwd(), 'server'));
    expect(Array.isArray(files)).toBe(true);
    expect(files.length).toBeGreaterThan(0);
    expect(files.some(f => f.endsWith('server.js'))).toBe(true);

    const nonExistent = collectFiles('/non/existent/path/123');
    expect(nonExistent).toEqual([]);
  });

  it('validates SECURITY_RULES against secure and vulnerable patterns', () => {
    const evalRule = SECURITY_RULES.find(r => r.id === 'SEC-001-CODE-EVAL');
    expect(evalRule.check('const a = 1;')).toEqual([]);
    expect(evalRule.check('eval("alert(1)");').length).toBe(1);

    const sqlRule = SECURITY_RULES.find(r => r.id === 'SEC-002-RAW-SQL-INJECTION');
    expect(sqlRule.check('SELECT * FROM stations WHERE id = ?', 'server/repositories/test.js')).toEqual([]);
    expect(sqlRule.check('const sql = `SELECT * FROM stations WHERE id = ${userInput}`;', 'server/repositories/test.js').length).toBe(1);
    expect(sqlRule.check('const sql = `SELECT * FROM stations WHERE id = ${userInput}`;', 'src/components/Test.jsx')).toEqual([]);

    const xssRule = SECURITY_RULES.find(r => r.id === 'SEC-003-UNSANITIZED-HTML-INJECTION');
    expect(xssRule.check('res.send("hello")', 'server/test.js')).toEqual([]);
    expect(xssRule.check('res.send(`<h1>${req.query.name}</h1>`)', 'server/test.js').length).toBe(1);
    expect(xssRule.check('res.send(`<h1>${req.query.name}</h1>`)', 'src/test.js')).toEqual([]);

    const secretRule = SECURITY_RULES.find(r => r.id === 'SEC-004-HARDCODED-SECRET-LEAK');
    expect(secretRule.check('const pass = process.env.PASS;', 'server/test.js')).toEqual([]);
    expect(secretRule.check('const ADMIN_PASSKEY = "super_secret_passkey_123";', 'server/test.js').length).toBe(1);
    expect(secretRule.check('const ADMIN_PASSKEY = "super_secret_passkey_123";', '.env.example')).toEqual([]);

    const timingRule = SECURITY_RULES.find(r => r.id === 'SEC-005-TIMING-SAFE-EQUAL');
    expect(timingRule.check('crypto.timingSafeEqual(a, b)', 'server/test.js')).toEqual([]);
    expect(timingRule.check('if (clientPasskey === adminPasskey)', 'server/test.js').length).toBe(1);
    expect(timingRule.check('if (clientPasskey === adminPasskey)', 'tests/test.js')).toEqual([]);

    const redirectRule = SECURITY_RULES.find(r => r.id === 'SEC-006-OPEN-REDIRECT');
    expect(redirectRule.check('res.redirect(301, "/safe/path")', 'server/test.js')).toEqual([]);
    expect(redirectRule.check('res.redirect(301, `${req.url}`)', 'server/test.js').length).toBe(1);
    expect(redirectRule.check('res.redirect(301, `${req.url}`)', 'tests/test.js')).toEqual([]);

    const urlRule = SECURITY_RULES.find(r => r.id === 'SEC-007-INCOMPLETE-URL-SANITIZATION');
    expect(urlRule.check('url.startsWith("https://domain.com")', 'src/test.js')).toEqual([]);
    expect(urlRule.check('if (url.includes("example.com"))', 'src/test.js').length).toBe(1);
    expect(urlRule.check('if (url.includes("example.com"))', 'scripts/security-audit.js')).toEqual([]);
  });

  it('runs static security audit and reports clean codebase', () => {
    const serverFiles = collectFiles(path.join(process.cwd(), 'server'));
    const issues = runStaticSecurityAudit(serverFiles);
    expect(issues).toEqual([]);
  });

  it('handles dependency audit results and command errors gracefully', () => {
    const result = runDependencyAudit();
    expect(typeof result.success).toBe('boolean');
    expect(typeof result.message).toBe('string');
  });
});
