"""
Configuration management for PREDIX AI
"""

import os
from typing import Optional
from dataclasses import dataclass


@dataclass
class Config:
    """Configuration class for PREDIX AI system"""
    
    # Blockchain Configuration
    WEB3_PROVIDER_URL: str = os.getenv("WEB3_PROVIDER_URL", "https://rpc-amoy.polygon.technology/")
    CHAIN_ID: int = int(os.getenv("CHAIN_ID", "80002"))  # Amoy testnet
    PRIVATE_KEY: str = os.getenv("PRIVATE_KEY", "")
    
    # Contract Addresses
    ROUND_MANAGER_ADDRESS: str = os.getenv("ROUND_MANAGER_ADDRESS", "")
    PREDICTION_POOL_ADDRESS: str = os.getenv("PREDICTION_POOL_ADDRESS", "")
    ORACLE_HANDLER_ADDRESS: str = os.getenv("ORACLE_HANDLER_ADDRESS", "")
    AI_ORACLE_ADAPTER_ADDRESS: str = os.getenv("AI_ORACLE_ADAPTER_ADDRESS", "")
    
    # Data Sources
    COINGECKO_API_KEY: str = os.getenv("COINGECKO_API_KEY", "")
    COINMARKETCAP_API_KEY: str = os.getenv("COINMARKETCAP_API_KEY", "")
    TWITTER_API_KEY: str = os.getenv("TWITTER_API_KEY", "")
    TWITTER_API_SECRET: str = os.getenv("TWITTER_API_SECRET", "")
    TWITTER_ACCESS_TOKEN: str = os.getenv("TWITTER_ACCESS_TOKEN", "")
    TWITTER_ACCESS_TOKEN_SECRET: str = os.getenv("TWITTER_ACCESS_TOKEN_SECRET", "")
    
    # Database Configuration
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://localhost/predix_ai")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    
    # Model Configuration
    MODEL_PATH: str = os.getenv("MODEL_PATH", "./models/lstm_model.h5")
    SEQUENCE_LENGTH: int = int(os.getenv("SEQUENCE_LENGTH", "60"))  # 60 time steps
    PREDICTION_HORIZON: int = int(os.getenv("PREDICTION_HORIZON", "10"))  # 10 minutes
    FEATURE_COUNT: int = int(os.getenv("FEATURE_COUNT", "20"))  # Number of features
    
    # Training Configuration
    BATCH_SIZE: int = int(os.getenv("BATCH_SIZE", "32"))
    EPOCHS: int = int(os.getenv("EPOCHS", "100"))
    LEARNING_RATE: float = float(os.getenv("LEARNING_RATE", "0.001"))
    VALIDATION_SPLIT: float = float(os.getenv("VALIDATION_SPLIT", "0.2"))
    
    # Data Collection
    DATA_COLLECTION_INTERVAL: int = int(os.getenv("DATA_COLLECTION_INTERVAL", "60"))  # seconds
    PRICE_DATA_SOURCES: list = ["coingecko", "coinmarketcap", "binance"]
    SENTIMENT_SOURCES: list = ["twitter", "reddit"]
    
    # API Server Configuration
    ENABLE_API_SERVER: bool = os.getenv("ENABLE_API_SERVER", "true").lower() == "true"
    API_HOST: str = os.getenv("API_HOST", "0.0.0.0")
    API_PORT: int = int(os.getenv("API_PORT", "8000"))
    API_SECRET_KEY: str = os.getenv("API_SECRET_KEY", "your-secret-key-here")
    
    # Logging Configuration
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE: str = os.getenv("LOG_FILE", "./logs/predix_ai.log")
    
    # Prediction Thresholds
    CONFIDENCE_THRESHOLD: float = float(os.getenv("CONFIDENCE_THRESHOLD", "0.6"))
    MIN_PRICE_CHANGE_THRESHOLD: float = float(os.getenv("MIN_PRICE_CHANGE_THRESHOLD", "0.01"))  # 1%
    
    # Risk Management
    MAX_CONSECUTIVE_LOSSES: int = int(os.getenv("MAX_CONSECUTIVE_LOSSES", "3"))
    EMERGENCY_STOP_THRESHOLD: float = float(os.getenv("EMERGENCY_STOP_THRESHOLD", "0.3"))  # 30% accuracy
    
    # Feature Engineering
    TECHNICAL_INDICATORS: list = [
        "sma_5", "sma_10", "sma_20", "sma_50",
        "ema_5", "ema_10", "ema_20", "ema_50",
        "rsi_14", "macd", "macd_signal", "macd_histogram",
        "bollinger_upper", "bollinger_lower", "bollinger_middle",
        "volume_sma", "price_change", "volume_change"
    ]
    
    SENTIMENT_FEATURES: list = [
        "twitter_sentiment", "reddit_sentiment", "news_sentiment",
        "social_volume", "social_engagement"
    ]
    
    # Polygon/POL Specific
    POL_CONTRACT_ADDRESS: str = "0x455e53DC43b3635fF99520928A4C0E7c0b4f5a81"  # POL token on Polygon
    POL_DECIMALS: int = 18
    
    def __post_init__(self):
        """Validate configuration after initialization"""
        self.validate_config()
    
    def validate_config(self):
        """Validate critical configuration parameters"""
        if not self.PRIVATE_KEY:
            raise ValueError("PRIVATE_KEY is required")
        
        if not self.WEB3_PROVIDER_URL:
            raise ValueError("WEB3_PROVIDER_URL is required")
        
        if self.CONFIDENCE_THRESHOLD < 0.5 or self.CONFIDENCE_THRESHOLD > 1.0:
            raise ValueError("CONFIDENCE_THRESHOLD must be between 0.5 and 1.0")
        
        if self.SEQUENCE_LENGTH < 10:
            raise ValueError("SEQUENCE_LENGTH must be at least 10")
        
        if self.BATCH_SIZE < 1:
            raise ValueError("BATCH_SIZE must be positive")
    
    @property
    def is_testnet(self) -> bool:
        """Check if running on testnet"""
        return self.CHAIN_ID in [80001, 80002]  # Mumbai or Amoy testnet
    
    @property
    def network_name(self) -> str:
        """Get network name"""
        network_names = {
            137: "polygon",
            80001: "mumbai",
            80002: "amoy"
        }
        return network_names.get(self.CHAIN_ID, "unknown")
    
    def get_contract_address(self, contract_name: str) -> str:
        """Get contract address by name"""
        addresses = {
            "round_manager": self.ROUND_MANAGER_ADDRESS,
            "prediction_pool": self.PREDICTION_POOL_ADDRESS,
            "oracle_handler": self.ORACLE_HANDLER_ADDRESS,
            "ai_oracle_adapter": self.AI_ORACLE_ADAPTER_ADDRESS
        }
        return addresses.get(contract_name.lower(), "")
    
    def to_dict(self) -> dict:
        """Convert config to dictionary"""
        return {
            key: getattr(self, key)
            for key in dir(self)
            if not key.startswith('_') and not callable(getattr(self, key))
        }
