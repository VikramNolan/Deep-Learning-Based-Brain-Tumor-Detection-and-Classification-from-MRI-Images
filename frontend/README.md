# NeuroScan AI — Frontend & Backend Integration Guide

## Overview
NeuroScan AI is a modern, responsive web application for Brain Tumor Detection and Classification from MRI Images. Built using **HTML5, CSS3, and Vanilla JavaScript (Fetch API)** with zero framework dependencies.

![NeuroScan AI Prediction Dashboard](../prediction/Screenshot%202026-09-22%20214002.png)

---

## Folder Structure

```
Brain/
├── app.py                      # Flask RESTful API Backend (loads CCN_model.keras)
├── CCN_model.keras             # Trained Keras Sequential CNN Model (~134MB)
├── train.ipynb                 # Model Training Pipeline & Metrics (89.13% Acc)
├── text.ipynb                  # Test Inference Experiments
│
└── frontend/                   # Web Client Application
    ├── index.html              # Home / Landing Page
    ├── prediction.html         # MRI Diagnostic & Analysis Dashboard
    ├── about.html              # Educational Deep-Dive & Architecture Guide
    │
    ├── css/
    │   └── style.css           # Vanilla CSS Design System & Theme
    │
    ├── js/
    │   ├── main.js             # Sticky navbar, mobile menu & scroll animations
    │   ├── prediction.js       # File upload, Fetch API, and result visualizer
    │   └── about.js            # CNN layer inspector & reading scrollspy
    │
    └── assets/
        ├── icons/              # Embedded custom SVG icons
        └── images/
            └── samples/        # Sample MRI scans for instant testing
                ├── sample_glioma.jpg
                ├── sample_meningioma.jpg
                ├── sample_pituitary.jpg
                └── sample_notumor.jpg
```

---

## Quick Start Guide

### Step 1: Start the Python Backend API
In your terminal, navigate to the project directory and start the Flask server:

```bash
# Using the Windows py launcher:
py app.py

# Or standard python:
python app.py
```

The API will start and display:
```
=======================================================
 NeuroScan AI Backend running on: http://127.0.0.1:5000
 Prediction endpoint: POST http://127.0.0.1:5000/predict
=======================================================
```

You can verify the backend is online by visiting `http://127.0.0.1:5000/` in your browser.

---

### Step 2: Open the Frontend
You can run the frontend in either of two ways:

#### Option A: Using a Lightweight HTTP Server (Recommended)
From the project folder, run:
```bash
py -m http.server 8080
```
Then navigate to:
- Home: **http://127.0.0.1:8080/frontend/index.html**
- Prediction: **http://127.0.0.1:8080/frontend/prediction.html**
- About: **http://127.0.0.1:8080/frontend/about.html**

#### Option B: Direct Browser Opening
Simply double-click `frontend/index.html` or `frontend/prediction.html` to open directly in Google Chrome, Microsoft Edge, or Mozilla Firefox.

---

## Backend API Specification

### Endpoint: `POST /predict`
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **Body Field**: `image` (binary image file)
- **Supported Image Formats**: `.jpg`, `.jpeg`, `.png`

### Response JSON (HTTP 200 OK):
```json
{
  "success": true,
  "class": "glioma",
  "label": "Glioma",
  "confidence": 99.99,
  "probabilities": {
    "Glioma": 99.99,
    "Meningioma": 0.01,
    "No Tumor": 0.0,
    "Pituitary": 0.0
  }
}
```

---

## Configuring the API Endpoint
If your backend runs on a different port or host (e.g. FastAPI on port 8000 or a cloud server), edit the first lines of [`frontend/js/prediction.js`](file:///c:/Users/Vikram/Desktop/Brain/frontend/js/prediction.js):

```javascript
const CONFIG = {
  // Update this URL to point to your backend:
  API_URL: "http://127.0.0.1:5000/predict",

  // FormData field name expected by the server:
  FIELD_NAME: "image",

  // Request timeout in milliseconds:
  REQUEST_TIMEOUT_MS: 30000
};
```

---

## Important Notice
This project is developed for **academic, educational, and research purposes only**. It does not constitute a certified medical diagnostic system. Always consult a qualified healthcare professional for clinical evaluation.
