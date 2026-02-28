import { LoginForm } from "@/app/login/LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="min-h-screen px-4 py-16">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6">
          <p className="helix-display text-sm font-semibold uppercase tracking-[0.25em] helix-accent">Helix</p>
          <h2 className="helix-display text-4xl font-semibold helix-title">Patricians</h2>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
