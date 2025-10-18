import { Card } from "@/components/ui/card";
import { Brain, Wallet, Timer, Trophy } from "lucide-react";

const steps = [
  {
    icon: Brain,
    title: "AI Predicts",
    description: "Every 5 minutes, AI analyzes MATIC price movements using advanced ML models and market data.",
    color: "primary",
  },
  {
    icon: Wallet,
    title: "Choose Your Side",
    description: "Follow the AI prediction or counter it by staking your MATIC tokens on your choice.",
    color: "bullish",
  },
  {
    icon: Timer,
    title: "Wait for Result",
    description: "The prediction locks and you wait for 5 minutes while Chainlink oracles verify the price.",
    color: "gold",
  },
  {
    icon: Trophy,
    title: "Claim Rewards",
    description: "Winners share the pool rewards. Losers get 20% cashback. Earn XP and climb the leaderboard!",
    color: "bearish",
  },
];

export const HowItWorks = () => {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-4xl font-bold">How It Works</h2>
        <p className="text-muted-foreground text-lg">Simple, fast, and powered by AI</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <Card
              key={index}
              className="gradient-card border-primary/20 p-6 relative overflow-hidden group hover:scale-105 transition-all duration-300"
            >
              <div className="absolute top-4 right-4 text-6xl font-bold opacity-5">
                {index + 1}
              </div>
              <div className="relative z-10 space-y-4">
                <div className={`w-12 h-12 rounded-lg bg-${step.color}/20 flex items-center justify-center glow-${step.color}`}>
                  <Icon className={`w-6 h-6 text-${step.color}`} />
                </div>
                <h3 className="text-xl font-bold">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
