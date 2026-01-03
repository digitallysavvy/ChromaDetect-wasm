#!/usr/bin/env node

/**
 * Real video test runner for chroma-detect WASM library
 *
 * This script:
 * 1. Reads the expected-results.json file
 * 2. Runs chromakey detection on each video
 * 3. Compares results with expected values
 * 4. Reports pass/fail with detailed output
 *
 * Usage:
 *   node run-video-tests.js
 *   node run-video-tests.js --video=filename.mp4
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const videoFilter = args.find(arg => arg.startsWith('--video='))?.split('=')[1];

// Color utilities
function rgbToHue(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  if (delta === 0) return 0;

  let hue;
  if (max === r) {
    hue = ((g - b) / delta) % 6;
  } else if (max === g) {
    hue = (b - r) / delta + 2;
  } else {
    hue = (r - g) / delta + 4;
  }

  hue = Math.round(hue * 60);
  if (hue < 0) hue += 360;

  return hue;
}

function colorDistance(color1, color2) {
  const dr = color1.r - color2.r;
  const dg = color1.g - color2.g;
  const db = color1.b - color2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function hueDifference(hue1, hue2) {
  const diff = Math.abs(hue1 - hue2);
  return Math.min(diff, 360 - diff);
}

// Test result utilities
function formatColor(color) {
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

function formatTestResult(video, result, expected) {
  const lines = [];
  lines.push(`\n${'='.repeat(60)}`);
  lines.push(`VIDEO: ${video.filename}`);
  lines.push(`${'='.repeat(60)}`);

  if (result.error) {
    lines.push(`❌ ERROR: ${result.error}`);
    return lines.join('\n');
  }

  if (!result.detected) {
    lines.push('❌ FAILED: No chromakey detected');
    lines.push(`   Expected: ${formatColor(expected.color)} (hue: ${expected.hue}°)`);
    return lines.join('\n');
  }

  lines.push(`Detected Color: ${formatColor(result.detected.color)}`);
  lines.push(`Expected Color: ${formatColor(expected.color)}`);
  lines.push(`Color Distance: ${result.colorDist.toFixed(2)}`);
  lines.push('');
  lines.push(`Detected Hue: ${result.detected.hue}°`);
  lines.push(`Expected Hue: ${expected.hue}°`);
  lines.push(`Hue Difference: ${result.hueDiff.toFixed(2)}°`);
  lines.push('');
  lines.push(`Confidence: ${(result.detected.confidence * 100).toFixed(1)}%`);
  lines.push(`Coverage: ${(result.detected.coverage * 100).toFixed(1)}%`);

  if (result.detected.method) {
    lines.push(`Method: ${result.detected.method}`);
  }

  lines.push('');

  const colorPass = result.colorDist <= video.tolerances.colorTolerance;
  const huePass = result.hueDiff <= video.tolerances.hueTolerance;
  const confidencePass = result.detected.confidence >= video.tolerances.minConfidence;
  const coveragePass = result.detected.coverage >= video.tolerances.minCoverage;

  lines.push(`Color Match: ${colorPass ? '✅ PASS' : '❌ FAIL'} (tolerance: ${video.tolerances.colorTolerance})`);
  lines.push(`Hue Match: ${huePass ? '✅ PASS' : '❌ FAIL'} (tolerance: ${video.tolerances.hueTolerance}°)`);
  lines.push(`Confidence: ${confidencePass ? '✅ PASS' : '❌ FAIL'} (min: ${video.tolerances.minConfidence})`);
  lines.push(`Coverage: ${coveragePass ? '✅ PASS' : '❌ FAIL'} (min: ${video.tolerances.minCoverage})`);

  const allPass = colorPass && huePass && confidencePass && coveragePass;
  lines.push('');
  lines.push(`OVERALL: ${allPass ? '✅ PASS' : '❌ FAIL'}`);

  if (expected.notes) {
    lines.push('');
    lines.push(`Notes: ${expected.notes}`);
  }

  return lines.join('\n');
}

async function main() {
  console.log('🎬 Chroma-Detect Video Test Runner\n');

  // Load expected results
  const expectedResultsPath = join(__dirname, 'expected-results.json');
  let expectedResults;

  try {
    const data = await readFile(expectedResultsPath, 'utf8');
    expectedResults = JSON.parse(data);
  } catch (error) {
    console.error('❌ Failed to load expected-results.json:', error.message);
    console.error('\nMake sure the file exists and contains valid JSON.');
    process.exit(1);
  }

  // Filter videos if specified
  let videosToTest = expectedResults.videos;
  if (videoFilter) {
    videosToTest = videosToTest.filter(v => v.filename === videoFilter);
    if (videosToTest.length === 0) {
      console.error(`❌ No video found with filename: ${videoFilter}`);
      process.exit(1);
    }
  }

  // Check if expected values are filled in
  const missingValues = videosToTest.filter(v =>
    v.expectedChromakey.color.r === null ||
    v.expectedChromakey.hue === null
  );

  if (missingValues.length > 0) {
    console.warn('⚠️  WARNING: Some videos have missing expected values:\n');
    missingValues.forEach(v => console.warn(`   - ${v.filename}`));
    console.warn('\nPlease fill in the expected values in expected-results.json');
    console.warn('after checking the chromakey colors in Photoshop or another tool.\n');
  }

  // Check if we're in a browser or Node environment
  const isBrowser = typeof window !== 'undefined';

  if (!isBrowser) {
    console.log('📋 Test videos loaded:');
    videosToTest.forEach(v => console.log(`   - ${v.filename}`));
    console.log('\n⚠️  This script needs to run in a browser environment to process videos.');
    console.log('Consider creating an HTML test page that imports this module.\n');
    console.log('Example structure:');
    console.log('  1. Create test-videos.html in the demo folder');
    console.log('  2. Import the chroma-detect library');
    console.log('  3. Load and process each video');
    console.log('  4. Display results in the browser\n');
    process.exit(0);
  }

  console.log('🚀 Starting video tests...\n');

  const results = [];

  for (const video of videosToTest) {
    const videoPath = join(__dirname, video.filename);

    try {
      // This will be implemented when running in browser
      console.log(`Processing ${video.filename}...`);

      // Placeholder for actual detection
      const result = {
        detected: null,
        error: 'Not implemented in Node.js - run in browser',
      };

      results.push({
        video,
        result,
      });

    } catch (error) {
      results.push({
        video,
        result: {
          error: error.message,
        },
      });
    }
  }

  // Print results
  console.log('\n📊 TEST RESULTS\n');

  results.forEach(({ video, result }) => {
    console.log(formatTestResult(video, result, video.expectedChromakey));
  });

  // Summary
  const passed = results.filter(r => !r.result.error && r.result.detected).length;
  const failed = results.length - passed;

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log('='.repeat(60) + '\n');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
