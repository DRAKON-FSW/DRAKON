from typing import Protocol, Dict, Any, List

class NavigationProtocol(Protocol):
    """Protokół nawigacji zastępczej i wyznaczania trajektorii."""
    
    def update_ekf(self, star_tracker_data: Dict[str, Any], imu_data: Dict[str, Any]) -> None:
        """Aktualizuje stan pokładowego filtru Kalmana (EKF)."""
        ...

    def propagate_orbit_sgp4(self, time_step: float) -> List[float]:
        """Propaguje orbitę satelity (SGP4 / High-Precision Orbit Propagator)."""
        ...

    def apply_isl_drift_corrections(self, correction_data: Dict[str, Any]) -> None:
        """Aplikuje poprawki driftu pozycji pobrane z sąsiednich węzłów przez ISL."""
        ...
    def process_imu_reading(self, imu_data: Dict[str, Any]) -> None:
        """Przetwarza bieżący odczyt z jednostki IMU w czasie rzeczywistym."""
        ...