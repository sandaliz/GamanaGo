import fasttext
import os

MODEL_PATH = os.path.join(os.path.dirname(__file__), "lid.176.bin")

# Load model once at startup
model = fasttext.load_model(MODEL_PATH)

LANGUAGE_NAMES = {
    "en": "English",
    "si": "Sinhala",
    "ta": "Tamil",
}

def detect_language(text: str):
    try:
        prediction = model.predict(text.strip().replace("\n", " "))
        label = prediction[0][0].replace("__label__", "")
        confidence = float(prediction[1][0])

        return {
            "input": text,
            "lang": label,
            "lang_name": LANGUAGE_NAMES.get(label, "Unknown"),
            "confidence": round(confidence, 3)
        }
    except Exception as e:
        return {
            "input": text,
            "lang": "unknown",
            "lang_name": "Unknown",
            "error": str(e)
        }