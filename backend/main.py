from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import sqlite3
from yamcs_client import YamcsClient
from rule_engine import check_rules  
from ml_mock import check_anomaly  

app = FastAPI(title="DRAKON", version="1.0")

class CommandPayload(BaseModel):    
    command_name: str
    arguments: dict
    operator_id: str

def log_to_db(command: str, verdict: str, reason: str):
    conn = sqlite3.connect("db.sqlite")
    cursor = conn.cursor()
    cursor.execute(
        "CREATE TABLE IF NOT EXISTS audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, command TEXT, verdict TEXT, reason TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)"
    )
    cursor.execute("INSERT INTO command_logs (command, verdict, reason) VALUES (?, ?, ?)", (command, verdict, reason))
    conn.commit()
    conn.close()

@app.post("/api/v1/intercept-command")
def intercept_command(payload: CommandPayload):
    
    context = YamcsClient.get_mission_context()
    
    
    rule_passed, rule_reason = check_rules(payload.command_name, context)
    if not rule_passed:
        log_to_db(payload.command_name, "BLOCKED", rule_reason)
        return {"verdict": "BLOCKED", "reason": rule_reason}

    ml_passed, ml_reason = check_anomaly(payload.command_name, payload.operator_id)
    if not ml_passed:
        log_to_db(payload.command_name, "FLAGGED_FOR_REVIEW", ml_reason)
        return {"verdict": "FLAGGED_FOR_REVIEW", "reason": ml_reason}

    log_to_db(payload.command_name, "APPROVED", "Komenda zweryfikowana pomyślnie")
    return {"verdict": "APPROVED", "reason": "OK"}