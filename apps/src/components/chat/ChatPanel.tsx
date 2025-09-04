import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, X, ArrowUpRight } from 'lucide-react';

const ChatPanel = () => {
  const [isOpen, setIsOpen] = useState(false);

  // Sample data with multiple news items
  const newsData = [
    {
      title: 'Crypto ‘buy the dip’ calls are spiking, which may signal more downside',
      content: 'Crypto ‘buy the dip’ calls are spiking, which may signal more downside Buy the\ndip mentions on social media are climbing as Bitcoin falls, which could be a\nsign the market hasn’t bottomed yet, Santiment says.',
      link: 'https://cointelegraph.com/news/crypto-market-buy-the-dip-calls-signals-downside-santiment',
      tags: ['BTCUSDT']
    },
    {
      title: 'Ethereum Foundation Announces Major Protocol Upgrade',
      content: 'The Ethereum Foundation has revealed plans for a significant protocol upgrade that will improve scalability and reduce gas fees.',
      link: 'https://example.com/ethereum-upgrade',
      tags: ['ETHUSDT', 'Blockchain']
    },
    {
      title: 'NFT Market Sees Resurgence After Months of Decline',
      content: 'After a prolonged bear market, NFT trading volumes have increased by 40% in the past month, signaling renewed interest.',
      link: 'https://example.com/nft-resurgence',
      tags: ['NFT', 'Market']
    },
    {
      title: 'DeFi Protocols Integrate New Security Measures',
      content: 'Leading DeFi platforms have implemented enhanced security protocols following recent exploits in the ecosystem.',
      link: 'https://example.com/defi-security',
      tags: ['DeFi', 'Security']
    },
    {
      title: 'Central Banks Exploring CBDC Implementation',
      content: 'Several major central banks have accelerated their research and development of Central Bank Digital Currencies.',
      link: 'https://example.com/cbdc-update',
      tags: ['CBDC', 'Regulation']
    },
    {
      title: 'Crypto Regulation Framework Advances in Key Markets',
      content: 'Comprehensive cryptocurrency regulation frameworks are moving forward in several major economies, bringing clarity to the industry.',
      link: 'https://example.com/crypto-regulation',
      tags: ['Regulation', 'Policy']
    },
    {
      title: 'Bitcoin Mining Difficulty Reaches All-Time High',
      content: 'Bitcoin mining difficulty has surged to a new record high, indicating increased competition and network security.',
      link: 'https://example.com/mining-difficulty',
      tags: ['BTCUSDT', 'Mining']
    },
    {
      title: 'Stablecoin Adoption Grows in Emerging Markets',
      content: 'Stablecoins are seeing increased adoption in countries with high inflation rates as a store of value.',
      link: 'https://example.com/stablecoin-adoption',
      tags: ['Stablecoin', 'Adoption']
    }
  ];

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
      >
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Fixed Scroll Area with proper height calculation */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {newsData.map((news, index) => (
                  <Card key={index} className="rounded-lg">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{news.title}</CardTitle>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {news.tags.map((tag, i) => (
                          <span key={i} className="text-xs bg-muted px-2 py-1 rounded-md">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <p className="text-sm text-muted-foreground mb-3">
                        {news.content.split(/\s+/).slice(0, 30).join(' ')}...
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
              </div>
            </ScrollArea>
          </div>

          <div className="p-4 flex justify-center">
            <Button className="w-full">Fetch News</Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatPanel;