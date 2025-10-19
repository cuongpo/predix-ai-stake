import { Request, Response, NextFunction } from 'express';
import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { logger } from '../utils/logger';
import { ApiResponse } from '../types/api';

export interface AuthenticatedRequest extends Request {
  user?: {
    address: string;
    signature: string;
  };
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(
        ApiResponse.error('No token provided', 401)
      );
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as any;
      
      // Verify the signature is still valid
      if (decoded.address && decoded.signature) {
        const isValid = await verifySignature(decoded.address, decoded.signature, decoded.message);
        
        if (isValid) {
          req.user = {
            address: decoded.address,
            signature: decoded.signature
          };
          next();
        } else {
          return res.status(401).json(
            ApiResponse.error('Invalid signature', 401)
          );
        }
      } else {
        return res.status(401).json(
          ApiResponse.error('Invalid token payload', 401)
        );
      }
    } catch (jwtError) {
      return res.status(401).json(
        ApiResponse.error('Invalid token', 401)
      );
    }

  } catch (error) {
    logger.error('Auth middleware error:', error);
    return res.status(500).json(
      ApiResponse.error('Authentication error', 500)
    );
  }
};

export const optionalAuthMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(token, config.JWT_SECRET) as any;
        
        if (decoded.address && decoded.signature) {
          const isValid = await verifySignature(decoded.address, decoded.signature, decoded.message);
          
          if (isValid) {
            req.user = {
              address: decoded.address,
              signature: decoded.signature
            };
          }
        }
      } catch (jwtError) {
        // Ignore JWT errors for optional auth
        logger.debug('Optional auth failed:', jwtError);
      }
    }
    
    next();
  } catch (error) {
    logger.error('Optional auth middleware error:', error);
    next();
  }
};

async function verifySignature(address: string, signature: string, message: string): Promise<boolean> {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch (error) {
    logger.error('Signature verification error:', error);
    return false;
  }
}

export const generateAuthToken = (address: string, signature: string, message: string): string => {
  return jwt.sign(
    { 
      address: address.toLowerCase(),
      signature,
      message,
      iat: Math.floor(Date.now() / 1000)
    },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
  );
};

export const createAuthMessage = (address: string, nonce: string): string => {
  return `Welcome to PREDIX AI!\n\nPlease sign this message to authenticate.\n\nAddress: ${address}\nNonce: ${nonce}\nTimestamp: ${Date.now()}`;
};
