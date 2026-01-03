# Video Test Assets

This folder contains real video files for testing the chromakey detection functionality of the chroma-detect WASM library.

## Files

- **index.html** - Main demo application
- **test-runner.html** - Interactive browser-based test runner
- **expected-results.json** - Configuration file with expected chromakey values
- **run-video-tests.js** - Node.js script for automated testing (requires browser environment)
- **\*.mp4** - Test video files

## Quick Start with Vite

This demo uses [Vite](https://vitejs.dev/) as the build system and imports `chroma-detect` via npm package.

### 1. Install Dependencies

```bash
cd demo
npm install
```

This will install Vite and link the local `chroma-detect` package from `../js`.

### 2. Build the Library (if not already built)

```bash
cd ../js
npm run build
cd ../demo
```

### 3. Run Development Server

```bash
npm run dev
```

This will start Vite's dev server (usually at `http://localhost:3000`) with hot module replacement.

### 4. Build for Production

```bash
npm run build
```

This creates an optimized build in the `dist/` folder.

### 5. Preview Production Build

```bash
npm run preview
```

## Setup Instructions

### 1. Get Expected Chromakey Values

For each video in this folder, you need to determine the expected chromakey color:

1. Open the video in **Photoshop** (or another tool with a color picker)
2. Sample the chromakey background color
3. Note down the RGB values and Hue

### 2. Fill in `expected-results.json`

Open `expected-results.json` and fill in the values for each video:

```json
{
  "filename": "147939-793104681_tiny_square.mp4",
  "description": "Add a description of what's in this video",
  "expectedChromakey": {
    "color": {
      "r": 0, // Fill in Red value (0-255)
      "g": 177, // Fill in Green value (0-255)
      "b": 64, // Fill in Blue value (0-255)
      "hex": "#00b140" // Fill in hex code for reference
    },
    "hue": 145, // Fill in Hue value (0-360)
    "notes": "Green screen with slight lighting variation"
  }
}
```

#### Tolerance Settings

You can adjust the tolerance values if needed:

- **colorTolerance**: Maximum RGB distance allowed (default: 10)
- **hueTolerance**: Maximum hue difference in degrees (default: 5)
- **minConfidence**: Minimum confidence score (default: 0.7)
- **minCoverage**: Minimum coverage percentage (default: 0.1)

## Running Tests

### Option 1: Using Vite (Recommended)

1. Install dependencies and start the dev server:

   ```bash
   npm install
   npm run dev
   ```

2. Navigate to the test runner:

   ```
   http://localhost:3000/test-runner.html
   ```

3. Click **"Run All Tests"** to execute the detection on all videos

4. Review the results:
   - ✅ Green cards = tests passed
   - ❌ Red cards = tests failed
   - Each card shows detailed comparison of detected vs expected values

### Option 2: Static Server (Legacy)

If you prefer not to use Vite, you can still use a static server:

1. Make sure you've built the WASM library:

   ```bash
   cd ../js
   npm run build
   ```

2. Serve the test directory with a local server:

   ```bash
   # Using Python 3
   python3 -m http.server 8000

   # Or using Node.js http-server
   npx http-server -p 8000
   ```

3. Open in your browser:
   ```
   http://localhost:8000/demo/test-runner.html
   ```

### Option 2: Automated Testing

The Node.js script (`run-video-tests.js`) is provided for CI/CD integration, but it requires a headless browser environment (e.g., Puppeteer) to actually process videos.

```bash
node run-video-tests.js
```

## Understanding Test Results

The test runner compares the detected chromakey against your expected values:

### Color Comparison

- Shows the detected vs expected RGB color swatches
- Calculates Euclidean distance in RGB space
- **Pass** if distance ≤ colorTolerance

### Hue Comparison

- Compares hue values in degrees (0-360)
- Handles wraparound (359° is close to 0°)
- **Pass** if difference ≤ hueTolerance

### Confidence

- Detection algorithm's confidence score (0-1)
- **Pass** if confidence ≥ minConfidence

### Coverage

- Percentage of frame covered by chromakey (0-1)
- **Pass** if coverage ≥ minCoverage

## Test Configuration

Each video has configurable detection settings:

```json
"testConfig": {
  "frameSampleCount": 8,      // Number of frames to sample
  "sampleStrategy": "uniform", // "uniform" or "keyframes"
  "maxDuration": 30            // Max seconds of video to analyze
}
```

## Troubleshooting

### "Failed to load expected-results.json"

- Make sure the JSON file is valid
- Check for missing commas or brackets
- Use a JSON validator

### "No chromakey detected"

- The video might not have a chromakey background
- Try adjusting detection config in `expected-results.json`
- Check the video is loading correctly (see browser console)

### CORS Errors

- Make sure you're serving the files via HTTP (not opening file:// directly)
- All files must be served from the same origin
- When using Vite, this is handled automatically

### Module Import Errors

- Make sure you've run `npm install` in the demo folder
- Ensure the `chroma-detect` package is built: `cd ../js && npm run build`
- Check that `node_modules/chroma-detect` exists and contains the dist folder

### Tests timing out

- Increase the timeout in `VideoProcessor.ensureVideoReady` if videos are very large
- Check your network connection if loading remote videos
- Try reducing `frameSampleCount` for faster tests

## Adding New Test Videos

1. Add the video file to this folder
2. Add a new entry in `expected-results.json`:
   ```json
   {
     "filename": "your-video.mp4",
     "description": "Description of the video",
     "expectedChromakey": {
       "color": { "r": null, "g": null, "b": null, "hex": "" },
       "hue": null,
       "notes": ""
     },
     "testConfig": {
       "frameSampleCount": 8,
       "sampleStrategy": "uniform",
       "maxDuration": 30
     },
     "tolerances": {
       "colorTolerance": 10,
       "hueTolerance": 5,
       "minConfidence": 0.7,
       "minCoverage": 0.1
     }
   }
   ```
3. Fill in the expected values from Photoshop
4. Run the tests

## Contributing

When adding test videos:

- Use descriptive filenames
- Keep file sizes reasonable (under 10MB if possible)
- Document any special characteristics in the description
- Set appropriate tolerance values based on video quality

## License

Test videos should be properly licensed. Ensure you have rights to use any videos in this folder for testing purposes.
