"""
Prediction Engine for PREDIX AI
Generates AI predictions and manages prediction lifecycle
"""

import logging
import numpy as np
import hashlib
from datetime import datetime
from typing import Dict, Optional, Tuple, Any
from dataclasses import dataclass

from .config import Config
from .data_collector import DataCollector
from .model_trainer import ModelTrainer
from .blockchain_interface import BlockchainInterface
from .utils.logger import setup_logger

logger = setup_logger(__name__)


@dataclass
class PredictionResult:
    """Data class for prediction results"""
    direction: int  # 0 = UP, 1 = DOWN
    confidence: float
    timestamp: datetime
    features_hash: str
    signature_hash: str
    model_version: str
    metadata: Dict[str, Any]


class PredictionEngine:
    """Main prediction engine for PREDIX AI"""
    
    def __init__(
        self, 
        config: Config,
        data_collector: DataCollector,
        blockchain_interface: BlockchainInterface,
        model_trainer: ModelTrainer
    ):
        self.config = config
        self.data_collector = data_collector
        self.blockchain_interface = blockchain_interface
        self.model_trainer = model_trainer
        
        # Prediction tracking
        self.consecutive_losses = 0
        self.total_predictions = 0
        self.correct_predictions = 0
        self.prediction_history = []
        
        # Risk management
        self.emergency_stop = False
        self.last_prediction_time = None
    
    async def initialize(self):
        """Initialize prediction engine"""
        logger.info("Initializing prediction engine...")
        
        # Verify model is loaded
        if not self.model_trainer.is_trained:
            raise ValueError("Model must be trained before initializing prediction engine")
        
        logger.info("Prediction engine initialized successfully")
    
    async def generate_prediction(self) -> Optional[PredictionResult]:
        """Generate a new prediction"""
        try:
            logger.info("Generating new prediction...")
            
            # Check if emergency stop is active
            if self.emergency_stop:
                logger.warning("Emergency stop active, skipping prediction")
                return None
            
            # Collect latest features
            features = await self.data_collector.get_latest_features()
            if features is None:
                logger.error("Failed to collect features for prediction")
                return None
            
            # Make prediction
            direction, confidence = self.model_trainer.predict(features)
            
            # Check confidence threshold
            if confidence < self.config.CONFIDENCE_THRESHOLD:
                logger.info(f"Prediction confidence {confidence:.3f} below threshold {self.config.CONFIDENCE_THRESHOLD}")
                return None
            
            # Create prediction result
            prediction_result = await self._create_prediction_result(
                direction, confidence, features
            )
            
            # Update tracking
            self.total_predictions += 1
            self.last_prediction_time = datetime.now()
            self.prediction_history.append(prediction_result)
            
            # Keep only last 100 predictions in memory
            if len(self.prediction_history) > 100:
                self.prediction_history = self.prediction_history[-100:]
            
            logger.info(f"Prediction generated: {'UP' if direction == 0 else 'DOWN'} with confidence {confidence:.3f}")
            return prediction_result
            
        except Exception as e:
            logger.error(f"Failed to generate prediction: {e}")
            return None
    
    async def _create_prediction_result(
        self, 
        direction: int, 
        confidence: float, 
        features: np.ndarray
    ) -> PredictionResult:
        """Create a prediction result with signature"""
        timestamp = datetime.now()
        
        # Create features hash
        features_hash = hashlib.sha256(features.tobytes()).hexdigest()
        
        # Create prediction data for signing
        prediction_data = {
            'direction': direction,
            'confidence': confidence,
            'timestamp': timestamp.isoformat(),
            'features_hash': features_hash,
            'model_version': self._get_model_version()
        }
        
        # Create signature hash
        signature_hash = await self._create_signature_hash(prediction_data)
        
        # Additional metadata
        metadata = {
            'total_predictions': self.total_predictions,
            'consecutive_losses': self.consecutive_losses,
            'accuracy': self._calculate_accuracy(),
            'feature_count': features.shape[-1] if len(features.shape) > 1 else len(features)
        }
        
        return PredictionResult(
            direction=direction,
            confidence=confidence,
            timestamp=timestamp,
            features_hash=features_hash,
            signature_hash=signature_hash,
            model_version=prediction_data['model_version'],
            metadata=metadata
        )
    
    async def _create_signature_hash(self, prediction_data: Dict) -> str:
        """Create cryptographic signature hash for prediction"""
        try:
            # Create message to sign
            message = f"{prediction_data['direction']}{prediction_data['timestamp']}{prediction_data['features_hash']}"
            
            # Sign with blockchain interface
            signature = await self.blockchain_interface.sign_message(message)
            
            # Return hash of signature
            return hashlib.sha256(signature.encode()).hexdigest()
            
        except Exception as e:
            logger.error(f"Failed to create signature hash: {e}")
            # Fallback to simple hash
            message = str(prediction_data)
            return hashlib.sha256(message.encode()).hexdigest()
    
    def _get_model_version(self) -> str:
        """Get current model version"""
        try:
            model_info = self.model_trainer.get_model_info()
            return f"v1.0_{model_info.get('parameters', 0)}"
        except:
            return "v1.0_unknown"
    
    def _calculate_accuracy(self) -> float:
        """Calculate current prediction accuracy"""
        if self.total_predictions == 0:
            return 0.0
        return self.correct_predictions / self.total_predictions
    
    async def update_prediction_result(self, round_id: int, actual_outcome: int):
        """Update prediction result with actual outcome"""
        try:
            # Find prediction for this round
            prediction = None
            for pred in self.prediction_history:
                if hasattr(pred, 'round_id') and pred.round_id == round_id:
                    prediction = pred
                    break
            
            if prediction is None:
                logger.warning(f"No prediction found for round {round_id}")
                return
            
            # Check if prediction was correct
            was_correct = prediction.direction == actual_outcome
            
            if was_correct:
                self.correct_predictions += 1
                self.consecutive_losses = 0
                logger.info(f"Prediction for round {round_id} was CORRECT")
            else:
                self.consecutive_losses += 1
                logger.info(f"Prediction for round {round_id} was INCORRECT")
            
            # Check for emergency stop conditions
            await self._check_emergency_conditions()
            
        except Exception as e:
            logger.error(f"Failed to update prediction result: {e}")
    
    async def _check_emergency_conditions(self):
        """Check if emergency stop should be activated"""
        try:
            # Check consecutive losses
            if self.consecutive_losses >= self.config.MAX_CONSECUTIVE_LOSSES:
                logger.warning(f"Emergency stop: {self.consecutive_losses} consecutive losses")
                self.emergency_stop = True
                return
            
            # Check overall accuracy
            accuracy = self._calculate_accuracy()
            if (self.total_predictions >= 10 and 
                accuracy < self.config.EMERGENCY_STOP_THRESHOLD):
                logger.warning(f"Emergency stop: Low accuracy {accuracy:.3f}")
                self.emergency_stop = True
                return
            
            # Reset emergency stop if conditions improve
            if (self.emergency_stop and 
                self.consecutive_losses == 0 and 
                accuracy >= self.config.CONFIDENCE_THRESHOLD):
                logger.info("Emergency stop deactivated - conditions improved")
                self.emergency_stop = False
                
        except Exception as e:
            logger.error(f"Failed to check emergency conditions: {e}")
    
    async def update_model(self):
        """Update prediction engine with new model"""
        try:
            logger.info("Updating prediction engine with new model...")
            
            # Reload model
            if self.model_trainer.load_model():
                logger.info("Model updated successfully")
                
                # Reset some tracking metrics
                self.consecutive_losses = 0
                self.emergency_stop = False
            else:
                logger.error("Failed to update model")
                
        except Exception as e:
            logger.error(f"Failed to update model: {e}")
    
    def get_prediction_stats(self) -> Dict[str, Any]:
        """Get prediction statistics"""
        return {
            'total_predictions': self.total_predictions,
            'correct_predictions': self.correct_predictions,
            'accuracy': self._calculate_accuracy(),
            'consecutive_losses': self.consecutive_losses,
            'emergency_stop': self.emergency_stop,
            'last_prediction_time': self.last_prediction_time.isoformat() if self.last_prediction_time else None,
            'model_version': self._get_model_version()
        }
    
    def get_recent_predictions(self, limit: int = 10) -> list:
        """Get recent predictions"""
        return [
            {
                'direction': 'UP' if pred.direction == 0 else 'DOWN',
                'confidence': pred.confidence,
                'timestamp': pred.timestamp.isoformat(),
                'signature_hash': pred.signature_hash[:16] + '...',  # Truncated for display
                'metadata': pred.metadata
            }
            for pred in self.prediction_history[-limit:]
        ]
    
    async def manual_override(self, direction: int, confidence: float = 0.9) -> Optional[PredictionResult]:
        """Manual prediction override (for testing/emergency)"""
        try:
            logger.warning(f"Manual prediction override: {'UP' if direction == 0 else 'DOWN'}")
            
            # Create dummy features
            dummy_features = np.random.random((self.config.SEQUENCE_LENGTH, self.config.FEATURE_COUNT))
            
            # Create prediction result
            prediction_result = await self._create_prediction_result(
                direction, confidence, dummy_features
            )
            
            # Mark as manual override
            prediction_result.metadata['manual_override'] = True
            
            return prediction_result
            
        except Exception as e:
            logger.error(f"Failed to create manual override: {e}")
            return None
    
    def reset_emergency_stop(self):
        """Reset emergency stop (manual intervention)"""
        logger.info("Emergency stop reset manually")
        self.emergency_stop = False
        self.consecutive_losses = 0
    
    async def health_check(self) -> bool:
        """Check prediction engine health"""
        try:
            # Check model health
            if not self.model_trainer.health_check():
                return False
            
            # Check data collector health
            if not await self.data_collector.health_check():
                return False
            
            # Check blockchain interface health
            if not await self.blockchain_interface.health_check():
                return False
            
            # Check if emergency stop is active
            if self.emergency_stop:
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Prediction engine health check failed: {e}")
            return False
