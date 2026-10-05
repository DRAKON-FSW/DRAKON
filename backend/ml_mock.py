def check_anomaly(command_name: str, operator_id: str):
    
    #przyklad xd

    if operator_id == "hacker":
        return False, "Anomaly"
    
    return True, "OK"