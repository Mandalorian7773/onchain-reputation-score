import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load ABI
const abiPath = path.join(__dirname, '../abi/ReputationAnchor.json');
const contractABI = JSON.parse(fs.readFileSync(abiPath, 'utf8'));

class AnchorService {
  constructor() {
    this.provider = null;
    this.wallet = null;
    this.contract = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      // Initialize ethers provider
      this.provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC);
      
      // Load backend wallet
      if (!process.env.ANCHOR_PRIVATE_KEY) {
        throw new Error('ANCHOR_PRIVATE_KEY not configured');
      }
      
      this.wallet = new ethers.Wallet(process.env.ANCHOR_PRIVATE_KEY, this.provider);
      
      // Load ReputationAnchor contract
      if (!process.env.CONTRACT_ADDRESS) {
        throw new Error('CONTRACT_ADDRESS not configured');
      }
      
      this.contract = new ethers.Contract(
        process.env.CONTRACT_ADDRESS,
        contractABI,
        this.wallet
      );
      
      this.initialized = true;
      console.log('AnchorService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AnchorService:', error);
      this.initialized = false;
    }
  }

  async anchorProfileHash(profileId, hash) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      console.warn('AnchorService not initialized, skipping anchoring');
      return { success: false, error: 'Service not initialized' };
    }

    try {
      console.log(`Anchoring profile ${profileId} with hash ${hash}`);
      
      // Convert strings to bytes32 if needed
      const profileIdBytes32 = ethers.id(profileId);
      const hashBytes32 = typeof hash === 'string' && hash.startsWith('0x') ? hash : ethers.id(hash);
      
      // Call contract.anchorProfile(profileId, hash)
      const tx = await this.contract.anchorProfile(profileIdBytes32, hashBytes32);
      
      console.log(`Transaction submitted: ${tx.hash}`);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
      
      return {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
      
    } catch (error) {
      console.error('Failed to anchor profile hash:', error);
      
      // Return failure without throwing - anchoring must not block profile generation
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  async getAnchors(profileId) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      return { success: false, error: 'Service not initialized' };
    }

    try {
      const profileIdBytes32 = ethers.id(profileId);
      const anchors = await this.contract.getAnchors(profileIdBytes32);
      
      return {
        success: true,
        anchors: anchors.map(anchor => ({
          profileId: anchor.profileId,
          hash: anchor.hash,
          timestamp: Number(anchor.timestamp)
        }))
      };
    } catch (error) {
      console.error('Failed to get anchors:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Export singleton instance
export const anchorService = new AnchorService();