from googletrans import Translator

translator = Translator()

SUPPORTED_LANGS = {
    "en": "english",
    "si": "sinhala",
    "ta": "tamil"
}

def translate_text(text: str, dest: str = "en"):
    if dest not in SUPPORTED_LANGS:
        raise ValueError(f"Unsupported language: {dest}")
    result = translator.translate(text, dest=dest)
    return {
        "input": text,
        "output": result.text,
        "src": result.src,
        "dest": dest
    }