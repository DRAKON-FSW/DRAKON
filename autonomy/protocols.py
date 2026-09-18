from typing import Protocol

class SafeStateProtocol(Protocol):
    """
    Protokół definiujący zachowanie satelity podczas przejścia w tryb 
    autonomii i nawigacji zastępczej (Sekcja 1 projektu).
    """
    
    def isolate_ground_layers(self) -> bool:
        """Izoluje zagrożone warstwy komunikacji naziemnej."""
        ...
        
    def enter_safe_state(self) -> None:
        """Przełącza satelitę w profil bezpieczeństwa (Safe-State)."""
        ...


class RFShieldProtocol(Protocol):
    """
    Protokół definiujący działanie tarczy RF w paśmie naziemnym 
    podczas wykrycia zagrożenia WRE (Sekcja 1 projektu).
    """
    
    def activate_fhss(self) -> None:
        """Aktywuje reaktywny Frequency Hopping (FHSS)."""
        ...
        
    def set_lpi_lpd_profile(self, profile_level: str) -> bool:
        """Zmienia profile szyfrowania dla unikania wywiadowczego namierzenia (LPI/LPD)."""
        ...