/**
 * NeuroScan AI — Prediction Engine & Dashboard Controller
 * Pure Vanilla JavaScript & Fetch API implementation.
 */

// ==========================================================================
// 1. BACKEND API CONFIGURATION
// ==========================================================================
const CONFIG = {
  // IMPORTANT:
  // Change API_URL according to your Flask or FastAPI backend endpoint.
  // Default Flask development server runs on: http://127.0.0.1:5000/predict
  // Default FastAPI development server runs on: http://127.0.0.1:8000/predict
  API_URL: "http://127.0.0.1:5000/predict",

  // FormData field name expected by the backend for the uploaded file:
  // Flask: request.files['image'] -> FIELD_NAME: 'image'
  // FastAPI: image: UploadFile = File(...) -> FIELD_NAME: 'image'
  FIELD_NAME: "image",

  // Request timeout in milliseconds (30 seconds)
  REQUEST_TIMEOUT_MS: 30000,

  // Maximum allowed image file size in bytes (10 Megabytes)
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,

  // Allowed MIME types
  ALLOWED_MIME_TYPES: ["image/jpeg", "image/png", "image/jpg"]
};

// ==========================================================================
// 2. BACKEND RESPONSE ADAPTER / MAPPER
// ==========================================================================
/**
 * Adapts whatever JSON payload the Python backend returns into a normalized
 * object used by the UI renderer.
 *
 * Customize the mappings below if your backend uses different property names.
 *
 * @param {Object} rawResponse - The JSON object returned by response.json()
 * @returns {Object} Normalized prediction object:
 *   {
 *     className: string,          // e.g. "Glioma", "Meningioma", "No Tumor", "Pituitary"
 *     rawClass: string,           // e.g. "glioma", "notumor"
 *     confidencePercent: number,  // e.g. 94.7 (0 - 100)
 *     probabilities: Object|null  // e.g. { "Glioma": 94.7, "Meningioma": 2.1, ... } or null
 *   }
 */
function adaptBackendResponse(rawResponse) {
  if (!rawResponse || typeof rawResponse !== "object") {
    throw new Error("Invalid response format: Received empty or non-object response from server.");
  }

  // 1. Resolve Class / Label
  // Checks common keys: class, prediction, predicted_class, label, tumor_type
  let rawClass = 
    rawResponse.class ||
    rawResponse.prediction ||
    rawResponse.predicted_class ||
    rawResponse.label ||
    rawResponse.tumor_type ||
    "";

  if (typeof rawClass !== "string" || !rawClass.trim()) {
    throw new Error("Backend response is missing predicted class field ('class' or 'prediction').");
  }

  rawClass = rawClass.trim().toLowerCase();

  // Map raw class key to standardized display title
  const CLASS_NAME_MAP = {
    glioma: "Glioma",
    meningioma: "Meningioma",
    notumor: "No Tumor",
    "no tumor": "No Tumor",
    pituitary: "Pituitary"
  };

  const className = CLASS_NAME_MAP[rawClass] || (rawClass.charAt(0).toUpperCase() + rawClass.slice(1));

  // 2. Resolve Confidence
  // Checks common keys: confidence, probability, prob, score
  let rawConfidence = 
    rawResponse.confidence !== undefined ? rawResponse.confidence :
    rawResponse.probability !== undefined ? rawResponse.probability :
    rawResponse.prob !== undefined ? rawResponse.prob :
    rawResponse.score;

  let confidencePercent = 0;
  if (typeof rawConfidence === "number") {
    // If backend returns fractional probability 0.0 - 1.0 (e.g. 0.947), multiply by 100
    confidencePercent = rawConfidence <= 1.0 ? rawConfidence * 100 : rawConfidence;
  } else if (typeof rawConfidence === "string") {
    const parsed = parseFloat(rawConfidence.replace("%", "").trim());
    if (!isNaN(parsed)) {
      confidencePercent = parsed <= 1.0 ? parsed * 100 : parsed;
    }
  }

  // Clamp confidence to 0 - 100 and round to 2 decimals
  confidencePercent = Math.min(100, Math.max(0, Math.round(confidencePercent * 100) / 100));

  // 3. Resolve Class Probabilities (if backend returns full distribution)
  // Checks keys: probabilities, class_probabilities, all_classes, prob_distribution
  let rawProbabilities = 
    rawResponse.probabilities ||
    rawResponse.class_probabilities ||
    rawResponse.all_classes ||
    rawResponse.prob_distribution ||
    null;

  let probabilities = null;
  if (rawProbabilities && typeof rawProbabilities === "object") {
    probabilities = {};
    for (const [key, val] of Object.entries(rawProbabilities)) {
      let numVal = typeof val === "number" ? val : parseFloat(val);
      if (!isNaN(numVal)) {
        // Convert fractional 0-1 to percentage if needed
        if (numVal <= 1.0 && numVal > 0) numVal = numVal * 100;
        const normalizedKey = CLASS_NAME_MAP[key.toLowerCase()] || key;
        probabilities[normalizedKey] = Math.round(numVal * 10) / 10;
      }
    }
  }

  return {
    className,
    rawClass,
    confidencePercent,
    probabilities
  };
}

// ==========================================================================
// 3. DASHBOARD STATE & DOM ELEMENT REFS
// ==========================================================================
const state = {
  selectedFile: null,
  isAnalyzing: false
};

// DOM References
const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("file-input");
const btnSelectImage = document.getElementById("btn-select-image");
const previewContainer = document.getElementById("preview-container");
const previewImg = document.getElementById("preview-img");
const previewFileName = document.getElementById("preview-file-name");
const previewFileSize = document.getElementById("preview-file-size");
const btnRemoveImage = document.getElementById("btn-remove-image");
const btnAnalyze = document.getElementById("btn-analyze");
const toastMsg = document.getElementById("toast-msg");

// Result View States
const resultIdleState = document.getElementById("result-idle-state");
const resultLoadingState = document.getElementById("result-loading-state");
const resultDisplayState = document.getElementById("result-display-state");
const verdictBox = document.getElementById("verdict-box");
const verdictClassText = document.getElementById("verdict-class-text");
const verdictConfidenceNum = document.getElementById("verdict-confidence-num");
const confidenceBarFill = document.getElementById("confidence-bar-fill");
const probChartSection = document.getElementById("prob-chart-section");
const probBarsList = document.getElementById("prob-bars-list");
const btnResetAnalysis = document.getElementById("btn-reset-analysis");
const resultTimestamp = document.getElementById("result-timestamp");

// ==========================================================================
// 4. EVENT LISTENERS INITIALIZATION
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  setupUploadInteractions();
  setupSampleScans();
  setupAnalysisAction();
  setupResetAction();
});

/**
 * Attaches drag & drop and file input change events
 */
function setupUploadInteractions() {
  if (!dropzone || !fileInput) return;

  // Click on dropzone or Browse button triggers hidden file input
  dropzone.addEventListener("click", () => fileInput.click());
  btnSelectImage?.addEventListener("click", (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  // File chosen via system dialog
  fileInput.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelected(file);
  });

  // Drag and drop events
  ["dragenter", "dragover"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add("drag-over");
    });
  });

  ["dragleave", "dragend"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove("drag-over");
    });
  });

  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.remove("drag-over");
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFileSelected(file);
  });

  // Remove selected image
  btnRemoveImage?.addEventListener("click", () => {
    resetUploadState();
  });
}

/**
 * Handles preset sample scan buttons for quick 1-click testing
 */
function setupSampleScans() {
  const sampleButtons = document.querySelectorAll(".btn-sample");
  sampleButtons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      const sampleUrl = btn.getAttribute("data-sample");
      const sampleName = btn.getAttribute("data-name") || "sample_mri.jpg";
      if (!sampleUrl) return;

      showToast("Loading sample MRI image...", "info");
      try {
        const response = await fetch(sampleUrl);
        if (!response.ok) throw new Error("Could not fetch sample scan asset.");
        const blob = await response.blob();
        const file = new File([blob], sampleName, { type: "image/jpeg" });
        handleFileSelected(file);
        hideToast();
      } catch (err) {
        showToast("Unable to load sample image. Please upload a file manually.", "error");
      }
    });
  });
}

// ==========================================================================
// 5. FILE VALIDATION & PREVIEW LOGIC
// ==========================================================================
/**
 * Validates selected file and renders the image preview
 * @param {File} file
 */
function handleFileSelected(file) {
  hideToast();

  // 1. Check for empty file
  if (!file || file.size === 0) {
    showToast("Selected file is empty. Please select a valid MRI image.", "error");
    return;
  }

  // 2. Validate MIME type
  const isImageMime = CONFIG.ALLOWED_MIME_TYPES.includes(file.type);
  const hasImageExtension = /\.(jpe?g|png)$/i.test(file.name);
  if (!isImageMime && !hasImageExtension) {
    showToast("Invalid file format. Only JPG, JPEG, and PNG images are supported.", "error");
    return;
  }

  // 3. Validate file size limit
  if (file.size > CONFIG.MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    showToast(`File size (${sizeMb} MB) exceeds maximum allowed limit of 10 MB.`, "error");
    return;
  }

  state.selectedFile = file;

  // Read file as Data URL to preview
  const reader = new FileReader();
  reader.onload = (e) => {
    if (previewImg) previewImg.src = e.target.result;
    if (previewFileName) previewFileName.textContent = file.name;
    if (previewFileSize) previewFileSize.textContent = formatBytes(file.size);

    // Switch views: hide dropzone box, show preview container
    dropzone.style.display = "none";
    previewContainer.classList.add("active");

    // Enable Analyze button
    if (btnAnalyze) btnAnalyze.disabled = false;
  };
  reader.onerror = () => {
    showToast("Failed to read the selected image file.", "error");
  };
  reader.readAsDataURL(file);
}

/**
 * Resets uploaded image and switches back to the dropzone
 */
function resetUploadState() {
  state.selectedFile = null;
  if (fileInput) fileInput.value = "";
  if (previewImg) previewImg.src = "";
  if (dropzone) dropzone.style.display = "flex";
  if (previewContainer) previewContainer.classList.remove("active");
  hideToast();
}

// ==========================================================================
// 6. BACKEND API INFERENCE INTEGRATION
// ==========================================================================
/**
 * Sets up the "Analyze MRI" button click handler
 */
function setupAnalysisAction() {
  btnAnalyze?.addEventListener("click", async () => {
    if (!state.selectedFile || state.isAnalyzing) return;
    await executePrediction();
  });
}

/**
 * Performs asynchronous Fetch request to the Python backend API
 */
async function executePrediction() {
  state.isAnalyzing = true;
  btnAnalyze.disabled = true;
  hideToast();

  // Show loading radar spinner in result card
  showResultState("loading");

  // Construct standard FormData multipart body
  const formData = new FormData();
  formData.append(CONFIG.FIELD_NAME, state.selectedFile);

  // Setup abort controller for timeout safety
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(CONFIG.API_URL, {
      method: "POST",
      body: formData,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // Handle non-2xx HTTP status codes gracefully
    if (!response.ok) {
      let serverErrorDetail = "";
      try {
        const errJson = await response.json();
        serverErrorDetail = errJson.error || errJson.message || errJson.detail || "";
      } catch (_) {
        // Response was not JSON
      }

      if (response.status === 400) {
        throw new Error(serverErrorDetail || "Server rejected request (HTTP 400 Bad Request). Check image encoding.");
      } else if (response.status === 404) {
        throw new Error(`Endpoint not found (HTTP 404). Check API_URL (${CONFIG.API_URL}).`);
      } else if (response.status === 500) {
        throw new Error(serverErrorDetail || "Internal server error occurred in Python backend (HTTP 500).");
      } else {
        throw new Error(`Server returned HTTP ${response.status}: ${serverErrorDetail || response.statusText}`);
      }
    }

    // Parse JSON
    let resultJson;
    try {
      resultJson = await response.json();
    } catch (parseErr) {
      throw new Error("Unable to parse server response as JSON. Verify backend returns valid application/json.");
    }

    // Adapt to standard format
    const normalizedResult = adaptBackendResponse(resultJson);

    // Render results
    renderPredictionResult(normalizedResult);
  } catch (error) {
    clearTimeout(timeoutId);
    handlePredictionError(error);
  } finally {
    state.isAnalyzing = false;
    btnAnalyze.disabled = false;
  }
}

/**
 * Renders the prediction results onto the result card
 * @param {Object} result - Normalized prediction object
 */
function renderPredictionResult(result) {
  const isNoTumor = result.rawClass.includes("notumor") || result.rawClass.includes("no tumor");

  // 1. Verdict Class Text
  if (verdictClassText) {
    verdictClassText.textContent = result.className;
  }

  // 2. Verdict Style: Positive (green) for No Tumor vs Attention (amber) for Tumors
  if (verdictBox) {
    verdictBox.className = "prediction-verdict-box";
    if (isNoTumor) {
      verdictBox.classList.add("verdict-positive");
    } else {
      verdictBox.classList.add("verdict-attention");
    }
  }

  // 3. Confidence percentage & progress bar
  if (verdictConfidenceNum) {
    verdictConfidenceNum.textContent = `${result.confidencePercent.toFixed(1)}%`;
  }
  if (confidenceBarFill) {
    confidenceBarFill.style.width = "0%";
    setTimeout(() => {
      confidenceBarFill.style.width = `${result.confidencePercent}%`;
    }, 50);
  }

  // 4. Horizontal Probability Distribution Chart (if backend provided values)
  if (result.probabilities && probBarsList && probChartSection) {
    probBarsList.innerHTML = "";
    probChartSection.style.display = "flex";

    for (const [clsName, probVal] of Object.entries(result.probabilities)) {
      const isWinner = clsName.toLowerCase() === result.className.toLowerCase();
      const row = document.createElement("div");
      row.className = `prob-row ${isWinner ? "active-class" : ""}`;
      row.innerHTML = `
        <span class="prob-name">${escapeHtml(clsName)}</span>
        <div class="prob-track">
          <div class="prob-fill" style="width: 0%;"></div>
        </div>
        <span class="prob-val">${probVal.toFixed(1)}%</span>
      `;
      probBarsList.appendChild(row);

      // Trigger width animation
      setTimeout(() => {
        const fillEl = row.querySelector(".prob-fill");
        if (fillEl) fillEl.style.width = `${Math.min(100, Math.max(0, probVal))}%`;
      }, 80);
    }
  } else if (probChartSection) {
    // Hide chart if backend only returns top-1 class without probabilities array
    probChartSection.style.display = "none";
  }

  // 5. Update Timestamp
  if (resultTimestamp) {
    const now = new Date();
    resultTimestamp.textContent = `Analyzed at ${now.toLocaleTimeString()}`;
  }

  // Show display state
  showResultState("display");
}

/**
 * Handles error reporting when API connection or inference fails
 * @param {Error} error
 */
function handlePredictionError(error) {
  showResultState("idle");

  let friendlyMessage = "";

  if (error.name === "AbortError") {
    friendlyMessage = `API request timed out after ${CONFIG.REQUEST_TIMEOUT_MS / 1000} seconds. The backend took too long to respond.`;
  } else if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
    friendlyMessage = `Unable to connect to the prediction server at ${CONFIG.API_URL}. Please verify your Python backend is running (e.g. 'python app.py').`;
  } else {
    friendlyMessage = error.message || "An unexpected error occurred during prediction.";
  }

  showToast(friendlyMessage, "error");
}

// ==========================================================================
// 7. RESET & VIEW TOGGLING UTILITIES
// ==========================================================================
/**
 * Sets up the "Analyze Another MRI" reset button
 */
function setupResetAction() {
  btnResetAnalysis?.addEventListener("click", () => {
    resetAll();
  });
}

function resetAll() {
  resetUploadState();
  showResultState("idle");
  hideToast();
}

/**
 * Controls visibility between idle, loading, and display states in the result card
 * @param {"idle"|"loading"|"display"} targetState
 */
function showResultState(targetState) {
  if (resultIdleState) resultIdleState.style.display = targetState === "idle" ? "flex" : "none";
  if (resultLoadingState) resultLoadingState.classList.toggle("active", targetState === "loading");
  if (resultDisplayState) resultDisplayState.classList.toggle("active", targetState === "display");
}

/**
 * Displays a toast notification message
 * @param {string} msg
 * @param {"error"|"info"} type
 */
function showToast(msg, type = "error") {
  if (!toastMsg) return;
  toastMsg.textContent = msg;
  toastMsg.className = `toast-msg active toast-${type}`;
}

function hideToast() {
  if (!toastMsg) return;
  toastMsg.textContent = "";
  toastMsg.className = "toast-msg";
}

/**
 * Formats bytes to human-readable size
 */
function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

/**
 * Escapes HTML characters to prevent XSS
 */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
