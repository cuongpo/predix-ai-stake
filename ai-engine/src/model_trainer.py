"""
LSTM Model Trainer for PREDIX AI
Trains and manages the neural network model for POL price predictions
"""

import os
import logging
import numpy as np
import pandas as pd
from typing import Tuple, Optional, Dict, Any
from datetime import datetime
import joblib

import tensorflow as tf
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import LSTM, Dense, Dropout, BatchNormalization
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau, ModelCheckpoint
from sklearn.preprocessing import MinMaxScaler, StandardScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score

from .config import Config
from .utils.logger import setup_logger

logger = setup_logger(__name__)


class ModelTrainer:
    """LSTM model trainer for POL price predictions"""
    
    def __init__(self, config: Config):
        self.config = config
        self.model = None
        self.scaler = None
        self.feature_scaler = None
        self.is_trained = False
        
        # Model architecture parameters
        self.lstm_units = [128, 64, 32]
        self.dropout_rate = 0.2
        self.dense_units = [32, 16]
        
        # Ensure model directory exists
        os.makedirs(os.path.dirname(self.config.MODEL_PATH), exist_ok=True)
    
    def prepare_data(self, df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """Prepare data for LSTM training"""
        try:
            logger.info("Preparing data for LSTM training...")
            
            # Select features
            feature_columns = (
                ['open', 'high', 'low', 'close', 'volume'] +
                self.config.TECHNICAL_INDICATORS +
                self.config.SENTIMENT_FEATURES
            )
            
            # Filter available columns
            available_columns = [col for col in feature_columns if col in df.columns]
            features_df = df[available_columns].copy()
            
            # Handle missing values
            features_df = features_df.fillna(method='ffill').fillna(method='bfill')
            
            # Create target variable (price direction)
            # 1 if price goes up in next period, 0 if down
            df['future_close'] = df['close'].shift(-self.config.PREDICTION_HORIZON)
            df['price_direction'] = (df['future_close'] > df['close']).astype(int)
            
            # Remove rows with NaN targets
            valid_indices = df['price_direction'].notna()
            features_df = features_df[valid_indices]
            targets = df['price_direction'][valid_indices].values
            
            # Scale features
            if self.feature_scaler is None:
                self.feature_scaler = StandardScaler()
                scaled_features = self.feature_scaler.fit_transform(features_df)
            else:
                scaled_features = self.feature_scaler.transform(features_df)
            
            # Create sequences for LSTM
            X, y = self._create_sequences(scaled_features, targets)
            
            logger.info(f"Data prepared: {X.shape[0]} sequences, {X.shape[2]} features")
            return X, y
            
        except Exception as e:
            logger.error(f"Failed to prepare data: {e}")
            raise
    
    def _create_sequences(self, features: np.ndarray, targets: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """Create sequences for LSTM input"""
        X, y = [], []
        
        for i in range(self.config.SEQUENCE_LENGTH, len(features)):
            X.append(features[i-self.config.SEQUENCE_LENGTH:i])
            y.append(targets[i])
        
        return np.array(X), np.array(y)
    
    def build_model(self, input_shape: Tuple[int, int]) -> Sequential:
        """Build LSTM model architecture"""
        try:
            model = Sequential()
            
            # First LSTM layer
            model.add(LSTM(
                units=self.lstm_units[0],
                return_sequences=True,
                input_shape=input_shape,
                name='lstm_1'
            ))
            model.add(Dropout(self.dropout_rate))
            model.add(BatchNormalization())
            
            # Second LSTM layer
            model.add(LSTM(
                units=self.lstm_units[1],
                return_sequences=True,
                name='lstm_2'
            ))
            model.add(Dropout(self.dropout_rate))
            model.add(BatchNormalization())
            
            # Third LSTM layer
            model.add(LSTM(
                units=self.lstm_units[2],
                return_sequences=False,
                name='lstm_3'
            ))
            model.add(Dropout(self.dropout_rate))
            model.add(BatchNormalization())
            
            # Dense layers
            for i, units in enumerate(self.dense_units):
                model.add(Dense(units, activation='relu', name=f'dense_{i+1}'))
                model.add(Dropout(self.dropout_rate))
                model.add(BatchNormalization())
            
            # Output layer (binary classification)
            model.add(Dense(1, activation='sigmoid', name='output'))
            
            # Compile model
            optimizer = Adam(learning_rate=self.config.LEARNING_RATE)
            model.compile(
                optimizer=optimizer,
                loss='binary_crossentropy',
                metrics=['accuracy', 'precision', 'recall']
            )
            
            logger.info("LSTM model built successfully")
            logger.info(f"Model summary: {model.count_params()} parameters")
            
            return model
            
        except Exception as e:
            logger.error(f"Failed to build model: {e}")
            raise
    
    def train_model(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Train the LSTM model"""
        try:
            logger.info("Starting model training...")
            
            # Prepare data
            X, y = self.prepare_data(df)
            
            if len(X) < 100:
                raise ValueError("Insufficient data for training")
            
            # Split data
            split_idx = int(len(X) * (1 - self.config.VALIDATION_SPLIT))
            X_train, X_val = X[:split_idx], X[split_idx:]
            y_train, y_val = y[:split_idx], y[split_idx:]
            
            # Build model
            input_shape = (X.shape[1], X.shape[2])
            self.model = self.build_model(input_shape)
            
            # Callbacks
            callbacks = [
                EarlyStopping(
                    monitor='val_loss',
                    patience=10,
                    restore_best_weights=True
                ),
                ReduceLROnPlateau(
                    monitor='val_loss',
                    factor=0.5,
                    patience=5,
                    min_lr=1e-7
                ),
                ModelCheckpoint(
                    filepath=self.config.MODEL_PATH,
                    monitor='val_accuracy',
                    save_best_only=True,
                    save_weights_only=False
                )
            ]
            
            # Train model
            history = self.model.fit(
                X_train, y_train,
                batch_size=self.config.BATCH_SIZE,
                epochs=self.config.EPOCHS,
                validation_data=(X_val, y_val),
                callbacks=callbacks,
                verbose=1
            )
            
            # Evaluate model
            train_metrics = self._evaluate_model(X_train, y_train, "Training")
            val_metrics = self._evaluate_model(X_val, y_val, "Validation")
            
            # Save model and scaler
            self.save_model()
            self.is_trained = True
            
            training_results = {
                'train_metrics': train_metrics,
                'val_metrics': val_metrics,
                'history': history.history,
                'training_samples': len(X_train),
                'validation_samples': len(X_val)
            }
            
            logger.info("Model training completed successfully")
            logger.info(f"Validation Accuracy: {val_metrics['accuracy']:.4f}")
            
            return training_results
            
        except Exception as e:
            logger.error(f"Failed to train model: {e}")
            raise
    
    def _evaluate_model(self, X: np.ndarray, y: np.ndarray, dataset_name: str) -> Dict[str, float]:
        """Evaluate model performance"""
        try:
            # Predictions
            y_pred_prob = self.model.predict(X, verbose=0)
            y_pred = (y_pred_prob > 0.5).astype(int).flatten()
            
            # Metrics
            metrics = {
                'accuracy': accuracy_score(y, y_pred),
                'precision': precision_score(y, y_pred, zero_division=0),
                'recall': recall_score(y, y_pred, zero_division=0),
                'f1_score': f1_score(y, y_pred, zero_division=0)
            }
            
            logger.info(f"{dataset_name} Metrics: {metrics}")
            return metrics
            
        except Exception as e:
            logger.error(f"Failed to evaluate model: {e}")
            return {}
    
    def predict(self, features: np.ndarray) -> Tuple[int, float]:
        """Make prediction using trained model"""
        try:
            if not self.is_trained or self.model is None:
                raise ValueError("Model not trained")
            
            if self.feature_scaler is None:
                raise ValueError("Feature scaler not available")
            
            # Ensure correct shape
            if len(features.shape) == 2:
                features = features.reshape(1, features.shape[0], features.shape[1])
            
            # Scale features
            scaled_features = self.feature_scaler.transform(
                features.reshape(-1, features.shape[-1])
            ).reshape(features.shape)
            
            # Predict
            prediction_prob = self.model.predict(scaled_features, verbose=0)[0][0]
            prediction_class = int(prediction_prob > 0.5)
            
            return prediction_class, float(prediction_prob)
            
        except Exception as e:
            logger.error(f"Failed to make prediction: {e}")
            raise
    
    def retrain_model(self, new_data: pd.DataFrame):
        """Retrain model with new data"""
        try:
            logger.info("Retraining model with new data...")
            
            if not self.is_trained:
                logger.warning("No existing model to retrain, training from scratch")
                return self.train_model(new_data)
            
            # Prepare new data
            X_new, y_new = self.prepare_data(new_data)
            
            if len(X_new) < 50:
                logger.warning("Insufficient new data for retraining")
                return
            
            # Fine-tune existing model
            history = self.model.fit(
                X_new, y_new,
                batch_size=self.config.BATCH_SIZE,
                epochs=min(20, self.config.EPOCHS // 5),  # Fewer epochs for fine-tuning
                validation_split=0.2,
                verbose=1
            )
            
            # Save updated model
            self.save_model()
            
            logger.info("Model retraining completed")
            
        except Exception as e:
            logger.error(f"Failed to retrain model: {e}")
    
    def save_model(self):
        """Save model and scaler"""
        try:
            if self.model is not None:
                self.model.save(self.config.MODEL_PATH)
                logger.info(f"Model saved to {self.config.MODEL_PATH}")
            
            if self.feature_scaler is not None:
                scaler_path = self.config.MODEL_PATH.replace('.h5', '_scaler.pkl')
                joblib.dump(self.feature_scaler, scaler_path)
                logger.info(f"Scaler saved to {scaler_path}")
                
        except Exception as e:
            logger.error(f"Failed to save model: {e}")
    
    def load_model(self) -> bool:
        """Load saved model and scaler"""
        try:
            if os.path.exists(self.config.MODEL_PATH):
                self.model = load_model(self.config.MODEL_PATH)
                self.is_trained = True
                logger.info(f"Model loaded from {self.config.MODEL_PATH}")
                
                # Load scaler
                scaler_path = self.config.MODEL_PATH.replace('.h5', '_scaler.pkl')
                if os.path.exists(scaler_path):
                    self.feature_scaler = joblib.load(scaler_path)
                    logger.info(f"Scaler loaded from {scaler_path}")
                
                return True
            else:
                logger.warning(f"Model file not found: {self.config.MODEL_PATH}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            return False
    
    def model_exists(self) -> bool:
        """Check if model file exists"""
        return os.path.exists(self.config.MODEL_PATH)
    
    def health_check(self) -> bool:
        """Check model health"""
        try:
            if not self.is_trained or self.model is None:
                return False
            
            # Test prediction with dummy data
            dummy_input = np.random.random((1, self.config.SEQUENCE_LENGTH, self.config.FEATURE_COUNT))
            _ = self.model.predict(dummy_input, verbose=0)
            
            return True
            
        except Exception as e:
            logger.error(f"Model health check failed: {e}")
            return False
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get model information"""
        if not self.is_trained or self.model is None:
            return {"status": "not_trained"}
        
        return {
            "status": "trained",
            "parameters": self.model.count_params(),
            "input_shape": self.model.input_shape,
            "output_shape": self.model.output_shape,
            "layers": len(self.model.layers),
            "model_path": self.config.MODEL_PATH
        }
