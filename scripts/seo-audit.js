#!/usr/bin/env node
/**
 * SEO Audit Script for Basedrop
 * Validates critical SEO elements before deployment
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(filePath, description) {
  const fullPath = path.join(process.cwd(), filePath);
  if (fs.existsSync(fullPath)) {
    const stats = fs.statSync(fullPath);
    const size = (stats.size / 1024).toFixed(2);
    log('green', `✓ ${description} exists (${size} KB)`);
    return true;
  } else {
    log('red', `✗ ${description} NOT FOUND at ${filePath}`);
    return false;
  }
}

function checkContent(filePath, patterns, description) {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    log('red', `✗ Cannot check ${description}: file not found`);
    return false;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  let allFound = true;
  
  for (const pattern of patterns) {
    if (content.includes(pattern)) {
      log('green', `  ✓ Contains: ${pattern}`);
    } else {
      log('red', `  ✗ Missing: ${pattern}`);
      allFound = false;
    }
  }
  
  return allFound;
}

function checkRobotsTxt() {
  log('cyan', '\n📋 Checking robots.txt...');
  
  const robotsPath = path.join(process.cwd(), 'public', 'robots.txt');
  if (!fs.existsSync(robotsPath)) {
    log('red', '✗ robots.txt not found!');
    return false;
  }
  
  const content = fs.readFileSync(robotsPath, 'utf8');
  
  // Check for critical elements
  const checks = [
    { pattern: 'User-agent:', name: 'User-agent directives' },
    { pattern: 'Sitemap:', name: 'Sitemap reference' },
    { pattern: 'Host:', name: 'Host directive' },
    { pattern: 'GPTBot', name: 'GPTBot blocking' },
    { pattern: 'ClaudeBot', name: 'ClaudeBot blocking' },
    { pattern: 'Google-Extended', name: 'Google AI blocking' },
  ];
  
  let allGood = true;
  for (const check of checks) {
    if (content.includes(check.pattern)) {
      log('green', `  ✓ ${check.name}`);
    } else {
      log('yellow', `  ⚠ ${check.name} not found`);
      allGood = false;
    }
  }
  
  // Check for invalid directives
  if (content.includes('Content-Signal')) {
    log('red', '  ✗ Invalid directive found: Content-Signal');
    allGood = false;
  }
  
  return allGood;
}

function checkSitemap() {
  log('cyan', '\n🗺️  Checking sitemap.xml...');
  
  const sitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml');
  if (!fs.existsSync(sitemapPath)) {
    log('red', '✗ sitemap.xml not found!');
    return false;
  }
  
  const content = fs.readFileSync(sitemapPath, 'utf8');
  
  // Check for critical elements
  const checks = [
    { pattern: '<?xml version="1.0"', name: 'XML declaration' },
    { pattern: 'urlset', name: 'URL set' },
    { pattern: 'loc', name: 'Location tags' },
    { pattern: 'changefreq', name: 'Change frequency' },
    { pattern: 'priority', name: 'Priority tags' },
  ];
  
  let allGood = true;
  for (const check of checks) {
    if (content.includes(check.pattern)) {
      log('green', `  ✓ ${check.name}`);
    } else {
      log('yellow', `  ⚠ ${check.name} not found`);
      allGood = false;
    }
  }
  
  // Count URLs
  const urlMatches = content.match(/<url>/g);
  const urlCount = urlMatches ? urlMatches.length : 0;
  log('blue', `  ℹ Found ${urlCount} URLs in sitemap`);
  
  return allGood;
}

function checkManifest() {
  log('cyan', '\n📱 Checking manifest.json...');
  
  const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    log('red', '✗ manifest.json not found!');
    return false;
  }
  
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    const checks = [
      { key: 'name', name: 'App name' },
      { key: 'short_name', name: 'Short name' },
      { key: 'description', name: 'Description' },
      { key: 'start_url', name: 'Start URL' },
      { key: 'display', name: 'Display mode' },
      { key: 'icons', name: 'Icons' },
    ];
    
    let allGood = true;
    for (const check of checks) {
      if (manifest[check.key]) {
        log('green', `  ✓ ${check.name}`);
      } else {
        log('red', `  ✗ ${check.name} missing`);
        allGood = false;
      }
    }
    
    return allGood;
  } catch (e) {
    log('red', '  ✗ Invalid JSON in manifest.json');
    return false;
  }
}

function checkStructuredData() {
  log('cyan', '\n📊 Checking structured data setup...');
  
  const layoutPath = path.join(process.cwd(), 'app', 'layout.tsx');
  if (!fs.existsSync(layoutPath)) {
    log('red', '✗ layout.tsx not found!');
    return false;
  }
  
  const content = fs.readFileSync(layoutPath, 'utf8');
  
  const checks = [
    { pattern: 'application/ld+json', name: 'JSON-LD script' },
    { pattern: '@context', name: 'Schema context' },
    { pattern: 'WebSite', name: 'WebSite schema' },
    { pattern: 'Organization', name: 'Organization schema' },
    { pattern: 'WebApplication', name: 'WebApplication schema' },
  ];
  
  let allGood = true;
  for (const check of checks) {
    if (content.includes(check.pattern)) {
      log('green', `  ✓ ${check.name}`);
    } else {
      log('yellow', `  ⚠ ${check.name} not found`);
      allGood = false;
    }
  }
  
  return allGood;
}

function checkMetaTags() {
  log('cyan', '\n🏷️  Checking meta tags setup...');
  
  const layoutPath = path.join(process.cwd(), 'app', 'layout.tsx');
  if (!fs.existsSync(layoutPath)) {
    log('red', '✗ layout.tsx not found!');
    return false;
  }
  
  const content = fs.readFileSync(layoutPath, 'utf8');
  
  const checks = [
    { pattern: 'preconnect', name: 'Preconnect hints' },
    { pattern: 'dns-prefetch', name: 'DNS prefetch' },
    { pattern: 'canonical', name: 'Canonical URL' },
    { pattern: 'openGraph', name: 'Open Graph' },
    { pattern: 'twitter', name: 'Twitter Cards' },
    { pattern: 'viewport', name: 'Viewport' },
  ];
  
  let allGood = true;
  for (const check of checks) {
    if (content.includes(check.pattern)) {
      log('green', `  ✓ ${check.name}`);
    } else {
      log('yellow', `  ⚠ ${check.name} not found`);
      allGood = false;
    }
  }
  
  return allGood;
}

function checkNextConfig() {
  log('cyan', '\n⚙️  Checking next.config.mjs...');
  
  const configPath = path.join(process.cwd(), 'next.config.mjs');
  if (!fs.existsSync(configPath)) {
    log('red', '✗ next.config.mjs not found!');
    return false;
  }
  
  const content = fs.readFileSync(configPath, 'utf8');
  
  const checks = [
    { pattern: 'headers', name: 'Custom headers' },
    { pattern: 'X-Robots-Tag', name: 'Robots tag header' },
    { pattern: 'redirects', name: 'SEO redirects' },
  ];
  
  let allGood = true;
  for (const check of checks) {
    if (content.includes(check.pattern)) {
      log('green', `  ✓ ${check.name}`);
    } else {
      log('yellow', `  ⚠ ${check.name} not found`);
      allGood = false;
    }
  }
  
  return allGood;
}

function checkCanonicalUrls() {
  log('cyan', '\n🔗 Checking canonical URLs...');
  
  const layoutPath = path.join(process.cwd(), 'app', 'layout.tsx');
  if (!fs.existsSync(layoutPath)) {
    log('red', '✗ layout.tsx not found!');
    return false;
  }
  
  const content = fs.readFileSync(layoutPath, 'utf8');
  
  const checks = [
    { pattern: 'canonical:', name: 'Canonical URL in metadata' },
    { pattern: 'alternates:', name: 'Alternates config' },
    { pattern: 'hrefLang', name: 'Hreflang tags' },
  ];
  
  let allGood = true;
  for (const check of checks) {
    if (content.includes(check.pattern)) {
      log('green', `  ✓ ${check.name}`);
    } else {
      log('yellow', `  ⚠ ${check.name} not found`);
      allGood = false;
    }
  }
  
  return allGood;
}

function generateReport() {
  log('magenta', '\n' + '='.repeat(50));
  log('magenta', '           SEO AUDIT REPORT');
  log('magenta', '='.repeat(50));
  
  let score = 0;
  let total = 0;
  
  // Check critical files
  log('cyan', '\n📁 Critical Files:');
  total += 5;
  if (checkFile('public/robots.txt', 'robots.txt')) score++;
  if (checkFile('public/sitemap.xml', 'sitemap.xml')) score++;
  if (checkFile('public/manifest.json', 'manifest.json')) score++;
  if (checkFile('public/browserconfig.xml', 'browserconfig.xml')) score++;
  if (checkFile('app/layout.tsx', 'layout.tsx')) score++;
  
  // Run detailed checks
  if (checkRobotsTxt()) score++;
  total++;
  
  if (checkSitemap()) score++;
  total++;
  
  if (checkManifest()) score++;
  total++;
  
  if (checkStructuredData()) score++;
  total++;
  
  if (checkMetaTags()) score++;
  total++;
  
  if (checkNextConfig()) score++;
  total++;
  
  if (checkCanonicalUrls()) score++;
  total++;
  
  // Final score
  const percentage = Math.round((score / total) * 100);
  
  log('magenta', '\n' + '='.repeat(50));
  log('cyan', `SEO SCORE: ${percentage}/100`);
  
  if (percentage >= 90) {
    log('green', '🎉 Excellent! Your SEO is ready for production!');
  } else if (percentage >= 70) {
    log('yellow', '⚠️  Good, but there are some improvements needed.');
  } else {
    log('red', '❌ SEO needs significant improvements before production.');
  }
  
  log('magenta', '='.repeat(50) + '\n');
  
  return percentage;
}

// Run the audit
const score = generateReport();

// Exit with appropriate code
process.exit(score >= 70 ? 0 : 1);
