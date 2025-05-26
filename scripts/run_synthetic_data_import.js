const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_CLEANING = process.argv.includes('--skip-cleaning');

console.log('===========================================');
console.log('Synthetic Data Import Process');
console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE IMPORT'}`);
console.log('===========================================\n');

// Helper function to run a script
function runScript(scriptPath, args = []) {
  return new Promise((resolve, reject) => {
    const scriptName = path.basename(scriptPath);
    console.log(`\n📋 Running ${scriptName}...`);
    console.log('-------------------------------------------');
    
    const child = spawn('node', [scriptPath, ...args], {
      stdio: 'inherit'
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`${scriptName} exited with code ${code}`));
      } else {
        console.log(`✅ ${scriptName} completed successfully\n`);
        resolve();
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

async function main() {
  try {
    // Step 1: Clean the synthetic data (unless skipped)
    if (!SKIP_CLEANING) {
      console.log('Step 1: Cleaning synthetic data');
      await runScript(path.join(__dirname, 'clean_synthetic_data.js'));
    } else {
      console.log('Step 1: Skipping data cleaning (--skip-cleaning flag used)');
    }

    // Step 2: Run the import (with dry-run flag if specified)
    console.log(`Step 2: Importing synthetic data ${DRY_RUN ? '(DRY RUN)' : ''}`);
    const importArgs = DRY_RUN ? ['--dry-run'] : [];
    await runScript(path.join(__dirname, 'import_synthetic_data.js'), importArgs);

    // Step 3: Check results
    console.log('Step 3: Checking import results');
    const errorLogPath = path.join(__dirname, 'import_errors.log');
    
    if (fs.existsSync(errorLogPath)) {
      const errorLog = JSON.parse(fs.readFileSync(errorLogPath, 'utf8'));
      
      console.log('\n=== Final Import Summary ===');
      console.log(`Total Records: ${errorLog.summary.totalRecords}`);
      console.log(`Processed: ${errorLog.summary.processedRecords}`);
      console.log(`Errors: ${errorLog.errorCount}`);
      console.log(`Warnings: ${errorLog.warningCount}`);
      
      if (errorLog.errorCount > 0) {
        console.log('\n⚠️  Import completed with errors. Check import_errors.log for details.');
        
        // Display first few errors for quick review
        console.log('\nFirst 5 errors:');
        errorLog.errors.slice(0, 5).forEach((error, index) => {
          console.log(`${index + 1}. ${error.type}: ${error.message}`);
        });
        
        if (errorLog.errors.length > 5) {
          console.log(`... and ${errorLog.errors.length - 5} more errors in the log file.`);
        }
      } else {
        console.log('\n✅ Import completed successfully with no errors!');
      }
    } else {
      console.log('\n❌ No error log found. Import may have failed to run.');
    }

    // Step 4: Provide next steps
    console.log('\n=== Next Steps ===');
    if (DRY_RUN) {
      console.log('1. Review the dry run results above');
      console.log('2. If everything looks good, run without --dry-run flag:');
      console.log('   node scripts/run_synthetic_data_import.js');
    } else {
      console.log('1. Review the import_errors.log for any issues');
      console.log('2. If there were errors, you can:');
      console.log('   - Fix the source data and re-run');
      console.log('   - Manually correct specific records in the database');
      console.log('3. Verify the data in your application');
    }

  } catch (error) {
    console.error('\n❌ Import process failed:', error.message);
    process.exit(1);
  }
}

// Run the main function
main(); 