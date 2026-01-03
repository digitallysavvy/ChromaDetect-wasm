// Utility functions for the ChromaDetect demo

/**
 * Truncates a string to a maximum length
 */
export function truncate(str, len) {
  return str.length > len ? str.slice(0, len) + '...' : str;
}

/**
 * Formats duration in seconds to a human-readable string
 */
export function formatDuration(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

/**
 * Formats file size in bytes to a human-readable string
 */
export function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Fetches GitHub stars count and updates the UI
 */
export async function fetchGitHubStars() {
  try {
    const res = await fetch(
      'https://api.github.com/repos/digitallysavvy/ChromaDetect-wasm'
    );
    if (res.ok) {
      const data = await res.json();
      const stars = data.stargazers_count;
      const starNumEl = document.getElementById('starNum');
      if (starNumEl) {
        starNumEl.textContent =
          stars >= 1000 ? (stars / 1000).toFixed(1) + 'k' : stars;
        const starCountEl = document.getElementById('starCount');
        if (starCountEl) {
          starCountEl.style.display = 'inline-flex';
        }
      }
    }
  } catch (e) {
    /* ignore */
  }
}

/**
 * Sets up drag and drop handlers for the upload card
 */
export function setupDragAndDrop(uploadCard, handleFile) {
  uploadCard.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadCard.classList.add('drag-over');
  });

  uploadCard.addEventListener('dragleave', (e) => {
    uploadCard.classList.remove('drag-over');
  });

  uploadCard.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadCard.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFile(files[0]);
  });
}

/**
 * Sets up file input change handler
 */
export function setupFileInput(fileInput, handleFile) {
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFile(e.target.files[0]);
  });
}

/**
 * Handles file selection and displays video preview
 */
export function handleFile(file, callbacks) {
  if (!file.type.startsWith('video/')) {
    alert('Please select a video file');
    return;
  }

  const url = URL.createObjectURL(file);
  const video = document.getElementById('videoPreview');
  const uploadPrompt = document.getElementById('uploadPrompt');
  const videoPreviewSection = document.getElementById('videoPreviewSection');
  const uploadCard = document.getElementById('uploadCard');

  video.src = url;
  video.onloadedmetadata = () => {
    if (callbacks?.onFileInfo) {
      callbacks.onFileInfo({
        name: file.name,
        duration: video.duration,
        resolution: `${video.videoWidth}×${video.videoHeight}`,
        size: file.size,
      });
    }

    document.getElementById('resultsCard')?.classList.remove('active');

    // Show video preview, hide upload prompt
    if (uploadPrompt) uploadPrompt.style.display = 'none';
    if (videoPreviewSection) videoPreviewSection.style.display = 'block';
    if (uploadCard) uploadCard.classList.add('has-video');
  };

  return file;
}

/**
 * Clears the current video and resets the UI
 */
export function clearVideo() {
  const video = document.getElementById('videoPreview');
  const uploadPrompt = document.getElementById('uploadPrompt');
  const videoPreviewSection = document.getElementById('videoPreviewSection');
  const uploadCard = document.getElementById('uploadCard');

  if (video) video.src = '';
  if (uploadPrompt) uploadPrompt.style.display = 'block';
  if (videoPreviewSection) videoPreviewSection.style.display = 'none';
  if (uploadCard) uploadCard.classList.remove('has-video');
  document.getElementById('resultsCard')?.classList.remove('active');
}
