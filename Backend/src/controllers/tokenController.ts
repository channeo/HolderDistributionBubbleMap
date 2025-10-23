import { Request, Response } from 'express';
import * as tokenService from '../services/tokenService';

/**
 * Controller for token metadata.
 */
export const getMetadata = async (req: Request, res: Response) => {
  const { address } = req.params;
  try {
    const metadata = await tokenService.getTokenMetadata(address);
    res.json(metadata);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

/**
 * Controller for top holders.
 */
export const getHolders = async (req: Request, res: Response) => {
  const { address } = req.params;
  const limit = parseInt(req.query.limit as string) || 10;
  try {
    const holders = await tokenService.getTopHolders(address, limit);
    res.json(holders);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

/**
 * Controller for distribution analysis.
 */
export const getDistribution = async (req: Request, res: Response) => {
  const { address } = req.params;
  try {
    const distribution = await tokenService.getTokenDistribution(address);
    res.json(distribution);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

/**
 * Controller for transactions.
 */
export const getTransactions = async (req: Request, res: Response) => {
  const { address } = req.params;
  try {
    const transactions = await tokenService.getTokenTransactions(address);
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};