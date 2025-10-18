import { Card } from "@/components/ui/card";
import { Coins, Users, Trophy, TrendingUp } from "lucide-react";

export const StatsCards = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="gradient-card border-primary/20 p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center glow-primary">
            <Coins className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Pool</p>
            <p className="text-2xl font-bold">12,450 POL</p>
          </div>
        </div>
      </Card>

      <Card className="gradient-card border-primary/20 p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-bullish/20 flex items-center justify-center glow-bullish">
            <Users className="w-6 h-6 text-bullish" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Active Players</p>
            <p className="text-2xl font-bold">1,247</p>
          </div>
        </div>
      </Card>

      <Card className="gradient-card border-primary/20 p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-gold/20 flex items-center justify-center glow-gold">
            <Trophy className="w-6 h-6 text-gold" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">AI Accuracy</p>
            <p className="text-2xl font-bold">68.4%</p>
          </div>
        </div>
      </Card>

      <Card className="gradient-card border-primary/20 p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-bearish/20 flex items-center justify-center glow-bearish">
            <TrendingUp className="w-6 h-6 text-bearish" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">BTC Price</p>
            <p className="text-2xl font-bold">$67,234</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
