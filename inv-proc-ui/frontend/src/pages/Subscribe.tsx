import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "../components/ui/button";

const schema = z.object({ email: z.string().email() });

type FormValues = z.infer<typeof schema>;

export default function Subscribe() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    console.log("subscribe submit", values);
    await new Promise((r) => setTimeout(r, 600));
    reset();
  };

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg items-center justify-center p-6">
      <div className="w-full rounded-2xl border bg-card/80 p-8 text-center shadow-[0_0_34px_#00ffd533]">
        <h1 className="mb-2 text-3xl font-extrabold tracking-tight">Stay in the loop</h1>
        <p className="mb-6 text-sm text-foreground/70">Subscribe for the latest updates and articles.</p>
        <form onSubmit={handleSubmit(onSubmit)} className="mx-auto flex w-full max-w-md flex-col gap-3 sm:flex-row">
          <div className="relative w-full">
            <input
              type="email"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
              placeholder="you@example.com"
              {...register("email")}
            />
            {errors.email && <div className="mt-1 text-left text-xs text-destructive">{errors.email.message}</div>}
          </div>
          <Button type="submit" disabled={isSubmitting} className="shrink-0">
            {isSubmitting ? "Subscribing..." : "Subscribe"}
          </Button>
        </form>
        {isSubmitSuccessful && (
          <div className="mt-4 text-sm text-[hsl(var(--primary))]">Thanks! You'll hear from us soon.</div>
        )}
      </div>
    </main>
  );
}
