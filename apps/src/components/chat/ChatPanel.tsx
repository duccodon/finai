import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, X, ArrowUpRight, Trash2 } from 'lucide-react';
import { getAccessToken } from '@/lib/http'; // lấy token từ http.ts
type ChatPanelProps = {
  symbol?: string;
};

interface NewsItem {
  source: string;
  title: string;
  link: string;
  published: string;
  summary: string;
  cleanText: string;
  sentiment: {
    compound_score: number;
    label: string;
    details: {
      neg: number;
      neu: number;
      pos: number;
      compound: number;
    };
  };
  symbol: string;
  timestamp: number; // Add timestamp for sorting and expiration
}

interface ApiResponse {
  symbols: {
    [symbol: string]: Omit<NewsItem, 'symbol' | 'timestamp'>;
  };
}

// LocalStorage key
const NEWS_STORAGE_KEY = 'crypto_news_data';

const ChatPanel = ({ symbol }: ChatPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newsData, setNewsData] = useState<NewsItem[]>([]);

  // Load news data from localStorage on component mount
  useEffect(() => {
    const loadStoredNews = () => {
      try {
        const storedNews = localStorage.getItem(NEWS_STORAGE_KEY);
        if (storedNews) {
          const parsedNews = JSON.parse(storedNews);

          // Optional: Clean up old articles (older than 7 days)
          const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
          const filteredNews = parsedNews.filter(
            (item: NewsItem) => item.timestamp > oneWeekAgo
          );

          setNewsData(filteredNews);
          console.log(
            'Loaded news from localStorage:',
            filteredNews.length,
            'articles'
          );
        }
      } catch (error) {
        console.error('Error loading news from localStorage:', error);
        // Clear corrupted data
        localStorage.removeItem(NEWS_STORAGE_KEY);
      }
    };

    loadStoredNews();
  }, []);

  // Save news data to localStorage whenever it changes
  useEffect(() => {
    const saveNewsToStorage = () => {
      try {
        localStorage.setItem(NEWS_STORAGE_KEY, JSON.stringify(newsData));
        console.log('Saved news to localStorage:', newsData.length, 'articles');
      } catch (error) {
        console.error('Error saving news to localStorage:', error);
      }
    };

    if (newsData.length > 0) {
      saveNewsToStorage();
    }
  }, [newsData]);

  const fetchNews = async () => {
    console.log('Fetching news for symbol:', symbol);
    try {
      if (!symbol) {
        console.error('No symbol provided');
        return;
      }

      const url = `/api/news/${symbol}`;
      console.log('Full URL:', url);

      const response = await fetch(url);
      console.log('Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();
      console.log('News data:', data);

      // Update newsData with the new article(s)
      if (data.symbols && data.symbols[symbol]) {
        const newArticle = {
          ...data.symbols[symbol],
          symbol: symbol,
          timestamp: Date.now(), // Add current timestamp
        };

        setNewsData((prevData) => {
          // Check if this article already exists (by link)
          const articleExists = prevData.some(
            (item) => item.link === newArticle.link
          );

          if (articleExists) {
            console.log('Article already exists, not adding duplicate');
            return prevData;
          }

          // Add new article to the beginning of the array (most recent first)
          const updatedData = [newArticle, ...prevData];

          // Limit to last 50 articles to prevent storage issues
          return updatedData.slice(0, 50);
        });
      }
    } catch (error) {
      console.error('Error fetching news:', error);
    }
  };

  const clearNews = () => {
    if (window.confirm('Are you sure you want to clear all news articles?')) {
      setNewsData([]);
      localStorage.removeItem(NEWS_STORAGE_KEY);
      console.log('Cleared all news articles');
    }
  };

  // Sort news by timestamp (newest first)
  const sortedNews = [...newsData].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <>
      <Button variant="outline" size="icon" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? (
          <X className="h-4 w-4" />
        ) : (
          <MessageSquare className="h-4 w-4" />
        )}
      </Button>

      <div
        className={`fixed right-0 top-0 h-full w-80 border-l bg-background shadow-lg transition-transform duration-300 z-10 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-1 pl-4 border-b flex justify-between items-center">
            <h3 className="font-semibold">News</h3>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={clearNews}
                title="Clear all news"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Fixed Scroll Area with proper height calculation */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {sortedNews.map((news, index) => (
                  <Card
                    key={`${news.link}-${news.timestamp}`}
                    className="rounded-lg"
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{news.title}</CardTitle>
                      <div className="flex flex-wrap gap-1 mt-2">
                        <span className="text-xs bg-muted px-2 py-1 rounded-md">
                          {news.symbol}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-xs text-muted-foreground">
                          Published: {news.published}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(news.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <p className="text-sm text-muted-foreground mb-3">
                        {news.cleanText.split(/\s+/).slice(0, 30).join(' ')}...
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => window.open(news.link, '_blank')}
                      >
                        See more
                        <ArrowUpRight className="ml-2 h-3 w-3" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
                {sortedNews.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No news yet</p>
                    <p className="text-sm">Click "Fetch News" to get started</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="p-4 flex justify-center">
            <Button className="w-full" onClick={fetchNews}>
              Fetch News
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatPanel;
