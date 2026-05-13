const storageKeys = {
  endpoint: "invoice-intelligence-endpoint",
  apiKey: "invoice-intelligence-key",
  apiVersion: "invoice-intelligence-version",
  threshold: "invoice-intelligence-threshold"
};

const state = {
  files: [],
  results: [],
  isRunning: false
};

const elements = {
  endpointInput: document.getElementById("endpointInput"),
  apiKeyInput: document.getElementById("apiKeyInput"),
  apiVersionInput: document.getElementById("apiVersionInput"),
  confidenceThresholdInput: document.getElementById("confidenceThresholdInput"),
  saveConfigButton: document.getElementById("saveConfigButton"),
  connectionBadge: document.getElementById("connectionBadge"),
  dropzone: document.getElementById("dropzone"),
  fileInput: document.getElementById("fileInput"),
  fileQueue: document.getElementById("fileQueue"),
  fileCounter: document.getElementById("fileCounter"),
  analyzeButton: document.getElementById("analyzeButton"),
  clearButton: document.getElementById("clearButton"),
  runStatus: document.getElementById("runStatus"),
  processedCount: document.getElementById("processedCount"),
  averageConfidence: document.getElementById("averageConfidence"),
  highConfidenceCount: document.getElementById("highConfidenceCount"),
  reviewCount: document.getElementById("reviewCount"),
  validationNote: document.getElementById("validationNote"),
  resultsList: document.getElementById("resultsList"),
  fileItemTemplate: document.getElementById("fileItemTemplate"),
  resultTemplate: document.getElementById("resultTemplate")
};

initialize();

function initialize() {
  loadSavedConfig();
  bindEvents();
  updateConnectionBadge();
  renderQueue();
  renderResults();
  updateSummary();
}

function bindEvents() {
  elements.saveConfigButton.addEventListener("click", saveConfig);
  elements.fileInput.addEventListener("change", handleFileSelection);
  elements.analyzeButton.addEventListener("click", analyzeInvoices);
  elements.clearButton.addEventListener("click", clearQueue);

  ["dragenter", "dragover"].forEach((eventName) => {
    elements.dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      elements.dropzone.classList.add("drag-over");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    elements.dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      elements.dropzone.classList.remove("drag-over");
    });
  });

  elements.dropzone.addEventListener("drop", (event) => {
    const droppedFiles = Array.from(event.dataTransfer?.files || []);
    addFiles(droppedFiles);
  });
}

function loadSavedConfig() {
  elements.endpointInput.value = localStorage.getItem(storageKeys.endpoint) || "";
  elements.apiKeyInput.value = localStorage.getItem(storageKeys.apiKey) || "";
  elements.apiVersionInput.value = localStorage.getItem(storageKeys.apiVersion) || "2024-11-30";
  elements.confidenceThresholdInput.value = localStorage.getItem(storageKeys.threshold) || "0.8";
}

function saveConfig() {
  localStorage.setItem(storageKeys.endpoint, elements.endpointInput.value.trim());
  localStorage.setItem(storageKeys.apiKey, elements.apiKeyInput.value.trim());
  localStorage.setItem(storageKeys.apiVersion, elements.apiVersionInput.value.trim());
  localStorage.setItem(storageKeys.threshold, elements.confidenceThresholdInput.value.trim());
  updateConnectionBadge();
  setStatus("Configuration saved. You can upload invoices and start analysis.", "ready");
}

function updateConnectionBadge() {
  const hasConfig = Boolean(getConfig().endpoint && getConfig().apiKey);
  elements.connectionBadge.textContent = hasConfig ? "Configured" : "Not configured";
  elements.connectionBadge.classList.toggle("ready", hasConfig);
}

function handleFileSelection(event) {
  addFiles(Array.from(event.target.files || []));
  elements.fileInput.value = "";
}

function addFiles(files) {
  const supportedFiles = files.filter((file) => file.size > 0);
  const nextFiles = [...state.files];

  supportedFiles.forEach((file) => {
    const duplicate = nextFiles.some((existing) =>
      existing.name === file.name &&
      existing.size === file.size &&
      existing.lastModified === file.lastModified
    );

    if (!duplicate) {
      nextFiles.push(file);
    }
  });

  state.files = nextFiles;
  renderQueue();
}

function clearQueue() {
  if (state.isRunning) {
    return;
  }

  state.files = [];
  state.results = [];
  renderQueue();
  renderResults();
  updateSummary();
  setStatus("Queue cleared. Upload another invoice batch when you're ready.", "idle");
}

function renderQueue() {
  elements.fileQueue.innerHTML = "";
  elements.fileCounter.textContent = `${state.files.length} file${state.files.length === 1 ? "" : "s"} selected`;

  state.files.forEach((file, index) => {
    const fragment = elements.fileItemTemplate.content.cloneNode(true);
    fragment.querySelector(".queue-name").textContent = file.name;
    fragment.querySelector(".queue-size").textContent = formatFileSize(file.size);
    fragment.querySelector(".queue-remove").addEventListener("click", () => removeFile(index));
    elements.fileQueue.appendChild(fragment);
  });
}

function removeFile(index) {
  if (state.isRunning) {
    return;
  }

  state.files = state.files.filter((_, currentIndex) => currentIndex !== index);
  renderQueue();
}

async function analyzeInvoices() {
  if (state.isRunning) {
    return;
  }

  const config = getConfig();
  if (!config.endpoint || !config.apiKey) {
    setStatus("Add your endpoint and API key before starting analysis.", "error");
    updateConnectionBadge();
    return;
  }

  if (!state.files.length) {
    setStatus("Upload at least one invoice file to analyze.", "error");
    return;
  }

  state.isRunning = true;
  state.results = [];
  renderResults();
  updateSummary();
  setStatus(`Analyzing ${state.files.length} invoice${state.files.length === 1 ? "" : "s"}...`, "running");
  syncActionState();

  for (let index = 0; index < state.files.length; index += 1) {
    const file = state.files[index];

    try {
      const result = await analyzeSingleInvoice(file, config, index + 1, state.files.length);
      state.results.push(result);
    } catch (error) {
      state.results.push({
        fileName: file.name,
        status: "error",
        statusLabel: "Analysis Failed",
        subtitle: error.message || "The file could not be analyzed.",
        confidenceAverage: 0,
        reviewText: "The service returned an error, so this invoice should be retried or reviewed manually.",
        fields: defaultFields()
      });
    }

    renderResults();
    updateSummary();
  }

  state.isRunning = false;
  syncActionState();

  const reviewCount = state.results.filter((result) => result.status !== "ready").length;
  const finalMessage = reviewCount
    ? `Analysis complete. ${reviewCount} invoice${reviewCount === 1 ? "" : "s"} need review.`
    : "Analysis complete. All invoices met the configured confidence threshold.";

  setStatus(finalMessage, reviewCount ? "running" : "ready");
}

async function analyzeSingleInvoice(file, config, index, total) {
  setStatus(`Processing ${index} of ${total}: ${file.name}`, "running");

  const base64Source = await fileToBase64(file);
  const analyzeUrl = buildAnalyzeUrl(config.endpoint, config.apiVersion);

  const startResponse = await fetch(analyzeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Ocp-Apim-Subscription-Key": config.apiKey
    },
    body: JSON.stringify({ base64Source })
  });

  if (!startResponse.ok) {
    throw new Error(await extractErrorMessage(startResponse));
  }

  const operationLocation = startResponse.headers.get("operation-location");
  if (!operationLocation) {
    throw new Error("Azure did not return an operation status URL.");
  }

  const resultPayload = await pollOperation(operationLocation, config.apiKey);
  return mapResult(file.name, resultPayload, config.threshold);
}

function buildAnalyzeUrl(endpoint, apiVersion) {
  const cleanedEndpoint = endpoint.trim().replace(/\/+$/, "");
  return `${cleanedEndpoint}/documentintelligence/documentModels/prebuilt-invoice:analyze?_overload=analyzeDocument&api-version=${encodeURIComponent(apiVersion)}`;
}

async function pollOperation(operationLocation, apiKey) {
  const maxAttempts = 60;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await sleep(attempt === 0 ? 1500 : 1800);

    const response = await fetch(operationLocation, {
      method: "GET",
      headers: {
        "Ocp-Apim-Subscription-Key": apiKey
      }
    });

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }

    const payload = await response.json();
    const status = payload.status?.toLowerCase();

    if (status === "succeeded") {
      return payload;
    }

    if (status === "failed") {
      const serviceMessage = payload.error?.message || "The analysis operation failed.";
      throw new Error(serviceMessage);
    }
  }

  throw new Error("Analysis timed out while waiting for Azure to finish processing.");
}

function mapResult(fileName, payload, threshold) {
  const doc = payload.analyzeResult?.documents?.[0];
  const fields = doc?.fields || {};
  const normalizedFields = [
    buildField("Invoice Number", readField(fields.InvoiceId)),
    buildField("Vendor Name", readField(fields.VendorName)),
    buildField("Invoice Date", readField(fields.InvoiceDate)),
    buildField("Tax Amount", readCurrencyField(fields.TotalTax)),
    buildField("Total Payable", readCurrencyField(fields.AmountDue) || readCurrencyField(fields.InvoiceTotal))
  ];

  const presentFields = normalizedFields.filter((field) => field.value !== "Not found");
  const averageConfidence = presentFields.length
    ? presentFields.reduce((sum, field) => sum + field.confidence, 0) / presentFields.length
    : 0;

  const lowConfidenceFields = normalizedFields.filter((field) => field.value === "Not found" || field.confidence < threshold);
  const status = lowConfidenceFields.length ? "review" : "ready";
  const statusLabel = lowConfidenceFields.length ? "Review Needed" : "Validated";
  const extractedCount = presentFields.length;
  const pageCount = payload.analyzeResult?.pages?.length || 0;

  let reviewText = "All priority fields were extracted with acceptable confidence.";
  if (lowConfidenceFields.length) {
    const labels = lowConfidenceFields.map((field) => field.label).join(", ");
    reviewText = `Review recommended for: ${labels}. Missing values or low confidence can affect downstream finance automation.`;
  }

  return {
    fileName,
    status,
    statusLabel,
    subtitle: `${extractedCount}/5 priority fields extracted${pageCount ? ` across ${pageCount} page${pageCount === 1 ? "" : "s"}` : ""}.`,
    confidenceAverage: averageConfidence,
    reviewText,
    fields: normalizedFields
  };
}

function buildField(label, details) {
  if (!details) {
    return {
      label,
      value: "Not found",
      confidence: 0
    };
  }

  return {
    label,
    value: details.value,
    confidence: details.confidence
  };
}

function readField(field) {
  if (!field) {
    return null;
  }

  const value =
    field.valueString ||
    field.valueDate ||
    field.content ||
    field.valueNumber ||
    field.valuePhoneNumber ||
    field.valueSelectionMark;

  if (value === undefined || value === null || value === "") {
    return null;
  }

  return {
    value: String(value),
    confidence: Number(field.confidence || 0)
  };
}

function readCurrencyField(field) {
  if (!field) {
    return null;
  }

  const currency = field.valueCurrency;
  if (currency?.amount !== undefined && currency?.amount !== null) {
    const code = currency.currencyCode ? `${currency.currencyCode} ` : "";
    return {
      value: `${code}${formatNumber(currency.amount)}`,
      confidence: Number(field.confidence || 0)
    };
  }

  return readField(field);
}

function renderResults() {
  elements.resultsList.innerHTML = "";

  if (!state.results.length) {
    elements.resultsList.innerHTML = `
      <div class="empty-state">
        <h3>No analysis yet</h3>
        <p>Your extracted invoice details and validation insights will appear here.</p>
      </div>
    `;
    return;
  }

  const threshold = Number(getConfig().threshold);

  state.results.forEach((result) => {
    const fragment = elements.resultTemplate.content.cloneNode(true);
    fragment.querySelector(".result-name").textContent = result.fileName;
    fragment.querySelector(".result-subtitle").textContent = result.subtitle;

    const badge = fragment.querySelector(".result-badge");
    badge.textContent = result.statusLabel;
    badge.classList.add(result.status === "error" ? "error" : result.status);

    const fieldGrid = fragment.querySelector(".field-grid");
    result.fields.forEach((field) => {
      const card = document.createElement("div");
      card.className = "field-card";
      const confidenceClass = field.confidence >= threshold ? "good" : field.confidence >= 0.5 ? "warn" : "bad";

      card.innerHTML = `
        <span>${field.label}</span>
        <strong>${escapeHtml(field.value)}</strong>
        <div class="confidence ${confidenceClass}">${Math.round(field.confidence * 100)}% confidence</div>
      `;
      fieldGrid.appendChild(card);
    });

    fragment.querySelector(".review-text").textContent = result.reviewText;
    elements.resultsList.appendChild(fragment);
  });
}

function updateSummary() {
  const processed = state.results.length;
  const threshold = Number(getConfig().threshold);
  const nonErrorResults = state.results.filter((result) => result.status !== "error");
  const averageConfidence = nonErrorResults.length
    ? nonErrorResults.reduce((sum, result) => sum + result.confidenceAverage, 0) / nonErrorResults.length
    : 0;
  const highConfidenceCount = state.results.filter((result) => result.status === "ready").length;
  const reviewCount = state.results.filter((result) => result.status !== "ready").length;

  elements.processedCount.textContent = String(processed);
  elements.averageConfidence.textContent = `${Math.round(averageConfidence * 100)}%`;
  elements.highConfidenceCount.textContent = String(highConfidenceCount);
  elements.reviewCount.textContent = String(reviewCount);

  if (!processed) {
    elements.validationNote.textContent = "Add your Azure endpoint and key, upload invoices, then start analysis to measure extraction quality.";
    return;
  }

  elements.validationNote.textContent =
    `${highConfidenceCount} of ${processed} invoices met the ${Math.round(threshold * 100)}% confidence threshold. ` +
    `${reviewCount} invoice${reviewCount === 1 ? "" : "s"} should be checked before downstream financial posting.`;
}

function setStatus(message, tone) {
  elements.runStatus.textContent = tone === "idle" ? "Idle" : tone === "running" ? "Running" : tone === "ready" ? "Completed" : "Attention";
  elements.runStatus.classList.remove("ready", "running", "error");
  if (tone === "ready" || tone === "running" || tone === "error") {
    elements.runStatus.classList.add(tone);
  }
  elements.validationNote.textContent = message;
}

function syncActionState() {
  elements.analyzeButton.disabled = state.isRunning;
  elements.clearButton.disabled = state.isRunning;
  elements.saveConfigButton.disabled = state.isRunning;
}

function getConfig() {
  const threshold = Number(elements.confidenceThresholdInput.value || "0.8");
  return {
    endpoint: elements.endpointInput.value.trim(),
    apiKey: elements.apiKeyInput.value.trim(),
    apiVersion: elements.apiVersionInput.value.trim() || "2024-11-30",
    threshold: Number.isFinite(threshold) ? Math.min(Math.max(threshold, 0), 1) : 0.8
  };
}

function defaultFields() {
  return [
    buildField("Invoice Number", null),
    buildField("Vendor Name", null),
    buildField("Invoice Date", null),
    buildField("Tax Amount", null),
    buildField("Total Payable", null)
  ];
}

function formatFileSize(size) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function formatNumber(value) {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Unable to read file data."));
        return;
      }

      const [, base64Payload] = result.split(",");
      resolve(base64Payload);
    };
    reader.onerror = () => reject(new Error("The selected file could not be read."));
    reader.readAsDataURL(file);
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function extractErrorMessage(response) {
  try {
    const payload = await response.json();
    return payload.error?.message || payload.message || `Request failed with status ${response.status}.`;
  } catch {
    return `Request failed with status ${response.status}.`;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
