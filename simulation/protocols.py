from typing import Protocol

class SimulationProtocol(Protocol):
    """Protokół środowiska symulacyjnego scenariuszy zakłóceń."""
    
    def inject_jamming_scenario(self, zone_coordinates: dict) -> None:
        """Symuluje st锥fę zagłuszania naziemnego (WRE) w obszarze działania satelity."""
        ...

    def run_simulation_step(self) -> None:
        """Wykonuje iterację symulacji propagacji orbitalnej i stanu łączy ISL."""
        ...