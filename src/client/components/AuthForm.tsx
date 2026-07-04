import { useState } from "react";

type Credentials = { username: string; password: string };

interface Props {
  onLogin: (credentials: Credentials) => Promise<void>;
  onRegister: (credentials: Credentials) => Promise<void>;
}

export default function AuthForm({ onLogin, onRegister }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isRegister = mode === "register";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const action = isRegister ? onRegister : onLogin;
      await action({ username, password });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Qualcosa è andato storto.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="max-w-sm mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Patente Quiz</h1>
      <p className="text-gray-500 mb-8">
        {isRegister ? "Crea un account" : "Accedi per continuare"}
      </p>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome utente
          </label>
          <input
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2"
            required
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-lg bg-gray-900 text-white font-medium
                   hover:bg-gray-700 transition-colors cursor-pointer disabled:opacity-50"
        >
          {submitting ? "Attendere…" : isRegister ? "Registrati" : "Accedi"}
        </button>
      </form>

      <button
        onClick={() => {
          setMode(isRegister ? "login" : "register");
          setError(null);
        }}
        className="mt-4 w-full text-sm text-gray-500 hover:text-gray-900 cursor-pointer"
      >
        {isRegister
          ? "Hai già un account? Accedi"
          : "Non hai un account? Registrati"}
      </button>
    </main>
  );
}
