"""
NeuroScan AI — Brain Tumor MRI Detection & Classification Backend API
Flask RESTful API service serving the trained Keras CNN model.
"""

import os
import io
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from tensorflow.keras.models import load_model
from tensorflow.keras.utils import load_img, img_to_array

# Initialize Flask Application
app = Flask(__name__)

# Enable CORS for all routes (allows browser frontend to call the API from any origin)
CORS(app)

# Configuration & Constants
MODEL_PATH = os.path.join(os.path.dirname(__file__), "CCN_model.keras") if os.path.exists(os.path.join(os.path.dirname(__file__), "CCN_model.keras")) else os.path.join(os.path.dirname(__file__), "CNN_model.keras")
TARGET_SIZE = (224, 224)
CLASS_NAMES = ['glioma', 'meningioma', 'notumor', 'pituitary']
CLASS_LABELS = {
    'glioma': 'Glioma',
    'meningioma': 'Meningioma',
    'notumor': 'No Tumor',
    'pituitary': 'Pituitary'
}

# Global Model Variable
model = None

def get_model():
    """Lazy load the Keras sequential CNN model."""
    global model
    if model is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(f"Model file not found at: {MODEL_PATH}")
        print(f"[INFO] Loading CNN Model from: {MODEL_PATH} ...")
        model = load_model(MODEL_PATH)
        print("[INFO] Model loaded successfully!")
    return model

@app.route("/", methods=["GET"])
def health_check():
    """Service health and metadata endpoint."""
    return jsonify({
        "status": "online",
        "service": "NeuroScan AI — Brain Tumor Detection API",
        "model": "CCN_model.keras",
        "input_shape": list(TARGET_SIZE) + [3],
        "classes": CLASS_NAMES,
        "endpoints": {
            "predict": "POST /predict (multipart/form-data with 'image' file)"
        }
    })

@app.route("/predict", methods=["POST"])
def predict():
    """
    Main prediction endpoint.
    Expects a multipart/form-data POST request containing an 'image' file.
    Returns:
        JSON response with predicted class, confidence, and full probability distribution.
    """
    # 1. Validate file presence in request
    if "image" not in request.files:
        # Fallback: check if any file was uploaded under a different key
        if len(request.files) > 0:
            first_key = list(request.files.keys())[0]
            image_file = request.files[first_key]
        else:
            return jsonify({
                "success": False,
                "error": "No file uploaded. Please include an image in the 'image' form-data field."
            }), 400
    else:
        image_file = request.files["image"]

    if image_file.filename == "":
        return jsonify({
            "success": False,
            "error": "Empty filename. Please select a valid MRI image file."
        }), 400

    try:
        # 2. Read image bytes into memory
        file_bytes = image_file.read()
        if len(file_bytes) == 0:
            return jsonify({
                "success": False,
                "error": "Uploaded image file is empty."
            }), 400

        # 3. Load and resize image to (224, 224)
        img = load_img(io.BytesIO(file_bytes), target_size=TARGET_SIZE)

        # 4. Convert to NumPy array, expand batch dimension, and normalize (1/255.0)
        img_array = img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0)
        img_array = img_array / 255.0

        # 5. Model Inference
        cnn_model = get_model()
        prediction = cnn_model.predict(img_array)

        # 6. Extract prediction results
        predicted_class_idx = int(np.argmax(prediction[0]))
        predicted_class = CLASS_NAMES[predicted_class_idx]
        predicted_label = CLASS_LABELS.get(predicted_class, predicted_class.capitalize())
        confidence = float(np.max(prediction[0]) * 100)

        # 7. Build full probability distribution across all 4 classes
        probabilities = {}
        for idx, cls_name in enumerate(CLASS_NAMES):
            label = CLASS_LABELS.get(cls_name, cls_name.capitalize())
            prob_percent = float(prediction[0][idx] * 100)
            probabilities[label] = round(prob_percent, 2)

        return jsonify({
            "success": True,
            "class": predicted_class,
            "label": predicted_label,
            "confidence": round(confidence, 2),
            "probabilities": probabilities
        })

    except Exception as e:
        print(f"[ERROR] Inference failed: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"Failed to process image: {str(e)}"
        }), 500

if __name__ == "__main__":
    # Preload model on startup
    try:
        get_model()
    except Exception as err:
        print(f"[WARNING] Could not preload model on startup: {err}")

    port = int(os.environ.get("PORT", 5000))
    print(f"\n=======================================================")
    print(f" NeuroScan AI Backend running on: http://127.0.0.1:{port}")
    print(f" Prediction endpoint: POST http://127.0.0.1:{port}/predict")
    print(f"=======================================================\n")
    app.run(host="127.0.0.1", port=port, debug=False)
