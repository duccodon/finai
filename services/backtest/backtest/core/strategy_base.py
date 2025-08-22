from abc import ABC, abstractmethod
import pandas as pd
from typing import Dict

class BaseStrategy(ABC):
    def __init__(self, params: Dict):
        self.params = params

    @abstractmethod
    def prepare(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add columns and a 'signal' column: 1=BUY, -1=SELL, 0=HOLD."""
        df["signal"] = 0
        return df
