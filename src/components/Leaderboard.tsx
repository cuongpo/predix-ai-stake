import { Card } from "@/components/ui/card";
import { Trophy, Medal, Award } from "lucide-react";

const leaderboardData = [
  { rank: 1, address: "0x742d...3a1f", xp: 24850, winRate: 72.5, streak: 8 },
  { rank: 2, address: "0x891c...2b4e", xp: 19240, winRate: 68.3, streak: 5 },
  { rank: 3, address: "0x3f7a...9c21", xp: 16730, winRate: 65.8, streak: 12 },
  { rank: 4, address: "0x6d2e...4f8b", xp: 14920, winRate: 63.2, streak: 3 },
  { rank: 5, address: "0x5c1b...7a3d", xp: 12450, winRate: 61.7, streak: 7 },
];

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Trophy className="w-5 h-5 text-gold" />;
    case 2:
      return <Medal className="w-5 h-5 text-gray-400" />;
    case 3:
      return <Award className="w-5 h-5 text-amber-600" />;
    default:
      return <span className="text-muted-foreground">#{rank}</span>;
  }
};

export const Leaderboard = () => {
  return (
    <Card className="gradient-card border-primary/20 p-6">
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Trophy className="w-6 h-6 text-gold glow-gold" />
          <h2 className="text-2xl font-bold">Top Predictors</h2>
        </div>

        <div className="space-y-3">
          {leaderboardData.map((player) => (
            <div
              key={player.rank}
              className={`p-4 rounded-lg border transition-all duration-300 hover:scale-[1.02] ${
                player.rank === 1
                  ? "bg-gold/10 border-gold/30 glow-gold"
                  : "bg-secondary/50 border-primary/10 hover:border-primary/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-8 flex justify-center">
                    {getRankIcon(player.rank)}
                  </div>
                  <div className="flex-1">
                    <p className="font-mono font-bold">{player.address}</p>
                    <p className="text-sm text-muted-foreground">{player.xp.toLocaleString()} XP</p>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-sm">
                    <span className="text-bullish font-bold">{player.winRate}%</span>
                    <span className="text-muted-foreground text-xs ml-1">win rate</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    🔥 {player.streak} streak
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};
