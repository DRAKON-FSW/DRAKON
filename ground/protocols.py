from typing import Protocol, Dict, Any

class GroundControlProtocol(Protocol):
    """Protokół stacji naziemnej i asynchronicznego przywracania kontroli."""
    
    def process_downlink_alert(self, encrypted_packet: bytes) -> bool:
        """Odbiera i weryfikuje alert przekazany przez satelitę spoza strefy WRE."""
        ...

    def send_async_feedback_dispatch(self, freq_tables: list, session_keys: str, orbit_epoch: float) -> Dict[str, Any]:
        """Wysyła depeszę zwrotną (nowe częstotliwości, klucze, epoka)."""
        ...

    def reconfigure_transmitters(self, verified_dispatch: Dict[str, Any]) -> None:
        """Rekonfiguruje nadajniki RF po autoryzacji depeszy zwrotnej."""
        ...