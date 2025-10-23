import axios from 'axios';

const mockHolders: Record<string, { holder: string; balance: string }[]> = {
  '0xdac17f958d2ee523a2206206994597c13d831ec7': generateMockHolders(100),
};

function generateMockHolders(num: number): { holder: string; balance: string }[] {
  const holders = [];
  for (let i = 0; i < num; i++) {
    const balance = (1000000000000 / (i + 1)).toFixed(0);
    holders.push({ holder: `0x${i.toString(16).padStart(40, '0')}`, balance });
  }
  return holders;
}

// Delay helper to avoid rate limits
async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


export const getTokenMetadata = async (address: string) => {
  try {
    const COINGECKO_API_URL = process.env.COINGECKO_API_URL || 'https://api.coingecko.com/api/v3';
    const url = `${COINGECKO_API_URL}/coins/ethereum/contract/${address.toLowerCase()}`;
    const res = await axios.get(url, { timeout: 5000 });
    const data = res.data;
    return {
      name: data.name,
      symbol: data.symbol.toUpperCase(),
      decimals: data.detail_platforms?.ethereum?.decimals || 18,
      totalSupply: data.market_data.total_supply ? data.market_data.total_supply.toString() : '0',
    };
  } catch (error) {
    console.error('Coingecko metadata error, fallback to mock:', error);
    return { name: 'Mock Token', symbol: 'MOCK', decimals: 18, totalSupply: '1000000000000000000000000' };
  }
};

async function getLatestBlockNumber(): Promise<string> {
  try {
    const ALCHEMY_MAINNET = process.env.ALCHEMY_MAINNET || 'https://eth-mainnet.g.alchemy.com/v2/Bye_BSbZlbmw8vNe2kK_m';
    const url = ALCHEMY_MAINNET;
    const res = await axios.post(
      url,
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_blockNumber',
        params: [],
      },
      { timeout: 5000 }
    );
    if (res.data.error) throw new Error('Alchemy API error: ' + res.data.error.message);
    return res.data.result;
  } catch (error) {
    console.error('Alchemy block number error:', error);
    return '0x0';
  }
}

export const getTopHolders = async (address: string, limit: number) => {
  const holdersMap = new Map<string, bigint>();
  let pageKey = null;
  let allTransfers = [] as any[];
  const metadata = await getTokenMetadata(address);
  const decimals = metadata.decimals || 18;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await delay(1000);
      const ALCHEMY_MAINNET = process.env.ALCHEMY_MAINNET || 'https://eth-mainnet.g.alchemy.com/v2/Bye_BSbZlbmw8vNe2kK_m';
      const url = ALCHEMY_MAINNET;
      const latestBlock = await getLatestBlockNumber();
      const fromBlock = `0x${(parseInt(latestBlock, 16) - 1000).toString(16)}`; // Last 1000 blocks
      const params = {
        fromBlock,
        toBlock: 'latest',
        contractAddresses: [address],
        category: ['erc20'],
        maxCount: '0x64', 
        withMetadata: false,
        excludeZeroValue: true,
        pageKey,
      } as any;
      const res = await axios.post(
        url,
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'alchemy_getAssetTransfers',
          params: [params],
        },
        { timeout: 5000 }
      );
      if (res.data.error) throw new Error('Alchemy API error: ' + res.data.error.message);
      const transfers = res.data.result.transfers || [];
      allTransfers = allTransfers.concat(transfers);
      pageKey = res.data.result.pageKey;
      if (!pageKey || allTransfers.length >= 500) break; // Limit to 500 transfers
    } catch (error) {
      console.error(`Alchemy holders attempt ${attempt} failed:`, error);
      if (attempt === 3) {
        console.error('Alchemy holders error, fallback to mock:', error);
        const holders = mockHolders[address] || generateMockHolders(100);
        holders.sort((a, b) => (BigInt(b.balance) > BigInt(a.balance) ? 1 : -1));
        return holders.slice(0, limit);
      }
    }
  }

  allTransfers.forEach((tx: any) => {
    const from = tx.from.toLowerCase();
    const to = tx.to.toLowerCase();
    const value = BigInt(Math.floor(parseFloat(tx.value) * 10 ** decimals)); // Convert to wei
    holdersMap.set(from, (holdersMap.get(from) || 0n) - value);
    holdersMap.set(to, (holdersMap.get(to) || 0n) + value);
  });

  // Filter positive balances, sort by balance descending
  const holders = Array.from(holdersMap.entries())
    .filter(([_, balance]) => balance > 0n)
    .map(([holder, balance]) => ({ holder, balance: balance.toString() }));
  holders.sort((a, b) => (BigInt(b.balance) > BigInt(a.balance) ? 1 : -1));
  return holders.slice(0, limit);
};

export const getTokenDistribution = async (address: string) => {
  const metadata = await getTokenMetadata(address);
  const totalSupply = BigInt(metadata.totalSupply || '1000000000000000000000000');
  let holders = await getTopHolders(address, 100);

  holders.sort((a: any, b: any) => (BigInt(b.balance) > BigInt(a.balance) ? 1 : -1));

  const numHolders = holders.length;
  const numWhales = Math.max(1, Math.ceil(numHolders * 0.01));
  const numMakersEnd = Math.ceil(numHolders * 0.1);
  const numMakers = numMakersEnd - numWhales;

  let sumWhales = 0n;
  for (let i = 0; i < numWhales; i++) {
    sumWhales += BigInt(holders[i].balance);
  }

  let sumMakers = 0n;
  for (let i = numWhales; i < numMakersEnd; i++) {
    sumMakers += BigInt(holders[i].balance);
  }

  let sumTakers = 0n;
  for (let i = numMakersEnd; i < numHolders; i++) {
    sumTakers += BigInt(holders[i].balance);
  }

  const totalHeld = sumWhales + sumMakers + sumTakers;
  const whalesPct = totalHeld > 0n ? Number((sumWhales * 100n) / totalHeld) : 0;
  const makersPct = totalHeld > 0n ? Number((sumMakers * 100n) / totalHeld) : 0;
  const takersPct = 100 - whalesPct - makersPct;

  return {
    token: metadata.name,
    symbol: metadata.symbol,
    distribution: { whales: whalesPct, makers: makersPct, takers: takersPct },
  };
};

export const getTokenTransactions = async (address: string) => {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await delay(1000);
      const ALCHEMY_MAINNET = process.env.ALCHEMY_MAINNET || 'https://eth-mainnet.g.alchemy.com/v2/Bye_BSbZlbmw8vNe2kK_m';
      const url = ALCHEMY_MAINNET;
      const latestBlock = await getLatestBlockNumber();
      const fromBlock = `0x${(parseInt(latestBlock, 16) - 1000).toString(16)}`; // Last 1000 blocks
      const res = await axios.post(
        url,
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'alchemy_getAssetTransfers',
          params: [
            {
              fromBlock,
              toBlock: 'latest',
              contractAddresses: [address],
              category: ['erc20'],
              maxCount: '0xA', // 10 recent tx
              order: 'desc',
              withMetadata: true,
            },
          ],
        },
        { timeout: 5000 }
      );
      if (res.data.error) throw new Error('Alchemy API error: ' + res.data.error.message);
      const transfers = res.data.result.transfers || [];
      return transfers.map((tx: any) => ({
        txHash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: tx.value.toString(),
      }));
    } catch (error) {
      console.error(`Alchemy tx attempt ${attempt} failed:`, error);
      if (attempt === 3) {
        console.error('Alchemy tx error, fallback to mock:', error);
        return [
          { txHash: '0x123', from: '0xabc', to: '0xdef', value: '1000' },
          { txHash: '0x456', from: '0xghi', to: '0xjkl', value: '500' },
        ];
      }
    }
  }
  return [];
};