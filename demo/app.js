/**
 * ChromaDetect Demo Application
 *
 * Main application logic for chromakey detection demo.
 * Uses modern ES6 modules and async/await patterns.
 */

// Import ChromaDetect library (use local path for development if needed)
import { ChromaDetect } from 'chroma-detect';
// import { ChromaDetect } from '../js/dist/chroma-detect.js'; // for local build testing

// Import utility functions for UI handling and formatting
import {
  truncate,
  formatDuration,
  formatSize,
  fetchGitHubStars,
  setupDragAndDrop,
  setupFileInput,
  handleFile as handleFileUtil,
  clearVideo as clearVideoUtil,
} from './utils.js';

// Application state: detector instance and current video file
let detector = null;
let currentVideo = null;

/**
 * Initialize the application:
 * 1. Create and initialize ChromaDetect instance
 * 2. Fetch GitHub stars count
 * 3. Set up drag-and-drop and file input handlers
 */
export const init = async () => {
  // Initialize ChromaDetect: loads WASM module and prepares for detection
  try {
    detector = new ChromaDetect();
    await detector.init();
  } catch (error) {
    console.error('Failed to initialize:', error);
  }

  // Fetch and display GitHub stars count (non-blocking)
  await fetchGitHubStars();

  // Set up UI event handlers for file selection
  const uploadCard = document.getElementById('uploadCard');
  const fileInput = document.getElementById('fileInput');

  // Configure drag-and-drop: updates UI when file is dropped
  setupDragAndDrop(uploadCard, handleFileSelection);

  // Configure file input: updates UI when file is selected via browse dialog
  setupFileInput(fileInput, handleFileSelection);

  // Expose clearVideo function globally for button onclick handler
  window.clearVideo = () => {
    currentVideo = null;
    clearVideoUtil();
  };
};

/**
 * Main detection function: processes the video and detects chromakey color
 *
 * Flow:
 * 1. Validates detector and video are ready
 * 2. Reads detection settings from UI inputs
 * 3. Calls detector.detectFromVideo() with configuration
 * 4. Displays results or error message
 *
 * Exposed globally for button onclick handler
 */
export const processVideo = async () => {
  // Validation: ensure detector is initialized and video is selected
  if (!detector) {
    alert('Initializing...');
    return;
  }
  if (!currentVideo) {
    alert('Select a video first');
    return;
  }

  // Update UI: show loading state
  const btn = document.getElementById('processBtn');
  const text = btn.textContent;
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div>';

  try {
    // Ensure video metadata is loaded before processing
    const video = document.getElementById('videoPreview');
    if (video.readyState < 1) {
      await new Promise((resolve) => {
        video.onloadedmetadata = resolve;
      });
    }

    // Read detection configuration from UI inputs
    const frameSampleCount =
      parseInt(document.getElementById('frameSampleCount').value) || 8;
    const sampleStrategy = document.getElementById('sampleStrategy').value;
    const maxDuration =
      parseInt(document.getElementById('maxDuration').value) || 30;

    // Perform chroma detection: analyzes video frames and returns result
    const result = await detector.detectFromVideo(video, {
      frameSampleCount,
      sampleStrategy,
      maxDuration,
    });

    // Display results or show error if no chromakey found
    if (result) {
      showResults(result);
    } else {
      alert('No chromakey detected');
    }
  } catch (err) {
    alert('Error: ' + err.message);
  } finally {
    // Restore button state regardless of success/failure
    btn.disabled = false;
    btn.textContent = text;
  }
};

/**
 * Display detection results in the UI
 *
 * Updates:
 * - Color swatch background
 * - RGB, HEX, and Hue values
 * - Confidence, Coverage, and Method metrics
 * - Shows results card
 *
 * @param {Object} result - Detection result object with color, confidence, coverage, hue, method
 */
const showResults = (result) => {
  // Update color swatch: visual representation of detected chromakey color
  const colorSwatch = document.getElementById('colorSwatch');
  colorSwatch.style.backgroundColor = `rgb(${result.color.r}, ${result.color.g}, ${result.color.b})`;

  // Display RGB values
  document.getElementById(
    'rgbValue'
  ).textContent = `${result.color.r}, ${result.color.g}, ${result.color.b}`;

  // Convert RGB to HEX format for display
  const hex =
    '#' +
    [result.color.r, result.color.g, result.color.b]
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('');
  document.getElementById('hexValue').textContent = hex;

  // Display hue in degrees
  document.getElementById('hueValue').textContent = `${Math.round(
    result.hue
  )}°`;

  // Display metrics: confidence and coverage as percentages
  document.getElementById('confidenceValue').textContent = `${Math.round(
    result.confidence * 100
  )}%`;
  document.getElementById('coverageValue').textContent = `${Math.round(
    result.coverage * 100
  )}%`;

  // Display detection method used (hybrid, edge, or cluster)
  document.getElementById('methodValue').textContent =
    result.method || 'hybrid';

  // Show results card
  document.getElementById('resultsCard').classList.add('active');
};

// ============================================================================
// UI Helper Functions
// ============================================================================

/**
 * Updates the file info display in the UI
 * @param {Object} info - File information object
 */
const updateFileInfo = (info) => {
  document.getElementById('fileName').textContent = truncate(info.name, 18);
  document.getElementById('duration').textContent = formatDuration(
    info.duration
  );
  document.getElementById('resolution').textContent = info.resolution;
  document.getElementById('fileSize').textContent = formatSize(info.size);
};

/**
 * Handles file selection (used by both drag-and-drop and file input)
 * @param {File} file - The selected video file
 */
const handleFileSelection = (file) => {
  currentVideo = handleFileUtil(file, {
    onFileInfo: updateFileInfo,
  });
};

// ============================================================================
// Application Initialization
// ============================================================================

// Expose processVideo globally for button onclick handler
window.processVideo = processVideo;

// Initialize application on module load
init();
