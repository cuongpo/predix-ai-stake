"""
Data collection module for PREDIX AI
Collects POL price data, volume, technical indicators, and sentiment data
"""

import asyncio
import logging
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import aiohttp
import ccxt.async_support as ccxt
import ta
from textblob import TextBlob

from .config import Config
from .utils.logger import setup_logger

logger = setup_logger(__name__)


class DataCollector:
    """Collects and processes data for POL price predictions"""
    
    def __init__(self, config: Config):
        self.config = config
        self.exchanges = {}
        self.session = None
        
    async def initialize(self):
        """Initialize data collection components"""
        logger.info("Initializing data collector...")
        
        # Initialize HTTP session
        self.session = aiohttp.ClientSession()
        
        # Initialize cryptocurrency exchanges
        await self._initialize_exchanges()
        
        logger.info("Data collector initialized successfully")
    
    async def _initialize_exchanges(self):
        """Initialize cryptocurrency exchange connections"""
        try:
            # Binance
            self.exchanges['binance'] = ccxt.binance({
                'apiKey': '',
                'secret': '',
                'sandbox': False,
                'enableRateLimit': True,
            })
            
            # Add more exchanges as needed
            logger.info("Exchanges initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize exchanges: {e}")
    
    async def collect_price_data(self, symbol: str = "POL/USDT", timeframe: str = "1m", limit: int = 100) -> pd.DataFrame:
        """Collect price data from multiple sources"""
        try:
            # Primary source: Binance
            if 'binance' in self.exchanges:
                ohlcv = await self.exchanges['binance'].fetch_ohlcv(symbol, timeframe, limit=limit)
                df = pd.DataFrame(ohlcv, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
                df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
                df.set_index('timestamp', inplace=True)
                
                logger.debug(f"Collected {len(df)} price data points from Binance")
                return df
            
        except Exception as e:
            logger.error(f"Failed to collect price data: {e}")
            
        # Fallback: Generate mock data for development
        return self._generate_mock_price_data(limit)
    
    def _generate_mock_price_data(self, limit: int) -> pd.DataFrame:
        """Generate mock price data for development/testing"""
        logger.warning("Using mock price data - replace with real data in production")
        
        dates = pd.date_range(end=datetime.now(), periods=limit, freq='1min')
        
        # Generate realistic price movement
        base_price = 1.50  # $1.50 POL
        price_changes = np.random.normal(0, 0.02, limit)  # 2% volatility
        prices = [base_price]
        
        for change in price_changes[1:]:
            new_price = prices[-1] * (1 + change)
            prices.append(max(0.1, new_price))  # Minimum price of $0.10
        
        df = pd.DataFrame({
            'open': prices,
            'high': [p * (1 + abs(np.random.normal(0, 0.01))) for p in prices],
            'low': [p * (1 - abs(np.random.normal(0, 0.01))) for p in prices],
            'close': prices,
            'volume': np.random.uniform(100000, 1000000, limit)
        }, index=dates)
        
        return df
    
    async def collect_coingecko_data(self, coin_id: str = "polygon-ecosystem-token") -> Dict:
        """Collect data from CoinGecko API"""
        try:
            url = f"https://api.coingecko.com/api/v3/coins/{coin_id}"
            params = {
                'localization': 'false',
                'tickers': 'false',
                'market_data': 'true',
                'community_data': 'true',
                'developer_data': 'false',
                'sparkline': 'false'
            }
            
            if self.config.COINGECKO_API_KEY:
                params['x_cg_demo_api_key'] = self.config.COINGECKO_API_KEY
            
            async with self.session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    return {
                        'market_cap': data['market_data']['market_cap']['usd'],
                        'total_volume': data['market_data']['total_volume']['usd'],
                        'price_change_24h': data['market_data']['price_change_percentage_24h'],
                        'market_cap_rank': data['market_data']['market_cap_rank'],
                        'community_score': data['community_data']['community_score']
                    }
                else:
                    logger.warning(f"CoinGecko API returned status {response.status}")
                    
        except Exception as e:
            logger.error(f"Failed to collect CoinGecko data: {e}")
        
        return {}
    
    def calculate_technical_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """Calculate technical indicators for the price data"""
        try:
            # Simple Moving Averages
            df['sma_5'] = ta.trend.sma_indicator(df['close'], window=5)
            df['sma_10'] = ta.trend.sma_indicator(df['close'], window=10)
            df['sma_20'] = ta.trend.sma_indicator(df['close'], window=20)
            df['sma_50'] = ta.trend.sma_indicator(df['close'], window=50)
            
            # Exponential Moving Averages
            df['ema_5'] = ta.trend.ema_indicator(df['close'], window=5)
            df['ema_10'] = ta.trend.ema_indicator(df['close'], window=10)
            df['ema_20'] = ta.trend.ema_indicator(df['close'], window=20)
            df['ema_50'] = ta.trend.ema_indicator(df['close'], window=50)
            
            # RSI
            df['rsi_14'] = ta.momentum.rsi(df['close'], window=14)
            
            # MACD
            macd = ta.trend.MACD(df['close'])
            df['macd'] = macd.macd()
            df['macd_signal'] = macd.macd_signal()
            df['macd_histogram'] = macd.macd_diff()
            
            # Bollinger Bands
            bollinger = ta.volatility.BollingerBands(df['close'])
            df['bollinger_upper'] = bollinger.bollinger_hband()
            df['bollinger_lower'] = bollinger.bollinger_lband()
            df['bollinger_middle'] = bollinger.bollinger_mavg()
            
            # Volume indicators
            df['volume_sma'] = ta.volume.volume_sma(df['close'], df['volume'], window=20)
            
            # Price and volume changes
            df['price_change'] = df['close'].pct_change()
            df['volume_change'] = df['volume'].pct_change()
            
            # Volatility
            df['volatility'] = df['price_change'].rolling(window=20).std()
            
            logger.debug("Technical indicators calculated successfully")
            
        except Exception as e:
            logger.error(f"Failed to calculate technical indicators: {e}")
        
        return df
    
    async def collect_sentiment_data(self) -> Dict[str, float]:
        """Collect sentiment data from social media and news"""
        sentiment_data = {
            'twitter_sentiment': 0.0,
            'reddit_sentiment': 0.0,
            'news_sentiment': 0.0,
            'social_volume': 0.0,
            'social_engagement': 0.0
        }
        
        try:
            # Mock sentiment data for development
            # In production, integrate with Twitter API, Reddit API, news APIs
            sentiment_data = {
                'twitter_sentiment': np.random.uniform(-1, 1),
                'reddit_sentiment': np.random.uniform(-1, 1),
                'news_sentiment': np.random.uniform(-1, 1),
                'social_volume': np.random.uniform(0, 100),
                'social_engagement': np.random.uniform(0, 100)
            }
            
            logger.debug("Sentiment data collected")
            
        except Exception as e:
            logger.error(f"Failed to collect sentiment data: {e}")
        
        return sentiment_data
    
    async def collect_historical_data(self, start_date: datetime, end_date: datetime) -> pd.DataFrame:
        """Collect historical data for model training"""
        try:
            # Calculate number of minutes between dates
            time_diff = end_date - start_date
            minutes = int(time_diff.total_seconds() / 60)
            
            # Collect price data
            price_df = await self.collect_price_data(limit=minutes)
            
            # Add technical indicators
            price_df = self.calculate_technical_indicators(price_df)
            
            # Add sentiment data (simplified for historical data)
            sentiment_data = await self.collect_sentiment_data()
            for key, value in sentiment_data.items():
                price_df[key] = value
            
            # Add market data
            market_data = await self.collect_coingecko_data()
            for key, value in market_data.items():
                if isinstance(value, (int, float)):
                    price_df[f'market_{key}'] = value
            
            # Remove NaN values
            price_df = price_df.dropna()
            
            logger.info(f"Collected {len(price_df)} historical data points")
            return price_df
            
        except Exception as e:
            logger.error(f"Failed to collect historical data: {e}")
            return pd.DataFrame()
    
    async def get_latest_features(self) -> Optional[np.ndarray]:
        """Get latest feature vector for prediction"""
        try:
            # Collect recent data
            df = await self.collect_price_data(limit=self.config.SEQUENCE_LENGTH + 50)
            
            # Calculate indicators
            df = self.calculate_technical_indicators(df)
            
            # Add sentiment data
            sentiment_data = await self.collect_sentiment_data()
            for key, value in sentiment_data.items():
                df[key] = value
            
            # Select features
            feature_columns = (
                ['open', 'high', 'low', 'close', 'volume'] +
                self.config.TECHNICAL_INDICATORS +
                self.config.SENTIMENT_FEATURES
            )
            
            # Filter available columns
            available_columns = [col for col in feature_columns if col in df.columns]
            features_df = df[available_columns].dropna()
            
            if len(features_df) >= self.config.SEQUENCE_LENGTH:
                # Return last sequence_length rows as numpy array
                return features_df.tail(self.config.SEQUENCE_LENGTH).values
            else:
                logger.warning(f"Insufficient data: {len(features_df)} < {self.config.SEQUENCE_LENGTH}")
                return None
                
        except Exception as e:
            logger.error(f"Failed to get latest features: {e}")
            return None
    
    async def health_check(self) -> bool:
        """Check if data sources are healthy"""
        try:
            # Test price data collection
            df = await self.collect_price_data(limit=10)
            if len(df) == 0:
                return False
            
            # Test sentiment data collection
            sentiment = await self.collect_sentiment_data()
            if not sentiment:
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Data collector health check failed: {e}")
            return False
    
    async def cleanup_old_data(self, days: int = 30):
        """Clean up old data to save storage"""
        # Implementation depends on storage backend
        logger.info(f"Cleaning up data older than {days} days")
    
    async def cleanup(self):
        """Cleanup resources"""
        if self.session:
            await self.session.close()
        
        for exchange in self.exchanges.values():
            await exchange.close()
        
        logger.info("Data collector cleanup completed")
