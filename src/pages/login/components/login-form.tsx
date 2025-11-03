import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";
import { loginSchema } from "@/schemas/login";
import type { LoginFormData } from "@/schemas/login";
import { useAuth } from "@/contexts/auth-context";
import type { UserProfile } from "@/types/database";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    try {
      const { error, profile } = await signIn(data.email, data.password);

      if (error) {
        toast.error(error.message || "Invalid email or password");
        return;
      }

      if (!profile) {
        toast.error("User profile not found. Please contact support.");
        return;
      }

      toast.success("Login successful!");

      // Redirect based on user role from profile
      // role: 0 = Attendee, 1 = Organizer, 2 = Both
      const role = profile.role;
      const isAdminUser =
        profile.email === import.meta.env.VITE_ADMIN_EMAIL ||
        ("is_admin" in profile &&
          (profile as UserProfile & { is_admin?: boolean }).is_admin === true);
      const isOrganizerUser = role === 1 || role === 2;
      const isAttendeeUser = role === 0 || role === 2;

      if (isAdminUser) {
        navigate("/admin/dashboard");
      } else if (isOrganizerUser && !isAttendeeUser) {
        navigate("/organizer/dashboard");
      } else if (isAttendeeUser && !isOrganizerUser) {
        navigate("/attendee/dashboard");
      } else if (isOrganizerUser && isAttendeeUser) {
        // User has both roles, default to organizer
        navigate("/organizer/dashboard");
      } else {
        navigate("/");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      console.error("Login error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
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
                Welcome Back! 🎉
              </h1>
              <p className="text-muted-foreground">
                Sign in to your PopChain account.
              </p>
            </div>

            {/* Form Content */}
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">
                      Email Address
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="john@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">
                      Password
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Submit Button */}
            <div className="mt-8">
              <Button
                type="submit"
                className="w-full btn-gradient"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Spinner />
                    <span>Signing in...</span>
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </div>

            {/* Link to Register */}
            <div className="text-center mt-4">
              <a
                href="/register"
                className="text-sm text-blue-500 hover:underline"
              >
                Don't have an account? Register
              </a>
            </div>
          </div>
        </Card>
      </form>
    </Form>
  );
}
