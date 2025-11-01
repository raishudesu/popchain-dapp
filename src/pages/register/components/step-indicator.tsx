import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: number;
  title: string;
  description: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="relative w-full">
      {/* Steps Container */}
      <div className="relative flex items-start">
        {steps.map((step, index) => (
          <div key={step.id} className="relative flex items-center flex-1">
            {/* Step Circle and Label */}
            <div className="flex flex-col items-center flex-1 min-w-0">
              {/* Step Circle */}
              <div className="relative z-10 flex flex-col items-center">
                <div
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300",
                    currentStep >= step.id
                      ? "bg-gradient-to-r from-purple-400 to-pink-600 text-white"
                      : "bg-muted text-muted-foreground border-2 border-border"
                  )}
                >
                  {currentStep > step.id ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    step.id
                  )}
                </div>
              </div>
              <div className="mt-3 text-center w-full">
                <p className="text-sm font-medium text-foreground">
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  {step.description}
                </p>
              </div>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "absolute top-6 h-1 transition-all duration-300 z-0",
                  currentStep > step.id
                    ? "bg-gradient-to-r from-purple-400 to-pink-600"
                    : "bg-muted"
                )}
                style={{
                  left: "calc(50% + 1.5rem)",
                  width: "calc(100% - 3rem)",
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
