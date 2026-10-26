import os
import requests

YAMCS_URL = os.getenv("YAMCS_URL", "http://yamcs:8090")

INSTANCE = "my-mission" 
PROCESSOR = "realtime"

class YamcsClient:
    @staticmethod
    def get_mission_context():
        """
        Pobiera aktualny kontekst z YAMCS (np. stan, faza misji, czy trwa manewr).
        W celach uproszczonych zwraca slownik z danymi telemetrycznymi.
        """
        try:
           
            url = f"{YAMCS_URL}/api/processors/{INSTANCE}/{PROCESSOR}/parameters"
            response = requests.get(url, timeout=3)
            
            if response.status_code == 200:
              
                data = response.json()
                
                return {
                    "is_maneuvering": False, 
                    "mission_phase": "NOMINAL",
                    "yamcs_status": "connected"
                }
        except Exception as e:
            print(f"[Warning] Failed to connect to YAMCS: {e}")
        
       
        return {
            "is_maneuvering": False,
            "mission_phase": "NOMINAL",
            "yamcs_status": "disconnected"
        }