#!/usr/bin/env node

/**
 * ⚡ HypaStack SEO Audit
 * Modern, lightning-fast SEO validation suite
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// ANSI Escapes for modern CLI styling
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
};

// Box drawing characters
const Box = {
  tl: '╭', tr: '╮', bl: '╰', br: '╯',
  h: '─', v: '│', l: '├', r: '┤',
  dot: '•', tick: '✓', cross: '✗', warn: '⚠'
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class Logger {
  static title(text) {
    console.log();
    console.log(`${C.cyan}${C.bold}${Box.tl}${Box.h.repeat(text.length + 2)}${Box.tr}${C.reset}`);
    console.log(`${C.cyan}${C.bold}${Box.v} ${C.white}${text} ${C.cyan}${C.bold}${Box.v}${C.reset}`);
    console.log(`${C.cyan}${C.bold}${Box.bl}${Box.h.repeat(text.length + 2)}${Box.br}${C.reset}`);
    console.log();
  }

  static section(title) {
    console.log(`${C.magenta}${C.bold}► ${title}${C.reset}`);
  }

  static pass(msg) {
    console.log(`  ${C.green}${Box.tick}${C.reset} ${C.dim}${msg}${C.reset}`);
  }

  static fail(msg) {
    console.log(`  ${C.red}${Box.cross}${C.reset} ${C.white}${msg}${C.reset}`);
  }

  static warn(msg) {
    console.log(`  ${C.yellow}${Box.warn}${C.reset} ${C.white}${msg}${C.reset}`);
  }

  static info(msg) {
    console.log(`  ${C.blue}${Box.dot}${C.reset} ${C.dim}${msg}${C.reset}`);
  }

  static divider() {
    console.log(`${C.dim}${Box.h.repeat(50)}${C.reset}`);
  }
}

// ----------------------------------------------------------------------
// Validators
// ----------------------------------------------------------------------

const checks = {
  score: 0,
  total: 0,
  add(passed) {
    this.total++;
    if (passed) this.score++;
    return passed;
  }
};

function readSafe(relPath) {
  const fullPath = path.join(process.cwd(), relPath);
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath, 'utf8');
}

function checkFile(relPath, name) {
  const fullPath = path.join(process.cwd(), relPath);
  const exists = fs.existsSync(fullPath);
  if (checks.add(exists)) {
    const kb = (fs.statSync(fullPath).size / 1024).toFixed(2);
    Logger.pass(`${name} exists (${kb} KB)`);
  } else {
    Logger.fail(`${name} is missing (${relPath})`);
  }
}

function analyzeRobots() {
  Logger.section('Robots & Crawlers (robots.txt)');
  const content = readSafe('public/robots.txt');
  if (!content) return Logger.fail('robots.txt not found');

  const tests = [
    { name: 'User-agent directives', req: 'User-agent:' },
    { name: 'Sitemap reference', req: 'Sitemap:' },
    { name: 'GPTBot blocking', req: 'GPTBot' },
    { name: 'Google AI blocking', req: 'Google-Extended' }
  ];

  for (const t of tests) {
    if (checks.add(content.includes(t.req))) Logger.pass(t.name);
    else Logger.warn(`Missing: ${t.name}`);
  }
}

function analyzeSitemap() {
  Logger.section('Sitemap Architecture (sitemap.xml)');
  const content = readSafe('public/sitemap.xml');
  if (!content) return Logger.fail('sitemap.xml not found');

  const tests = [
    { name: 'XML Declaration', req: '<?xml' },
    { name: 'URL Set', req: 'urlset' },
    { name: 'Loc Tags', req: 'loc' }
  ];

  for (const t of tests) {
    if (checks.add(content.includes(t.req))) Logger.pass(t.name);
    else Logger.fail(`Missing: ${t.name}`);
  }

  const count = (content.match(/<url>/g) || []).length;
  Logger.info(`Indexed ${count} URLs`);
}

function analyzeLayout() {
  Logger.section('Metadata & JSON-LD (layout.tsx)');
  const content = readSafe('app/layout.tsx');
  if (!content) return Logger.fail('app/layout.tsx not found');

  const metaTests = [
    { name: 'Canonical URLs', req: 'canonical:' },
    { name: 'Open Graph Config', req: 'openGraph:' },
    { name: 'Twitter Cards', req: 'twitter:' },
    { name: 'Structured Data / JSON-LD', req: 'application/ld+json' },
  ];

  for (const t of metaTests) {
    if (checks.add(content.includes(t.req))) Logger.pass(t.name);
    else Logger.warn(`Missing: ${t.name}`);
  }
}

function analyzeConfig() {
  Logger.section('Next.js Config (next.config.mjs)');
  const content = readSafe('next.config.mjs');
  if (!content) return Logger.fail('next.config.mjs not found');

  const confTests = [
    { name: 'Custom Security Headers', req: 'headers' },
    { name: 'SEO Redirects', req: 'redirects' }
  ];

  for (const t of confTests) {
    if (checks.add(content.includes(t.req))) Logger.pass(t.name);
    else Logger.info(`Optional: ${t.name} not configured`);
  }
}

async function runAudit() {
  console.clear();
  Logger.title('HypaStack SEO Audit');
  
  const start = performance.now();

  Logger.section('Core Assets');
  checkFile('public/robots.txt', 'robots.txt');
  checkFile('public/sitemap.xml', 'sitemap.xml');
  checkFile('public/manifest.json', 'manifest.json');
  console.log();

  analyzeRobots();
  console.log();
  
  analyzeSitemap();
  console.log();
  
  analyzeLayout();
  console.log();
  
  analyzeConfig();
  console.log();

  const ms = Math.round(performance.now() - start);
  const ratio = checks.score / checks.total;
  const percent = Math.round(ratio * 100);

  Logger.divider();
  
  let gradeColor = C.green;
  let verdict = 'READY FOR PRODUCTION';
  
  if (percent < 90) { gradeColor = C.yellow; verdict = 'NEEDS IMPROVEMENT'; }
  if (percent < 70) { gradeColor = C.red; verdict = 'CRITICAL FIXES REQUIRED'; }

  console.log(`\n  ${C.bold}AUDIT SCORE: ${gradeColor}${percent}%${C.reset}  ${C.dim}(${ms}ms)${C.reset}`);
  console.log(`  ${gradeColor}${C.bold}VERDICT:${C.reset} ${gradeColor}${verdict}${C.reset}\n`);

  process.exit(percent >= 70 ? 0 : 1);
}

runAudit().catch(err => {
  console.error(C.red + '\nAudit failed due to an exception:' + C.reset);
  console.error(err);
  process.exit(1);
});
