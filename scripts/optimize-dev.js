#!/usr/bin/env node

/**
 * Development Optimization Script
 * Helps optimize the development environment for faster iteration
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function cleanCaches() {
  log('🧹 Cleaning development caches...', 'yellow');
  
  const cachePaths = [
    '.next',
    'node_modules/.cache',
    '.turbo',
    'storybook-static'
  ];
  
  cachePaths.forEach(cachePath => {
    if (fs.existsSync(cachePath)) {
      exec(`rm -rf ${cachePath}`, (error) => {
        if (error) {
          log(`❌ Failed to clean ${cachePath}: ${error.message}`, 'red');
        } else {
          log(`✅ Cleaned ${cachePath}`, 'green');
        }
      });
    }
  });
}

function checkNodeModules() {
  log('📦 Checking node_modules optimization...', 'blue');
  
  exec('pnpm store prune', (error, stdout, stderr) => {
    if (error) {
      log('❌ Failed to prune pnpm store', 'red');
    } else {
      log('✅ Pruned pnpm store', 'green');
    }
  });
}

function optimizePackages() {
  log('⚡ Optimizing package dependencies...', 'blue');
  
  // Check for large packages that might slow down development
  const largePackages = [
    '@storybook',
    '@playwright',
    'three',
    'framer-motion'
  ];
  
  log('💡 Consider lazy loading these heavy packages in development:', 'yellow');
  largePackages.forEach(pkg => {
    log(`   - ${pkg}`, 'yellow');
  });
}

function displayPerformanceTips() {
  log('\n🚀 Performance Tips for Faster Development:', 'green');
  log('1. Use `pnpm dev` for the fastest start', 'blue');
  log('2. Use `pnpm dev:fast` for HTTPS development (faster in some cases)', 'blue');
  log('3. Close unused browser tabs to reduce memory usage', 'blue');
  log('4. Use React DevTools Profiler to identify slow components', 'blue');
  log('5. Consider using --experimental-app-dir for better performance', 'blue');
  log('6. Use dynamic imports for heavy components/libraries', 'blue');
  log('\n📊 Monitor your app with:', 'green');
  log('   - Next.js Bundle Analyzer: `npx @next/bundle-analyzer`', 'blue');
  log('   - Performance tab in browser DevTools', 'blue');
}

function main() {
  log('🛠️  Development Environment Optimizer', 'green');
  log('=====================================\n', 'green');
  
  cleanCaches();
  setTimeout(() => {
    checkNodeModules();
    optimizePackages();
    displayPerformanceTips();
  }, 1000);
}

if (require.main === module) {
  main();
}

module.exports = { cleanCaches, checkNodeModules, optimizePackages }; 