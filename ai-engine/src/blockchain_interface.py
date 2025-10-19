"""
Blockchain Interface for PREDIX AI
Handles interaction with Polygon smart contracts
"""

import logging
import asyncio
from typing import Dict, Optional, Any, Tuple
from datetime import datetime
import json

from web3 import Web3
from web3.middleware import geth_poa_middleware
from eth_account import Account
from eth_account.messages import encode_defunct

from .config import Config
from .utils.logger import setup_logger

logger = setup_logger(__name__)


class BlockchainInterface:
    """Interface for blockchain interactions"""
    
    def __init__(self, config: Config):
        self.config = config
        self.w3 = None
        self.account = None
        self.contracts = {}
        self.nonce = 0
        
    async def initialize(self):
        """Initialize blockchain connection"""
        try:
            logger.info("Initializing blockchain interface...")
            
            # Initialize Web3
            self.w3 = Web3(Web3.HTTPProvider(self.config.WEB3_PROVIDER_URL))
            
            # Add PoA middleware for Polygon
            self.w3.middleware_onion.inject(geth_poa_middleware, layer=0)
            
            # Check connection
            if not self.w3.is_connected():
                raise ConnectionError("Failed to connect to blockchain")
            
            # Initialize account
            self.account = Account.from_key(self.config.PRIVATE_KEY)
            logger.info(f"Using account: {self.account.address}")
            
            # Get initial nonce
            self.nonce = self.w3.eth.get_transaction_count(self.account.address)
            
            # Load contract ABIs and initialize contracts
            await self._load_contracts()
            
            logger.info("Blockchain interface initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize blockchain interface: {e}")
            raise
    
    async def _load_contracts(self):
        """Load smart contract ABIs and create contract instances"""
        try:
            # Contract ABIs (simplified for demo)
            round_manager_abi = [
                {
                    "inputs": [
                        {"name": "aiPrediction", "type": "uint8"},
                        {"name": "aiSignatureHash", "type": "bytes32"}
                    ],
                    "name": "createRound",
                    "outputs": [],
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
                {
                    "inputs": [{"name": "roundId", "type": "uint256"}],
                    "name": "getRound",
                    "outputs": [
                        {
                            "components": [
                                {"name": "id", "type": "uint256"},
                                {"name": "aiPrediction", "type": "uint8"},
                                {"name": "phase", "type": "uint8"},
                                {"name": "resolved", "type": "bool"}
                            ],
                            "name": "",
                            "type": "tuple"
                        }
                    ],
                    "stateMutability": "view",
                    "type": "function"
                }
            ]
            
            ai_oracle_abi = [
                {
                    "inputs": [
                        {"name": "roundId", "type": "uint256"},
                        {"name": "direction", "type": "uint8"},
                        {"name": "signatureHash", "type": "bytes32"}
                    ],
                    "name": "submitPrediction",
                    "outputs": [],
                    "stateMutability": "nonpayable",
                    "type": "function"
                }
            ]
            
            # Initialize contracts
            if self.config.ROUND_MANAGER_ADDRESS:
                self.contracts['round_manager'] = self.w3.eth.contract(
                    address=self.config.ROUND_MANAGER_ADDRESS,
                    abi=round_manager_abi
                )
            
            if self.config.AI_ORACLE_ADAPTER_ADDRESS:
                self.contracts['ai_oracle'] = self.w3.eth.contract(
                    address=self.config.AI_ORACLE_ADAPTER_ADDRESS,
                    abi=ai_oracle_abi
                )
            
            logger.info("Smart contracts loaded successfully")
            
        except Exception as e:
            logger.error(f"Failed to load contracts: {e}")
    
    async def create_round(self, prediction_direction: int, signature_hash: str) -> Optional[int]:
        """Create a new prediction round on-chain"""
        try:
            logger.info(f"Creating round with prediction: {'UP' if prediction_direction == 0 else 'DOWN'}")
            
            if 'ai_oracle' not in self.contracts:
                logger.error("AI Oracle contract not available")
                return None
            
            # Convert signature hash to bytes32
            signature_bytes = bytes.fromhex(signature_hash.replace('0x', ''))
            if len(signature_bytes) != 32:
                signature_bytes = signature_bytes[:32].ljust(32, b'\x00')
            
            # Get next round ID (simplified)
            round_id = int(datetime.now().timestamp()) % 1000000
            
            # Submit prediction to AI Oracle first
            await self._submit_prediction(round_id, prediction_direction, signature_bytes)
            
            # Create round
            if 'round_manager' in self.contracts:
                tx_hash = await self._send_transaction(
                    self.contracts['round_manager'].functions.createRound(
                        prediction_direction,
                        signature_bytes
                    )
                )
                
                if tx_hash:
                    logger.info(f"Round {round_id} created successfully. TX: {tx_hash}")
                    return round_id
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to create round: {e}")
            return None
    
    async def _submit_prediction(self, round_id: int, direction: int, signature_hash: bytes):
        """Submit prediction to AI Oracle contract"""
        try:
            tx_hash = await self._send_transaction(
                self.contracts['ai_oracle'].functions.submitPrediction(
                    round_id,
                    direction,
                    signature_hash
                )
            )
            
            if tx_hash:
                logger.info(f"Prediction submitted for round {round_id}. TX: {tx_hash}")
            
        except Exception as e:
            logger.error(f"Failed to submit prediction: {e}")
    
    async def _send_transaction(self, contract_function) -> Optional[str]:
        """Send transaction to blockchain"""
        try:
            # Build transaction
            transaction = contract_function.build_transaction({
                'chainId': self.config.CHAIN_ID,
                'gas': 500000,
                'gasPrice': self.w3.to_wei('30', 'gwei'),
                'nonce': self.nonce,
            })
            
            # Sign transaction
            signed_txn = self.w3.eth.account.sign_transaction(transaction, self.config.PRIVATE_KEY)
            
            # Send transaction
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            
            # Wait for confirmation
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
            
            if receipt.status == 1:
                self.nonce += 1
                return tx_hash.hex()
            else:
                logger.error(f"Transaction failed: {tx_hash.hex()}")
                return None
                
        except Exception as e:
            logger.error(f"Failed to send transaction: {e}")
            return None
    
    async def get_round_info(self, round_id: int) -> Optional[Dict]:
        """Get round information from blockchain"""
        try:
            if 'round_manager' not in self.contracts:
                return None
            
            round_info = self.contracts['round_manager'].functions.getRound(round_id).call()
            
            return {
                'id': round_info[0],
                'ai_prediction': round_info[1],
                'phase': round_info[2],
                'resolved': round_info[3]
            }
            
        except Exception as e:
            logger.error(f"Failed to get round info: {e}")
            return None
    
    async def sign_message(self, message: str) -> str:
        """Sign a message with the AI operator key"""
        try:
            # Create message hash
            message_hash = encode_defunct(text=message)
            
            # Sign message
            signed_message = self.w3.eth.account.sign_message(message_hash, self.config.PRIVATE_KEY)
            
            return signed_message.signature.hex()
            
        except Exception as e:
            logger.error(f"Failed to sign message: {e}")
            return ""
    
    async def get_pol_price(self) -> Optional[float]:
        """Get POL price from oracle (if available)"""
        try:
            if 'oracle_handler' not in self.contracts:
                return None
            
            # This would call the oracle contract to get latest price
            # For now, return None to use external price sources
            return None
            
        except Exception as e:
            logger.error(f"Failed to get POL price from oracle: {e}")
            return None
    
    async def get_account_balance(self) -> float:
        """Get account POL balance"""
        try:
            balance_wei = self.w3.eth.get_balance(self.account.address)
            balance_pol = self.w3.from_wei(balance_wei, 'ether')
            return float(balance_pol)
            
        except Exception as e:
            logger.error(f"Failed to get account balance: {e}")
            return 0.0
    
    async def estimate_gas_cost(self, contract_function) -> float:
        """Estimate gas cost for a transaction"""
        try:
            gas_estimate = contract_function.estimate_gas({
                'from': self.account.address
            })
            
            gas_price = self.w3.eth.gas_price
            cost_wei = gas_estimate * gas_price
            cost_pol = self.w3.from_wei(cost_wei, 'ether')
            
            return float(cost_pol)
            
        except Exception as e:
            logger.error(f"Failed to estimate gas cost: {e}")
            return 0.0
    
    async def health_check(self) -> bool:
        """Check blockchain connection health"""
        try:
            # Check Web3 connection
            if not self.w3.is_connected():
                return False
            
            # Check latest block
            latest_block = self.w3.eth.get_block('latest')
            if not latest_block:
                return False
            
            # Check account balance
            balance = await self.get_account_balance()
            if balance < 0.01:  # Minimum balance for transactions
                logger.warning(f"Low account balance: {balance} POL")
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Blockchain health check failed: {e}")
            return False
    
    def get_network_info(self) -> Dict[str, Any]:
        """Get network information"""
        try:
            latest_block = self.w3.eth.get_block('latest')
            
            return {
                'chain_id': self.config.CHAIN_ID,
                'network_name': self.config.network_name,
                'latest_block': latest_block.number,
                'account_address': self.account.address if self.account else None,
                'is_connected': self.w3.is_connected() if self.w3 else False
            }
            
        except Exception as e:
            logger.error(f"Failed to get network info: {e}")
            return {}
    
    async def cleanup(self):
        """Cleanup blockchain interface"""
        logger.info("Blockchain interface cleanup completed")
