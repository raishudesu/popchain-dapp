import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleSubmit = (data: LoginFormData) => {
    console.log("Form submitted:", data);
    // Handle form submission here
    alert("Login successful! Check console for details.");
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
              <Button type="submit" className="w-full btn-gradient">
                Sign In
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
