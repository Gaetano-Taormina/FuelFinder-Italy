import { describe, it, expect } from 'vitest';
import { determineBumpType } from '../../scripts/release.js';

describe('Release Version Determination (Conventional Commits)', () => {
    it('detects major bump on BREAKING CHANGE or exclamation mark', () => {
        expect(determineBumpType(['feat!: rewrite database architecture'])).toBe('major');
        expect(determineBumpType(['fix(api)!: change response structure'])).toBe('major');
        expect(determineBumpType(['chore: update dependencies\n\nBREAKING CHANGE: drop node 16'])).toBe('major');
        expect(determineBumpType(['refactor: core logic\nBREAKING-CHANGE: remove legacy route'])).toBe('major');
    });

    it('detects minor bump on feat commits', () => {
        expect(determineBumpType(['feat: add zstandard compression support'])).toBe('minor');
        expect(determineBumpType(['feat(db): add automated sqlite downloader', 'fix: bug in query'])).toBe('minor');
    });

    it('detects patch bump for fix, chore, docs, refactor, perf, ci', () => {
        expect(determineBumpType(['fix: handle 404 error correctly'])).toBe('patch');
        expect(determineBumpType(['docs: update readme', 'chore: bump dependencies'])).toBe('patch');
        expect(determineBumpType(['perf: optimize sql index', 'refactor: clean up routes'])).toBe('patch');
    });

    it('defaults to patch when commits array is empty or unrecognized', () => {
        expect(determineBumpType([])).toBe('patch');
        expect(determineBumpType(['misc: something else'])).toBe('patch');
    });
});
