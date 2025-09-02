import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface BinanceSymbol {
  symbol: string;
  status: string;
  baseAsset: string;
  quoteAsset: string;
}

interface BinanceExchangeInfo {
  symbols: BinanceSymbol[];
}

interface SymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
}

interface SearchSymbolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSymbolSelect: (symbol: string) => void;
  borderColor: string;
}

const SearchSymbolDialog: React.FC<SearchSymbolDialogProps> = ({
  open,
  onOpenChange,
  onSymbolSelect,
  borderColor,
}) => {
  const [symbolInput, setSymbolInput] = useState('');
  const [allSymbols, setAllSymbols] = useState<SymbolInfo[]>([]);
  const [filteredSymbols, setFilteredSymbols] = useState<SymbolInfo[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Fetch all available symbols from Binance
  const fetchAllSymbols = async () => {
    try {
      const response = await axios.get<BinanceExchangeInfo>('https://api.binance.com/api/v3/exchangeInfo');
      const symbols = response.data.symbols
        .filter((s) => s.status === 'TRADING')
        .map((s) => ({
          symbol: s.symbol,
          baseAsset: s.baseAsset,
          quoteAsset: s.quoteAsset,
        }));
      setAllSymbols(symbols);
    } catch (error) {
      console.error('Error fetching symbols:', error);
    }
  };

  // Filter symbols based on search input
  useEffect(() => {
    if (symbolInput.length < 1) {
      setFilteredSymbols([]);
      setShowSuggestions(false);
      return;
    }

    const query = symbolInput.toUpperCase();
    const filtered = allSymbols
      .filter(
        (s) =>
          s.symbol.includes(query) ||
          s.baseAsset.includes(query) ||
          s.quoteAsset.includes(query)
      )
      .slice(0, 10);
    setFilteredSymbols(filtered);
    setShowSuggestions(true);
  }, [symbolInput, allSymbols]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch symbols when dialog opens
  useEffect(() => {
    if (open) {
      fetchAllSymbols();
    }
  }, [open]);

  const handleSymbolSelect = (selectedSymbol: string) => {
    if (selectedSymbol.trim()) {
      onSymbolSelect(selectedSymbol.trim().toUpperCase());
      setSymbolInput('');
      setShowSuggestions(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Symbol</DialogTitle>
          <DialogDescription>Enter a new cryptocurrency trading pair</DialogDescription>
        </DialogHeader>
        <div className="relative" ref={searchRef}>
          <div className="grid flex-1 gap-2">
            <Label htmlFor="symbol" className="sr-only">
              Symbol
            </Label>
            <Input
              id="symbol"
              value={symbolInput}
              onChange={(e) => setSymbolInput(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Enter symbol (e.g., BTCUSDT)"
              onKeyDown={(e) => e.key === 'Enter' && handleSymbolSelect(symbolInput)}
            />
          </div>
          {showSuggestions && filteredSymbols.length > 0 && (
            <div
              className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg"
              style={{ borderColor }}
            >
              {filteredSymbols.map((s) => (
                <div
                  key={s.symbol}
                  className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSymbolSelect(s.symbol)}
                >
                  <span className="font-bold">{s.symbol}</span>
                  <span className="ml-2 text-gray-500">
                    {s.baseAsset}/{s.quoteAsset}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter className="sm:justify-start">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={() => handleSymbolSelect(symbolInput)}
            disabled={!symbolInput.trim()}
          >
            Change Symbol
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SearchSymbolDialog;