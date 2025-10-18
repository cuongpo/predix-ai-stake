import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Brain, Timer, DollarSign } from "lucide-react";

interface PredictionCardProps {
  onStake: (direction: "follow" | "counter", amount: number) => void;
}

type RoundPhase = "voting" | "frozen" | "results";

export const PredictionCard = ({ onStake }: PredictionCardProps) => {
  const [phase, setPhase] = useState<RoundPhase>("voting");
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes in seconds
  const [aiPrediction, setAiPrediction] = useState<"up" | "down">("up");
  const [maticPrice, setMaticPrice] = useState(0.72);
  const [startPrice, setStartPrice] = useState(0.72);
  const [stakeAmount, setStakeAmount] = useState(10);
  const [userChoice, setUserChoice] = useState<"follow" | "counter" | null>(null);
  const [roundResult, setRoundResult] = useState<"win" | "lose" | null>(null);

  // Simulate MATIC price fluctuation
  useEffect(() => {
    const priceInterval = setInterval(() => {
      setMaticPrice(prev => {
        const change = (Math.random() - 0.5) * 0.02;
        return Number((prev + change).toFixed(4));
      });
    }, 3000);

    return () => clearInterval(priceInterval);
  }, []);

  // Round phase management
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Phase transition
          if (phase === "voting") {
            setPhase("frozen");
            setStartPrice(maticPrice);
            return 300; // 5 minutes frozen
          } else if (phase === "frozen") {
            // Calculate result
            const priceChange = maticPrice - startPrice;
            const actualDirection = priceChange >= 0 ? "up" : "down";
            const aiWasRight = actualDirection === aiPrediction;
            
            if (userChoice) {
              const userWon = (userChoice === "follow" && aiWasRight) || 
                             (userChoice === "counter" && !aiWasRight);
              setRoundResult(userWon ? "win" : "lose");
            }
            
            setPhase("results");
            return 10; // 10 seconds to view results
          } else {
            // Reset for new round
            setPhase("voting");
            setAiPrediction(Math.random() > 0.5 ? "up" : "down");
            setUserChoice(null);
            setRoundResult(null);
            return 300; // 5 minutes voting
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, maticPrice, startPrice, aiPrediction, userChoice]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStakeClick = (direction: "follow" | "counter") => {
    setUserChoice(direction);
    onStake(direction, stakeAmount);
  };

  const maxTime = phase === "results" ? 10 : 300;
  const progress = ((maxTime - timeRemaining) / maxTime) * 100;

  return (
    <Card className="gradient-card border-primary/20 p-8 relative overflow-hidden">
      {/* Animated background effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent animate-pulse-glow" />
      
      <div className="relative z-10 space-y-6">
        {/* Phase Badge */}
        <div className="text-center">
          <div className={`inline-block px-4 py-2 rounded-full font-bold text-sm ${
            phase === "voting" ? "bg-primary/20 border border-primary/30 glow-primary" :
            phase === "frozen" ? "bg-gold/20 border border-gold/30 glow-gold" :
            "bg-secondary border border-secondary/30"
          }`}>
            {phase === "voting" && "🎯 VOTING OPEN"}
            {phase === "frozen" && "⏳ FROZEN - WAITING FOR RESULT"}
            {phase === "results" && roundResult === "win" && "🎉 YOU WON!"}
            {phase === "results" && roundResult === "lose" && "💔 YOU LOST (20% CASHBACK)"}
            {phase === "results" && !roundResult && "📊 ROUND COMPLETE"}
          </div>
        </div>

        {/* MATIC Price Display */}
        <div className="p-4 rounded-xl bg-secondary border border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">MATIC Price</span>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">${maticPrice.toFixed(4)}</p>
              {phase === "frozen" && (
                <p className="text-xs text-muted-foreground">
                  Start: ${startPrice.toFixed(4)}
                </p>
              )}
            </div>
          </div>
        </div>

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
              <p className="text-sm opacity-90">
                {phase === "voting" ? "Next 5 minutes" : 
                 phase === "frozen" ? "Waiting for result..." : 
                 "Round ended"}
              </p>
            </div>
          </div>
        </div>

        {/* Timer */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {phase === "voting" ? "Voting Time" : 
                 phase === "frozen" ? "Frozen Time" : 
                 "Next Round"}
              </span>
            </div>
            <span className="text-2xl font-mono font-bold">{formatTime(timeRemaining)}</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ${
                phase === "voting" ? "bg-primary glow-primary" :
                phase === "frozen" ? "bg-gold glow-gold" :
                "bg-secondary"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {phase === "voting" && (
          <>
            {/* Stake Amount */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Stake Amount (MATIC)</label>
              <input
                type="number"
                min="1"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(Number(e.target.value))}
                className="w-full h-12 px-4 bg-secondary border border-primary/20 rounded-lg text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={userChoice !== null}
              />
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="bullish"
                size="xl"
                onClick={() => handleStakeClick("follow")}
                className="group"
                disabled={userChoice !== null}
              >
                <TrendingUp className="w-5 h-5 group-hover:scale-110 transition-transform" />
                FOLLOW AI
              </Button>
              <Button
                variant="bearish"
                size="xl"
                onClick={() => handleStakeClick("counter")}
                className="group"
                disabled={userChoice !== null}
              >
                <TrendingDown className="w-5 h-5 group-hover:scale-110 transition-transform" />
                COUNTER AI
              </Button>
            </div>

            {userChoice && (
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 text-center">
                <p className="font-bold">
                  ✓ You {userChoice === "follow" ? "FOLLOWED" : "COUNTERED"} the AI with {stakeAmount} MATIC
                </p>
              </div>
            )}

            {/* Info */}
            <p className="text-center text-xs text-muted-foreground">
              Win: Get rewards from pool • Lose: Receive 20% cashback
            </p>
          </>
        )}

        {phase === "frozen" && (
          <div className="p-6 rounded-xl bg-gold/10 border border-gold/20 text-center">
            <p className="text-lg font-bold">⏳ Round Locked</p>
            <p className="text-sm text-muted-foreground mt-2">
              Waiting for final price confirmation...
            </p>
          </div>
        )}

        {phase === "results" && (
          <div className={`p-6 rounded-xl text-center ${
            roundResult === "win" ? "bg-bullish/10 border border-bullish/20" :
            roundResult === "lose" ? "bg-bearish/10 border border-bearish/20" :
            "bg-secondary border border-secondary/30"
          }`}>
            {roundResult === "win" && (
              <>
                <p className="text-2xl font-bold text-bullish mb-2">🎉 WINNER!</p>
                <p className="text-sm">You predicted correctly and won rewards!</p>
              </>
            )}
            {roundResult === "lose" && (
              <>
                <p className="text-2xl font-bold text-bearish mb-2">💔 BETTER LUCK NEXT TIME</p>
                <p className="text-sm">You'll receive 20% cashback: {(stakeAmount * 0.2).toFixed(2)} MATIC</p>
              </>
            )}
            {!roundResult && (
              <p className="text-sm text-muted-foreground">You didn't participate in this round</p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
