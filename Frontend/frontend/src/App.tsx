import { useEffect, useState } from 'react';
import axios from 'axios';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Metadata {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
}

interface Holder {
  holder: string;
  balance: string;
}

interface Distribution {
  token: string;
  symbol: string;
  distribution: {
    whales: number;
    makers: number;
    takers: number;
  };
}

interface Transaction {
  txHash: string;
  from: string;
  to: string;
  value: string;
}

const App: React.FC = () => {
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [holders, setHolders] = useState<Holder[]>([]);
  const [distribution, setDistribution] = useState<Distribution | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tokenAddress = '0xdac17f958d2ee523a2206206994597c13d831ec7'; // USDT
  const API_BASE_URL = 'http://localhost:3000/api/token';

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const metadataRes = await axios.get(`${API_BASE_URL}/${tokenAddress}/metadata`);
        setMetadata(metadataRes.data);
        const holdersRes = await axios.get(`${API_BASE_URL}/${tokenAddress}/holders?limit=5`);
        setHolders(holdersRes.data);
        const distributionRes = await axios.get(`${API_BASE_URL}/${tokenAddress}/distribution`);
        setDistribution(distributionRes.data);
        const transactionsRes = await axios.get(`${API_BASE_URL}/${tokenAddress}/transactions`);
        setTransactions(transactionsRes.data);
      } catch (err) {
        setError('Failed to fetch data from backend');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Prepare data for bubble chart
  const chartData = distribution
    ? [
        { category: 'Whales', percentage: distribution.distribution.whales, value: distribution.distribution.whales },
        { category: 'Makers', percentage: distribution.distribution.makers, value: distribution.distribution.makers },
        { category: 'Takers', percentage: distribution.distribution.takers, value: distribution.distribution.takers },
      ]
    : [];

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4 text-center">Token Distribution Dashboard</h1>

      {loading && <p className="text-center">Loading...</p>}
      {error && <p className="text-red-500 text-center">{error}</p>}

      {/* Metadata */}
      {metadata && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">Token Metadata</h2>
          <div className="bg-gray-100 p-4 rounded-lg">
            <p><strong>Name:</strong> {metadata.name}</p>
            <p><strong>Symbol:</strong> {metadata.symbol}</p>
            <p><strong>Decimals:</strong> {metadata.decimals}</p>
            <p><strong>Total Supply:</strong> {metadata.totalSupply}</p>
          </div>
        </div>
      )}

      {/* Distribution Bubble Chart */}
      {distribution && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">Holder Distribution</h2>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <XAxis type="category" dataKey="category" name="Category" />
              <YAxis type="number" dataKey="percentage" name="Percentage" unit="%" />
              <ZAxis type="number" dataKey="value" range={[100, 1000]} name="Percentage" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name="Distribution" data={chartData} fill="#8884d8" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Holders */}
      {holders.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">Top Holders</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-gray-100 rounded-lg">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left">Address</th>
                  <th className="px-4 py-2 text-left">Balance</th>
                </tr>
              </thead>
              <tbody>
                {holders.map((holder, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2">{holder.holder}</td>
                    <td className="px-4 py-2">{holder.balance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      {transactions.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-2">Recent Transactions</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-gray-100 rounded-lg">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left">Tx Hash</th>
                  <th className="px-4 py-2 text-left">From</th>
                  <th className="px-4 py-2 text-left">To</th>
                  <th className="px-4 py-2 text-left">Value</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2">{tx.txHash.slice(0, 10)}...</td>
                    <td className="px-4 py-2">{tx.from.slice(0, 10)}...</td>
                    <td className="px-4 py-2">{tx.to.slice(0, 10)}...</td>
                    <td className="px-4 py-2">{tx.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;