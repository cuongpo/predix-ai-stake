"""
FastAPI server for PREDIX AI
Provides REST API endpoints for monitoring and control
"""

import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import asyncio

from .utils.logger import setup_logger

logger = setup_logger(__name__)

# Security
security = HTTPBearer()

# Pydantic models
class PredictionResponse(BaseModel):
    direction: str
    confidence: float
    timestamp: str
    signature_hash: str
    metadata: Dict[str, Any]

class SystemStatus(BaseModel):
    status: str
    uptime: str
    total_predictions: int
    accuracy: float
    emergency_stop: bool
    last_prediction: Optional[str]

class ManualPredictionRequest(BaseModel):
    direction: str  # "UP" or "DOWN"
    confidence: float = 0.9

def create_app(predix_ai) -> FastAPI:
    """Create FastAPI application"""
    
    app = FastAPI(
        title="PREDIX AI API",
        description="AI Prediction Engine for POL Token",
        version="1.0.0"
    )
    
    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Configure appropriately for production
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Store reference to main app
    app.predix_ai = predix_ai
    
    # Authentication dependency
    async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
        """Verify API token (simplified for demo)"""
        if credentials.credentials != predix_ai.config.API_SECRET_KEY:
            raise HTTPException(status_code=401, detail="Invalid token")
        return credentials
    
    @app.get("/")
    async def root():
        """Root endpoint"""
        return {"message": "PREDIX AI - Polygon Prediction Engine", "version": "1.0.0"}
    
    @app.get("/health")
    async def health_check():
        """Health check endpoint"""
        try:
            is_healthy = await predix_ai.prediction_engine.health_check()
            
            return {
                "status": "healthy" if is_healthy else "unhealthy",
                "timestamp": datetime.now().isoformat(),
                "components": {
                    "blockchain": await predix_ai.blockchain_interface.health_check(),
                    "data_collector": await predix_ai.data_collector.health_check(),
                    "model": predix_ai.model_trainer.health_check(),
                    "prediction_engine": is_healthy
                }
            }
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return {"status": "error", "message": str(e)}
    
    @app.get("/status", response_model=SystemStatus)
    async def get_system_status():
        """Get system status"""
        try:
            stats = predix_ai.prediction_engine.get_prediction_stats()
            
            return SystemStatus(
                status="running" if not stats['emergency_stop'] else "emergency_stop",
                uptime="N/A",  # Would calculate from start time
                total_predictions=stats['total_predictions'],
                accuracy=stats['accuracy'],
                emergency_stop=stats['emergency_stop'],
                last_prediction=stats['last_prediction_time']
            )
        except Exception as e:
            logger.error(f"Failed to get system status: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.get("/predictions/latest")
    async def get_latest_prediction():
        """Get latest prediction"""
        try:
            predictions = predix_ai.prediction_engine.get_recent_predictions(limit=1)
            
            if not predictions:
                raise HTTPException(status_code=404, detail="No predictions available")
            
            return predictions[0]
        except Exception as e:
            logger.error(f"Failed to get latest prediction: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.get("/predictions/recent")
    async def get_recent_predictions(limit: int = 10):
        """Get recent predictions"""
        try:
            predictions = predix_ai.prediction_engine.get_recent_predictions(limit=limit)
            return {"predictions": predictions}
        except Exception as e:
            logger.error(f"Failed to get recent predictions: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.post("/predictions/generate")
    async def generate_prediction(credentials: HTTPAuthorizationCredentials = Depends(verify_token)):
        """Manually trigger prediction generation"""
        try:
            prediction = await predix_ai.prediction_engine.generate_prediction()
            
            if prediction is None:
                raise HTTPException(status_code=400, detail="Failed to generate prediction")
            
            return {
                "direction": "UP" if prediction.direction == 0 else "DOWN",
                "confidence": prediction.confidence,
                "timestamp": prediction.timestamp.isoformat(),
                "signature_hash": prediction.signature_hash,
                "metadata": prediction.metadata
            }
        except Exception as e:
            logger.error(f"Failed to generate prediction: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.post("/predictions/manual")
    async def manual_prediction(
        request: ManualPredictionRequest,
        credentials: HTTPAuthorizationCredentials = Depends(verify_token)
    ):
        """Create manual prediction override"""
        try:
            direction = 0 if request.direction.upper() == "UP" else 1
            
            prediction = await predix_ai.prediction_engine.manual_override(
                direction, request.confidence
            )
            
            if prediction is None:
                raise HTTPException(status_code=400, detail="Failed to create manual prediction")
            
            return {
                "direction": request.direction.upper(),
                "confidence": prediction.confidence,
                "timestamp": prediction.timestamp.isoformat(),
                "signature_hash": prediction.signature_hash,
                "metadata": prediction.metadata
            }
        except Exception as e:
            logger.error(f"Failed to create manual prediction: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.get("/model/info")
    async def get_model_info():
        """Get model information"""
        try:
            model_info = predix_ai.model_trainer.get_model_info()
            return model_info
        except Exception as e:
            logger.error(f"Failed to get model info: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.post("/model/retrain")
    async def retrain_model(
        background_tasks: BackgroundTasks,
        credentials: HTTPAuthorizationCredentials = Depends(verify_token)
    ):
        """Trigger model retraining"""
        try:
            background_tasks.add_task(predix_ai.retrain_model)
            return {"message": "Model retraining started"}
        except Exception as e:
            logger.error(f"Failed to start model retraining: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.get("/blockchain/info")
    async def get_blockchain_info():
        """Get blockchain network information"""
        try:
            network_info = predix_ai.blockchain_interface.get_network_info()
            balance = await predix_ai.blockchain_interface.get_account_balance()
            
            return {
                **network_info,
                "account_balance": balance
            }
        except Exception as e:
            logger.error(f"Failed to get blockchain info: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.post("/emergency/stop")
    async def emergency_stop(credentials: HTTPAuthorizationCredentials = Depends(verify_token)):
        """Activate emergency stop"""
        try:
            predix_ai.prediction_engine.emergency_stop = True
            logger.warning("Emergency stop activated via API")
            return {"message": "Emergency stop activated"}
        except Exception as e:
            logger.error(f"Failed to activate emergency stop: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.post("/emergency/reset")
    async def reset_emergency_stop(credentials: HTTPAuthorizationCredentials = Depends(verify_token)):
        """Reset emergency stop"""
        try:
            predix_ai.prediction_engine.reset_emergency_stop()
            logger.info("Emergency stop reset via API")
            return {"message": "Emergency stop reset"}
        except Exception as e:
            logger.error(f"Failed to reset emergency stop: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.get("/data/latest")
    async def get_latest_data():
        """Get latest market data"""
        try:
            # Get latest features
            features = await predix_ai.data_collector.get_latest_features()
            
            if features is None:
                raise HTTPException(status_code=404, detail="No data available")
            
            # Get additional market data
            market_data = await predix_ai.data_collector.collect_coingecko_data()
            sentiment_data = await predix_ai.data_collector.collect_sentiment_data()
            
            return {
                "timestamp": datetime.now().isoformat(),
                "features_shape": features.shape if features is not None else None,
                "market_data": market_data,
                "sentiment_data": sentiment_data
            }
        except Exception as e:
            logger.error(f"Failed to get latest data: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    return app
