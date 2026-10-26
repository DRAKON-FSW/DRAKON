from fastapi import FastAPI

app = FastAPI(title="YAMCS Mock", version="1.0")

@app.get("/api/processors/{instance}/{processor}/parameters")
def get_parameters(instance: str, processor: str):
    # Zwraca fikcyjny kontekst misji 
    return {
        "parameters": [
            {"name": "is_maneuvering", "value": False},
            {"name": "mission_phase", "value": "NOMINAL"}
        ]
    }