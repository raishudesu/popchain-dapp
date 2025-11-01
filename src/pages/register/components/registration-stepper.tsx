import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { StepIndicator } from "./step-indicator";
import { PersonalInfoStep } from "./steps/personal-info-step";
import { CredentialsStep } from "./steps/credential-steps";
import { UserTypeStep } from "./steps/user-type-step";
import { ReviewStep } from "./steps/review-step";
import { registrationSchema } from "@/schemas/registration";
import type { RegistrationFormData } from "@/types/registration";

const STEPS = [
  { id: 1, title: "Personal Info", description: "Tell us about yourself" },
  { id: 2, title: "Credentials", description: "Create a secure password" },
  { id: 3, title: "User Type", description: "Choose your role" },
  { id: 4, title: "Review", description: "Confirm your details" },
];

export function RegistrationStepper() {
  const [currentStep, setCurrentStep] = useState(1);

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    mode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      userType: undefined,
    },
  });

  const handleNext = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep);
    const isValid = await form.trigger(fieldsToValidate as any);

    if (isValid && currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = (data: RegistrationFormData) => {
    console.log("Form submitted:", data);
    // Handle form submission here
    alert("Registration successful! Check console for details.");
  };

  const getFieldsForStep = (step: number): (keyof RegistrationFormData)[] => {
    switch (step) {
      case 1:
        return ["firstName", "lastName"];
      case 2:
        return ["email", "password", "confirmPassword"];
      case 3:
        return ["userType"];
      default:
        return [];
    }
  };

  const isStepValid = (): boolean => {
    const fieldsToValidate = getFieldsForStep(currentStep);
    return fieldsToValidate.every((field) => !form.formState.errors[field]);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <Card className="w-full max-w-2xl shadow-xl">
          <div className="p-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Create Account
              </h1>
              <p className="text-muted-foreground">
                Join PopChain today to get started.
              </p>
            </div>

            {/* Step Indicator */}
            <StepIndicator steps={STEPS} currentStep={currentStep} />

            {/* Form Content */}
            <div className="mt-12 min-h-64">
              {currentStep === 1 && <PersonalInfoStep />}
              {currentStep === 2 && <CredentialsStep />}
              {currentStep === 3 && <UserTypeStep />}
              {currentStep === 4 && <ReviewStep formData={form.getValues()} />}
            </div>

            {/* Navigation Buttons */}
            <div className="mt-8 flex justify-between gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1}
                className="flex-1 bg-transparent"
              >
                Back
              </Button>
              {currentStep < STEPS.length ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={!isStepValid()}
                  className="flex-1"
                >
                  Next
                </Button>
              ) : (
                <Button
                  type="submit"
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  Complete Registration
                </Button>
              )}
            </div>

            {/* Progress Text */}
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Step {currentStep} of {STEPS.length}
            </div>
          </div>
        </Card>
      </form>
    </Form>
  );
}
