from typing import Protocol, Dict, Any

class CommunicationProtocol(Protocol):
    """Protokół komunikacji międzysatelitarnej i routingu odpornego na zakłócenia."""
    
    def send_panic_packet_dtn(self, bundle_data: Dict[str, Any], use_oisl: bool = False) -> bool:
        """Wysyła priorytetowy alert ratunkowy przez DTN (RF ISL / OISL)."""
        ...

    def control_pat_loop(self, nav_vector: Dict[str, Any]) -> None:
        """Steruje pętlą PAT (Pointing, Acquisition, Tracking) terminala laserowego/anten."""
        ...

    def receive_async_dispatch(self) -> Dict[str, Any]:
        """Odbiera asynchroniczną depeszę zwrotną od operatora przez ISL."""
        ...