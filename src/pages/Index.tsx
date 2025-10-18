import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PredictionCard } from "@/components/PredictionCard";
import { StatsCards } from "@/components/StatsCards";
import { Leaderboard } from "@/components/Leaderboard";
import { RecentResults } from "@/components/RecentResults";
import { HowItWorks } from "@/components/HowItWorks";
import { toast } from "sonner";
import { Wallet, Brain, TrendingUp } from "lucide-react";

const Index = () => {
  const [walletConnected, setWalletConnected] = useState(false);

  const handleConnectWallet = () => {
    // Simulate wallet connection
    setWalletConnected(true);
    toast.success("Wallet Connected!", {
      description: "You're ready to start predicting with AI",
    });
  };

  const handleStake = (direction: "follow" | "counter", amount: number) => {
    if (!walletConnected) {
      toast.error("Connect your wallet first!");
      return;
    }

    toast.success(
      `Staked ${amount} MATIC!`,
      {
        description: `You ${direction === "follow" ? "followed" : "countered"} the AI prediction`,
      }
    );
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-primary/20 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center glow-primary">
                <Brain className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold">PREDIX AI</h1>
            </div>
            <Button
              variant={walletConnected ? "secondary" : "hero"}
              size="lg"
              onClick={handleConnectWallet}
              disabled={walletConnected}
            >
              <Wallet className="w-5 h-5" />
              {walletConnected ? "0x742d...3a1f" : "Connect Wallet"}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-transparent" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-block px-4 py-2 rounded-full bg-primary/20 border border-primary/30 glow-primary">
              <span className="text-sm font-medium">🚀 Live on Polygon Testnet</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold leading-tight">
              Predict with AI,
              <br />
              <span className="gradient-primary bg-clip-text text-transparent">
                Win with MATIC
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Every 5 minutes, our AI predicts MATIC price movements. Follow the AI or counter it - 
              winners take the pool, losers get 20% cashback.
            </p>
            <div className="flex gap-4 justify-center">
              <Button variant="hero" size="xl" onClick={handleConnectWallet}>
                <TrendingUp className="w-5 h-5" />
                Start Predicting
              </Button>
              <Button variant="outline" size="xl">
                View Analytics
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <StatsCards />
        </div>
      </section>

      {/* Main Game */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <PredictionCard onStake={handleStake} />
            </div>
            <div className="space-y-6">
              <RecentResults />
            </div>
          </div>
        </div>
      </section>

      {/* Leaderboard */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <Leaderboard />
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <HowItWorks />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-primary/20 py-12">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <Brain className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold">PREDIX AI</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              AI-powered prediction market on Polygon • Built with ❤️ for the future of DeFi
            </p>
            <p className="text-xs text-muted-foreground">
              Testnet Only • Not Financial Advice • Always DYOR
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
