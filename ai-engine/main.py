#!/usr/bin/env python3
"""
PREDIX AI - AI Prediction Engine
Main entry point for the AI prediction system
"""

import asyncio
import logging
import os
import signal
import sys
from datetime import datetime, timedelta
from typing import Optional

import schedule
from dotenv import load_dotenv

from src.prediction_engine import PredictionEngine
from src.data_collector import DataCollector
from src.blockchain_interface import BlockchainInterface
from src.model_trainer import ModelTrainer
from src.api_server import create_app
from src.config import Config
from src.utils.logger import setup_logger

# Load environment variables
load_dotenv()

# Setup logging
logger = setup_logger(__name__)

class PredixAI:
    """Main PREDIX AI application class"""
    
    def __init__(self):
        self.config = Config()
        self.data_collector = DataCollector(self.config)
        self.blockchain_interface = BlockchainInterface(self.config)
        self.model_trainer = ModelTrainer(self.config)
        self.prediction_engine = PredictionEngine(
            self.config,
            self.data_collector,
            self.blockchain_interface,
            self.model_trainer
        )
        self.running = False
        
    async def initialize(self):
        """Initialize all components"""
        logger.info("Initializing PREDIX AI system...")
        
        try:
            # Initialize blockchain connection
            await self.blockchain_interface.initialize()
            logger.info("Blockchain interface initialized")
            
            # Initialize data collector
            await self.data_collector.initialize()
            logger.info("Data collector initialized")
            
            # Load or train initial model
            if not self.model_trainer.model_exists():
                logger.info("No existing model found, training initial model...")
                await self.train_initial_model()
            else:
                logger.info("Loading existing model...")
                self.model_trainer.load_model()
            
            # Initialize prediction engine
            await self.prediction_engine.initialize()
            logger.info("Prediction engine initialized")
            
            logger.info("PREDIX AI system initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize PREDIX AI: {e}")
            raise
    
    async def train_initial_model(self):
        """Train initial LSTM model with historical data"""
        logger.info("Collecting historical data for initial training...")
        
        # Collect 30 days of historical data
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        
        historical_data = await self.data_collector.collect_historical_data(
            start_date, end_date
        )
        
        if len(historical_data) < 100:
            raise ValueError("Insufficient historical data for training")
        
        # Train the model
        logger.info("Training initial LSTM model...")
        self.model_trainer.train_model(historical_data)
        logger.info("Initial model training completed")
    
    def schedule_jobs(self):
        """Schedule recurring jobs"""
        # Main prediction job every 10 minutes
        schedule.every(10).minutes.do(self.run_prediction_cycle)
        
        # Model retraining every 24 hours
        schedule.every(24).hours.do(self.retrain_model)
        
        # Data cleanup every week
        schedule.every().week.do(self.cleanup_old_data)
        
        # Health check every hour
        schedule.every().hour.do(self.health_check)
        
        logger.info("Jobs scheduled successfully")
    
    async def run_prediction_cycle(self):
        """Run a complete prediction cycle"""
        try:
            logger.info("Starting prediction cycle...")
            
            # Generate prediction
            prediction_result = await self.prediction_engine.generate_prediction()
            
            if prediction_result:
                logger.info(f"Prediction generated: {prediction_result}")
                
                # Create round on blockchain
                round_id = await self.blockchain_interface.create_round(
                    prediction_result['direction'],
                    prediction_result['signature_hash']
                )
                
                logger.info(f"Round {round_id} created successfully")
            else:
                logger.warning("Failed to generate prediction")
                
        except Exception as e:
            logger.error(f"Error in prediction cycle: {e}")
    
    async def retrain_model(self):
        """Retrain the model with recent data"""
        try:
            logger.info("Starting model retraining...")
            
            # Collect recent data
            end_date = datetime.now()
            start_date = end_date - timedelta(days=7)
            
            recent_data = await self.data_collector.collect_historical_data(
                start_date, end_date
            )
            
            # Retrain model
            self.model_trainer.retrain_model(recent_data)
            
            # Update prediction engine with new model
            await self.prediction_engine.update_model()
            
            logger.info("Model retraining completed")
            
        except Exception as e:
            logger.error(f"Error in model retraining: {e}")
    
    async def cleanup_old_data(self):
        """Clean up old data to save storage"""
        try:
            logger.info("Starting data cleanup...")
            await self.data_collector.cleanup_old_data(days=30)
            logger.info("Data cleanup completed")
        except Exception as e:
            logger.error(f"Error in data cleanup: {e}")
    
    async def health_check(self):
        """Perform system health check"""
        try:
            # Check blockchain connection
            blockchain_healthy = await self.blockchain_interface.health_check()
            
            # Check data sources
            data_healthy = await self.data_collector.health_check()
            
            # Check model status
            model_healthy = self.model_trainer.health_check()
            
            health_status = {
                'blockchain': blockchain_healthy,
                'data_sources': data_healthy,
                'model': model_healthy,
                'timestamp': datetime.now().isoformat()
            }
            
            if all(health_status.values()):
                logger.info("System health check passed")
            else:
                logger.warning(f"System health issues detected: {health_status}")
                
        except Exception as e:
            logger.error(f"Error in health check: {e}")
    
    async def run_scheduler(self):
        """Run the job scheduler"""
        while self.running:
            schedule.run_pending()
            await asyncio.sleep(1)
    
    async def start(self):
        """Start the PREDIX AI system"""
        self.running = True
        logger.info("Starting PREDIX AI system...")
        
        # Initialize system
        await self.initialize()
        
        # Schedule jobs
        self.schedule_jobs()
        
        # Start scheduler
        scheduler_task = asyncio.create_task(self.run_scheduler())
        
        # Start API server
        if self.config.ENABLE_API_SERVER:
            app = create_app(self)
            import uvicorn
            config = uvicorn.Config(
                app, 
                host=self.config.API_HOST, 
                port=self.config.API_PORT,
                log_level="info"
            )
            server = uvicorn.Server(config)
            api_task = asyncio.create_task(server.serve())
            
            # Wait for both tasks
            await asyncio.gather(scheduler_task, api_task)
        else:
            await scheduler_task
    
    async def stop(self):
        """Stop the PREDIX AI system"""
        logger.info("Stopping PREDIX AI system...")
        self.running = False
        
        # Cleanup resources
        await self.blockchain_interface.cleanup()
        await self.data_collector.cleanup()
        
        logger.info("PREDIX AI system stopped")

def signal_handler(signum, frame):
    """Handle shutdown signals"""
    logger.info(f"Received signal {signum}, shutting down...")
    sys.exit(0)

async def main():
    """Main entry point"""
    # Setup signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Create and start PREDIX AI
    predix_ai = PredixAI()
    
    try:
        await predix_ai.start()
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt")
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        raise
    finally:
        await predix_ai.stop()

if __name__ == "__main__":
    asyncio.run(main())
