def check_rules(command_name: str, context: dict):
    """
    Sprawdza, czy komenda nie narusza regul deterministycznych
    w kontekscie aktualnego stanu satelity (pobranego z YAMCS).
    """
   
    if command_name == "UPDATE_SOFTWARE" and context.get("is_maneuvering"):
        return False, "Blocked: Software updates prohibited during orbital maneuver!"
    
    return True, "OK"