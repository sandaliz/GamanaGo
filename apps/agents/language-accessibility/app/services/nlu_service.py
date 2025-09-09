def classify_intent(text: str):
    text_lower = text.lower()

    if "bus" in text_lower or "fare" in text_lower:
        return {"intent": "bus_fare_query"}
    elif "compare" in text_lower or "cheapest" in text_lower:
        return {"intent": "compare_bus_fares"}
    else:
        return {"intent": "general"}