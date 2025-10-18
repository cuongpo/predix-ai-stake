import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Brain, Timer } from "lucide-react";

interface PredictionCardProps {
  onStake: (direction: "follow" | "counter", amount: number) => void;
}

export const PredictionCard = ({ onStake }: PredictionCardProps) => {
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes in seconds
  const [aiPrediction, setAiPrediction] = useState<"up" | "down">("up");
  const [stakeAmount, setStakeAmount] = useState(10);

  useEffect(() => {
    // Simulate AI prediction changing every 5 minutes
    const predictionInterval = setInterval(() => {
      setAiPrediction(Math.random() > 0.5 ? "up" : "down");
      setTimeRemaining(300);
    }, 300000);

    return () => clearInterval(predictionInterval);
  }, []);

  useEffect(() => {
    // Countdown timer
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          return 300; // Reset to 5 minutes
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = ((300 - timeRemaining) / 300) * 100;

  return (
    <Card className="gradient-card border-primary/20 p-8 relative overflow-hidden">
      {/* Animated background effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent animate-pulse-glow" />
      
      <div className="relative z-10 space-y-6">
        {/* AI Prediction Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Brain className="w-6 h-6 text-primary animate-pulse-glow" />
            <h3 className="text-2xl font-bold">AI PREDICTION</h3>
          </div>
          
          {/* Prediction Display */}
          <div className={`p-8 rounded-xl ${aiPrediction === "up" ? "gradient-bullish glow-bullish" : "gradient-bearish glow-bearish"}`}>
            <div className="flex flex-col items-center gap-3">
              {aiPrediction === "up" ? (
                <TrendingUp className="w-16 h-16 animate-bounce" />
              ) : (
                <TrendingDown className="w-16 h-16 animate-bounce" />
              )}
              <p className="text-4xl font-bold">MATIC {aiPrediction === "up" ? "↑" : "↓"}</p>
              <p className="text-sm opacity-90">Next 5 minutes</p>
            </div>
          </div>
        </div>

        {/* Timer */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Time Remaining</span>
            </div>
            <span className="text-2xl font-mono font-bold">{formatTime(timeRemaining)}</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-1000 glow-primary"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Stake Amount */}
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Stake Amount (MATIC)</label>
          <input
            type="number"
            min="1"
            value={stakeAmount}
            onChange={(e) => setStakeAmount(Number(e.target.value))}
            className="w-full h-12 px-4 bg-secondary border border-primary/20 rounded-lg text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="bullish"
            size="xl"
            onClick={() => onStake("follow", stakeAmount)}
            className="group"
          >
            <TrendingUp className="w-5 h-5 group-hover:scale-110 transition-transform" />
            FOLLOW AI
          </Button>
          <Button
            variant="bearish"
            size="xl"
            onClick={() => onStake("counter", stakeAmount)}
            className="group"
          >
            <TrendingDown className="w-5 h-5 group-hover:scale-110 transition-transform" />
            COUNTER AI
          </Button>
        </div>

        {/* Info */}
        <p className="text-center text-xs text-muted-foreground">
          Win: Get rewards from pool • Lose: Receive 20% cashback
        </p>
      </div>
    </Card>
  );
};
