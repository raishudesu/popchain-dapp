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
    <div className="flex items-center justify-between">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center flex-1">
          {/* Step Circle */}
          <div className="flex flex-col items-center shrink-0">
            <div
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300",
                currentStep >= step.id
                  ? "bg-gradient-to-r from-purple-400 to-pink-600 text-white"
                  : "bg-muted text-muted-foreground border-2 border-border"
              )}
            >
              {currentStep > step.id ? <Check className="w-5 h-5" /> : step.id}
            </div>
            <div className="mt-3 text-center">
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
                "flex-1 h-1 mx-3 transition-all duration-300",
                currentStep > step.id
                  ? "bg-gradient-to-r from-purple-400 to-pink-600"
                  : "bg-muted"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
