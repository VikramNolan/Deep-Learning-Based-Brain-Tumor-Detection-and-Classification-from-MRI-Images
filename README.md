# Deep Learning-Based Brain Tumor Detection and Classification from MRI Images

[![Python](https://img.shields.io/badge/Python-3.11-blue.svg)](https://www.python.org/)
[![TensorFlow](https://img.shields.io/badge/TensorFlow-2.20-orange.svg)](https://tensorflow.org/)
[![Keras](https://img.shields.io/badge/Keras-Sequential%20CNN-red.svg)](https://keras.io/)
[![Flask](https://img.shields.io/badge/Backend-Flask%20API-green.svg)](https://flask.palletsprojects.com/)
[![Frontend](https://img.shields.io/badge/Frontend-HTML5%20%7C%20CSS3%20%7C%20Vanilla%20JS-cyan.svg)](frontend/)

An end-to-end deep learning medical imaging project designed to detect and classify brain tumors from axial MRI scans into four distinct categories: **Glioma**, **Meningioma**, **Pituitary**, and **No Tumor**.

![NeuroScan AI Prediction Dashboard](prediction/Screenshot%202026-09-22%20214002.png)

---

## Key Highlights

- **Deep Learning Model**: Sequential Convolutional Neural Network (CNN) trained with TensorFlow/Keras on 7,200 brain MRI images.
- **Model Evaluation**: Achieved **89.13% test accuracy** across 1,600 unseen test scans.
- **Pure Web Standards**: Web frontend built using **HTML5, CSS3, and Vanilla JavaScript (Fetch API)** with zero UI frameworks.
- **RESTful API**: Lightweight Flask service (`app.py`) providing live model inference with CORS support.
- **1-Click Testing**: Preset sample scans included in `frontend/assets/images/samples/` for immediate verification.

---

## Project Structure

```
Brain/
├── app.py                             # Flask API server loading CCN_model.keras
├── CCN_model.keras                    # Saved trained Sequential CNN model (~134MB)
├── train.ipynb                        # Model training pipeline & accuracy metrics
├── text.ipynb                         # Inference testing experiments
│
├── prediction/                        # Screenshots & demonstration assets
│   └── Screenshot 2026-09-22 214002.png
│
├── Testing/                           # 1,600 test MRI scans (400 per class)
├── Training/                          # 5,600 training MRI scans
│
└── frontend/                          # Web UI Application
    ├── index.html                     # AI Landing Page with interactive scanner
    ├── prediction.html                # MRI Diagnostic & Classification Dashboard
    ├── about.html                     # Educational Deep-Dive & Architecture Guide
    ├── README.md                      # Detailed frontend documentation
    │
    ├── css/
    │   └── style.css                  # Cyber-clinical Vanilla CSS design system
    │
    ├── js/
    │   ├── main.js                    # Navbar, mobile drawer & scroll animations
    │   ├── prediction.js              # File upload, Fetch API, and result visualizer
    │   └── about.js                   # Interactive CNN architecture highlighting
    │
    └── assets/
        └── images/samples/            # Sample MRI scans for instant testing
            ├── sample_glioma.jpg
            ├── sample_meningioma.jpg
            ├── sample_pituitary.jpg
            └── sample_notumor.jpg
```

---

## Quick Start Guide

### 1. Start the Flask Backend API
```bash
# Using the Windows py launcher:
py app.py

# Or standard python:
python app.py
```
The server will start on `http://127.0.0.1:5000` with the prediction endpoint available at `POST http://127.0.0.1:5000/predict`.

### 2. Launch the Web Interface
From the repository root, start a lightweight web server:
```bash
py -m http.server 8080
```
Open in your browser:
- **Home Page**: [http://127.0.0.1:8080/frontend/index.html](http://127.0.0.1:8080/frontend/index.html)
- **Prediction Dashboard**: [http://127.0.0.1:8080/frontend/prediction.html](http://127.0.0.1:8080/frontend/prediction.html)
- **About Page**: [http://127.0.0.1:8080/frontend/about.html](http://127.0.0.1:8080/frontend/about.html)

---

## CNN Model Specifications

| Parameter | Specification |
| :--- | :--- |
| **Input Shape** | `(224, 224, 3)` RGB |
| **Normalization** | Rescaling `1.0 / 255.0` |
| **Convolutional Layers** | 3 blocks (32, 64, 128 filters with 3x3 kernels & ReLU) |
| **Pooling** | MaxPooling2D (2x2) |
| **Dense Layers** | Dense(128, ReLU) &rarr; Dropout(0.5) &rarr; Dense(4, Softmax) |
| **Loss Function** | Sparse Categorical Crossentropy |
| **Optimizer** | Adam |
| **Epochs** | 15 |
| **Test Accuracy** | **89.13%** |

---

## Disclaimer
**Educational and Research Use Only:** This application is developed strictly for academic and research exploration. It does not provide medical diagnoses or replace clinical interpretation by certified healthcare practitioners.
