import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";

const schema = z.object({
  name: z.string().min(2, "Name is too short"),
  email: z.string().email(),
  password: z.string().min(6),
  confirm: z.string().min(6),
}).refine((data) => data.password === data.confirm, {
  message: "Passwords do not match",
  path: ["confirm"],
});

type FormValues = z.infer<typeof schema>;

export default function Signup() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    console.log("signup submit", values);
    await new Promise((r) => setTimeout(r, 800));
    navigate("/login");
  };

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center p-6">
      <div className="w-full rounded-2xl border bg-card/80 p-6 shadow-[0_0_30px_#ff2bd633]">
        <h1 className="mb-1 text-center text-2xl font-extrabold tracking-tight">Create account</h1>
        <p className="mb-6 text-center text-sm text-foreground/70">Join and start processing invoices</p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-foreground/60">Full name</label>
            <input
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
              placeholder="Ada Lovelace"
              {...register("name")}
            />
            {errors.name && <div className="mt-1 text-xs text-destructive">{errors.name.message}</div>}
          </div>
          <div>
            <label className="mb-1 block text-xs text-foreground/60">Email</label>
            <input
              type="email"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
              placeholder="you@example.com"
              {...register("email")}
            />
            {errors.email && <div className="mt-1 text-xs text-destructive">{errors.email.message}</div>}
          </div>
          <div>
            <label className="mb-1 block text-xs text-foreground/60">Password</label>
            <input
              type="password"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
              placeholder="••••••••"
              {...register("password")}
            />
            {errors.password && <div className="mt-1 text-xs text-destructive">{errors.password.message}</div>}
          </div>
          <div>
            <label className="mb-1 block text-xs text-foreground/60">Confirm password</label>
            <input
              type="password"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
              placeholder="••••••••"
              {...register("confirm")}
            />
            {errors.confirm && <div className="mt-1 text-xs text-destructive">{errors.confirm.message}</div>}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create account"}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm text-foreground/70">
          Already have an account?{" "}
          <Link to="/login" className="text-[hsl(var(--primary))] hover:underline">Log in</Link>
        </div>
      </div>
    </main>
  );
}
