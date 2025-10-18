import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, CheckCircle, XCircle } from "lucide-react";

const recentResults = [
  { id: 1, aiPrediction: "up", actual: "up", won: true, timestamp: "2 min ago", change: "+1.2%" },
  { id: 2, aiPrediction: "down", actual: "up", won: false, timestamp: "7 min ago", change: "+0.8%" },
  { id: 3, aiPrediction: "up", actual: "up", won: true, timestamp: "12 min ago", change: "+1.5%" },
  { id: 4, aiPrediction: "down", actual: "down", won: true, timestamp: "17 min ago", change: "-0.9%" },
  { id: 5, aiPrediction: "up", actual: "down", won: false, timestamp: "22 min ago", change: "-1.1%" },
];

export const RecentResults = () => {
  return (
    <Card className="gradient-card border-primary/20 p-6">
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Recent Predictions</h2>

        <div className="space-y-3">
          {recentResults.map((result) => (
            <div
              key={result.id}
              className={`p-4 rounded-lg border transition-all duration-300 ${
                result.won
                  ? "bg-bullish/5 border-bullish/20 hover:bg-bullish/10"
                  : "bg-bearish/5 border-bearish/20 hover:bg-bearish/10"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {result.won ? (
                    <CheckCircle className="w-6 h-6 text-bullish" />
                  ) : (
                    <XCircle className="w-6 h-6 text-bearish" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">AI:</span>
                      {result.aiPrediction === "up" ? (
                        <TrendingUp className="w-4 h-4 text-bullish" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-bearish" />
                      )}
                      <span className="font-bold uppercase">{result.aiPrediction}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{result.timestamp}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${result.actual === "up" ? "text-bullish" : "text-bearish"}`}>
                    {result.change}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {result.won ? "Correct" : "Wrong"}
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
