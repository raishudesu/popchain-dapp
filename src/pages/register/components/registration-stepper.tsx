import { useState } from "react";
import { useForm, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useCurrentWallet,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
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
import { registerUser } from "@/services/registration";
import { createAccountTransaction, extractAccountId } from "@/services/onchain";
import { requestSponsoredAccountCreation } from "@/services/sponsored-transaction";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";

const STEPS = [
  { id: 1, title: "Personal Info", description: "Tell us about yourself" },
  { id: 2, title: "Credentials", description: "Create a secure password" },
  { id: 3, title: "User Type", description: "Choose your role" },
  { id: 4, title: "Review", description: "Confirm your details" },
];

export function RegistrationStepper() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { currentWallet, isConnected } = useCurrentWallet();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();
  const navigate = useNavigate();

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

  const handleNext = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const fieldsToValidate = getFieldsForStep(currentStep);
    const isValid = await form.trigger(
      fieldsToValidate as Path<RegistrationFormData>[]
    );

    if (isValid && currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (data: RegistrationFormData) => {
    setIsSubmitting(true);

    try {
      const walletAddress = currentWallet?.accounts[0]?.address || null;

      // For organizers, wallet connection is required
      if (data.userType === "organizer" && (!isConnected || !walletAddress)) {
        toast.error("Please connect your wallet to register as an organizer.");
        setIsSubmitting(false);
        return;
      }

      let accountId: string | null = null;

      // Step 1: Create on-chain PopChain account
      if (isConnected && walletAddress) {
        // User has wallet - execute transaction directly
        toast.loading("Creating your on-chain account...");

        const tx = createAccountTransaction(
          data.email,
          data.userType,
          walletAddress
        );

        signAndExecute(
          {
            transaction: tx,
          },
          {
            onSuccess: async ({ digest }) => {
              try {
                console.log("Transaction digest:", digest);

                // Wait for transaction and get effects (following Mint.md pattern)
                const { effects } = await suiClient.waitForTransaction({
                  digest: digest,
                  options: {
                    showEffects: true,
                    showObjectChanges: true,
                  },
                });

                console.log("Transaction effects:", effects);

                // Extract account ID from effects (following Mint.md pattern)
                if (effects?.created?.[0]?.reference?.objectId) {
                  accountId = effects.created[0].reference.objectId;
                  console.log(
                    "Found account ID from effects.created[0].reference.objectId:",
                    accountId
                  );
                } else {
                  // Fallback to extractAccountId for other structures
                  accountId = extractAccountId({
                    effects,
                    objectChanges: effects,
                  });
                  if (accountId) {
                    console.log(
                      "Found account ID using extractAccountId:",
                      accountId
                    );
                  }
                }

                if (!accountId) {
                  console.error(
                    "Failed to extract account ID. Effects:",
                    effects
                  );
                  toast.error(
                    "Failed to get on-chain account address. Please check the console for details and try again."
                  );
                  setIsSubmitting(false);
                  return;
                }

                console.log("Successfully extracted account ID:", accountId);

                // Step 2: Create Supabase account with the on-chain account address
                toast.loading("Completing registration...");

                const registrationResult = await registerUser(
                  data,
                  walletAddress,
                  accountId
                );

                if (registrationResult.success) {
                  toast.success(
                    "Registration successful! Please check your email to verify your account."
                  );
                  navigate("/login");
                } else {
                  toast.error(
                    registrationResult.error ||
                      "Registration failed. Please try again."
                  );
                }
              } catch (error) {
                console.error("Error processing transaction:", error);
                toast.error(
                  error instanceof Error && error.message
                    ? error.message
                    : "Failed to process registration. Please try again."
                );
              } finally {
                setIsSubmitting(false);
              }
            },
            onError: (error) => {
              console.error("On-chain account creation error:", error);
              toast.error(
                error instanceof Error && error.message
                  ? error.message
                  : "Failed to create on-chain account. Please try again."
              );
              setIsSubmitting(false);
            },
          }
        );

        // Return early since signAndExecute is async via callbacks
        return;
      } else {
        // No wallet connected - use sponsored transaction (admin pays gas)
        // This is allowed for attendees
        if (data.userType === "attendee") {
          toast.loading("Creating your on-chain account (sponsored)...");

          const sponsoredResult = await requestSponsoredAccountCreation(
            data.email,
            data.userType,
            null // No wallet address for attendees without wallet
          );

          if (!sponsoredResult.success || !sponsoredResult.accountId) {
            toast.error(
              sponsoredResult.error ||
                "Failed to create sponsored account. Please try again."
            );
            setIsSubmitting(false);
            return;
          }

          accountId = sponsoredResult.accountId;
        } else {
          // Organizers must have wallet
          toast.error(
            "Please connect your wallet to register as an organizer."
          );
          setIsSubmitting(false);
          return;
        }
      }

      // Step 2: Create Supabase account with the on-chain account address
      toast.loading("Completing registration...");

      const registrationResult = await registerUser(
        data,
        walletAddress,
        accountId
      );

      if (registrationResult.success) {
        toast.success(
          "Registration successful! Please check your email to verify your account."
        );
        navigate("/login");
      } else {
        toast.error(
          registrationResult.error || "Registration failed. Please try again."
        );
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
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
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (currentStep === STEPS.length) {
            form.handleSubmit(handleSubmit)(e);
          }
        }}
        className="w-full max-w-screen-sm"
      >
        <Card className="shadow-xl">
          <div className="px-8 pb-4">
            {/* Header */}
            <div className="flex flex-col mb-8">
              <img
                src={"/logos/popchain_logo.png"}
                alt="popchain-logo"
                className="mb-2 w-24 h-24 object-contain self-center"
              />
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
                  className="flex-1 btn-gradient"
                >
                  Next
                </Button>
              ) : (
                <Button
                  type="submit"
                  className="flex-1 btn-gradient"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Spinner />
                      <span>Registering...</span>
                    </>
                  ) : (
                    "Complete Registration"
                  )}
                </Button>
              )}
            </div>

            {/* Progress Text */}
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Step {currentStep} of {STEPS.length}
            </div>
            <div className="text-center mt-4">
              <a
                href="/login"
                className="text-sm text-blue-500 hover:underline"
              >
                Already have an account? Login
              </a>
            </div>
          </div>
        </Card>
      </form>
    </Form>
  );
}
