import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// Define TypeScript interfaces
interface SymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
}

interface CandlestickData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface PriceData {
  current: number;
  high: number;
  low: number;
  open: number;
  change: number;
  changePercent: number;
}

interface TickerData {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  volume: string;
  highPrice: string;
  lowPrice: string;
}

const BinanceDataViewer: React.FC = () => {
  const [symbol, setSymbol] = useState<string>('BTCUSDT');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [allSymbols, setAllSymbols] = useState<SymbolInfo[]>([]);
  const [filteredSymbols, setFilteredSymbols] = useState<SymbolInfo[]>([]);
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [tickerData, setTickerData] = useState<TickerData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Fetch all available symbols from Binance
  const fetchAllSymbols = async (): Promise<void> => {
    try {
      const response = await axios.get('https://api.binance.com/api/v3/exchangeInfo');
      const symbols = response.data.symbols
        .filter((s: any) => s.status === 'TRADING')
        .map((s: any) => ({
          symbol: s.symbol,
          baseAsset: s.baseAsset,
          quoteAsset: s.quoteAsset
        }));
      setAllSymbols(symbols);
    } catch (error) {
      console.error('Error fetching symbols:', error);
    }
  };

  // Fetch 24hr ticker data
  const fetchTickerData = async (symbol: string): Promise<void> => {
    try {
      setLoading(true);
      const response = await axios.get(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`);
      const data = response.data;
      setTickerData({
        symbol: data.symbol,
        lastPrice: data.lastPrice,
        priceChangePercent: data.priceChangePercent,
        volume: data.volume,
        highPrice: data.highPrice,
        lowPrice: data.lowPrice
      });

      // Calculate price data
      const lastPrice = parseFloat(data.lastPrice);
      const openPrice = parseFloat(data.openPrice);
      const change = lastPrice - openPrice;
      const changePercent = (change / openPrice) * 100;

      setPriceData({
        current: lastPrice,
        high: parseFloat(data.highPrice),
        low: parseFloat(data.lowPrice),
        open: openPrice,
        change,
        changePercent
      });
    } catch (error) {
      console.error('Error fetching ticker data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Format kline data for charting
  const formatKlineData = (kline: any): CandlestickData | null => {
    try {
      return {
        time: kline[0],
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4])
      };
    } catch (error) {
      console.error('Error formatting kline data:', error);
      return null;
    }
  };

  // Fetch historical data (similar to your implementation)
  const fetchHistoricalData = async (): Promise<void> => {
    try {
      const response = await axios.get("https://api.binance.com/api/v3/klines", {
        params: { 
          symbol: symbol.toUpperCase(), 
          interval: '1d', 
          limit: 1000 
        }
      });

      const formattedData = response.data
        .map(formatKlineData) 
        .filter((item: CandlestickData | null): item is CandlestickData => item !== null); 

      if (formattedData.length > 0) {
        const lastCandle = formattedData[formattedData.length - 1];
        setPriceData({
          current: lastCandle.close,
          high: lastCandle.high,
          low: lastCandle.low,
          open: lastCandle.open,
          change: lastCandle.close - lastCandle.open,
          changePercent: ((lastCandle.close - lastCandle.open) / lastCandle.open) * 100
        });
      }
    } catch (error) {
      console.error("Error fetching historical data:", error);
    }
  };

  // Handle symbol selection
  const handleSymbolSelect = (selectedSymbol: string): void => {
    setSymbol(selectedSymbol);
    setSearchQuery(selectedSymbol);
    setShowSuggestions(false);
    fetchTickerData(selectedSymbol);
    fetchHistoricalData();
  };

  // Filter symbols based on search query
  useEffect(() => {
    if (searchQuery.length < 2) {
      setFilteredSymbols([]);
      return;
    }

    const query = searchQuery.toUpperCase();
    const filtered = allSymbols.filter(
      s => s.symbol.includes(query) || 
           s.baseAsset.includes(query) || 
           s.quoteAsset.includes(query)
    ).slice(0, 10);
    
    setFilteredSymbols(filtered);
  }, [searchQuery, allSymbols]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchAllSymbols();
    fetchTickerData(symbol);
    fetchHistoricalData();
  }, [symbol]);

  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif', 
      maxWidth: '800px', 
      margin: '0 auto',
      backgroundColor: '#0f212e',
      color: '#ffffff',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: '#2ecc71', textAlign: 'center' }}>Binance Cryptocurrency Data</h1>
      
      {/* Search Input with Autocomplete */}
      <div ref={searchRef} style={{ position: 'relative', marginBottom: '20px' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          placeholder="Search for a cryptocurrency (e.g. BTC, ETH, USDT)"
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '16px',
            borderRadius: '4px',
            border: '1px solid #3498db',
            backgroundColor: '#1e2f3d',
            color: 'white'
          }}
        />
        
        {showSuggestions && filteredSymbols.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: '#1e2f3d',
            border: '1px solid #3498db',
            borderTop: 'none',
            borderRadius: '0 0 4px 4px',
            zIndex: 1000,
            maxHeight: '300px',
            overflowY: 'auto'
          }}>
            {filteredSymbols.map(s => (
              <div
                key={s.symbol}
                onClick={() => handleSymbolSelect(s.symbol)}
                style={{
                  padding: '10px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #2c3e50',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#2c3e50';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span style={{ fontWeight: 'bold' }}>{s.symbol}</span>
                <span style={{ color: '#7f8c8d' }}>
                  {s.baseAsset}/{s.quoteAsset}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Display Loading or Error */}
      {loading && <div style={{ textAlign: 'center', padding: '20px' }}>Loading data...</div>}

      {/* Display Ticker Data */}
      {tickerData && priceData && (
        <div style={{
          backgroundColor: '#1e2f3d',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h2 style={{ color: '#3498db', marginTop: 0 }}>{tickerData.symbol}</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div>
              <h3 style={{ color: '#bdc3c7', marginBottom: '5px' }}>Current Price</h3>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#2ecc71', margin: 0 }}>
                ${priceData.current.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
              </p>
            </div>
            
            <div>
              <h3 style={{ color: '#bdc3c7', marginBottom: '5px' }}>24h Change</h3>
              <p style={{ 
                fontSize: '20px', 
                fontWeight: 'bold', 
                margin: 0,
                color: priceData.change >= 0 ? '#2ecc71' : '#e74c3c'
              }}>
                {priceData.change >= 0 ? '+' : ''}{priceData.changePercent.toFixed(2)}%
              </p>
            </div>
            
            <div>
              <h3 style={{ color: '#bdc3c7', marginBottom: '5px' }}>24h High</h3>
              <p style={{ fontSize: '18px', margin: 0, color: '#2ecc71' }}>
                ${parseFloat(tickerData.highPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
              </p>
            </div>
            
            <div>
              <h3 style={{ color: '#bdc3c7', marginBottom: '5px' }}>24h Low</h3>
              <p style={{ fontSize: '18px', margin: 0, color: '#e74c3c' }}>
                ${parseFloat(tickerData.lowPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
              </p>
            </div>
            
            <div>
              <h3 style={{ color: '#bdc3c7', marginBottom: '5px' }}>24h Volume</h3>
              <p style={{ fontSize: '18px', margin: 0 }}>
                {parseFloat(tickerData.volume).toLocaleString(undefined, { maximumFractionDigits: 0 })} {symbol.replace('USDT', '')}
              </p>
            </div>
            
            <div>
              <h3 style={{ color: '#bdc3c7', marginBottom: '5px' }}>Open Price</h3>
              <p style={{ fontSize: '18px', margin: 0 }}>
                ${priceData.open.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Information */}
      <div style={{ 
        backgroundColor: '#1e2f3d', 
        padding: '15px', 
        borderRadius: '8px',
        fontSize: '14px',
        color: '#bdc3c7'
      }}>
        <p>Data provided by Binance API. This interface allows you to search for cryptocurrency trading pairs and view their current market data.</p>
        <p>Try searching for: BTCUSDT, ETHUSDT, ADAUSDT, or any other trading pair available on Binance.</p>
      </div>
    </div>
  );
};

export default BinanceDataViewer;