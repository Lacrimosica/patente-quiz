import AuthForm from "./components/AuthForm";
import Quiz from "./components/Quiz";
import { useAuth } from "./hooks/useAuth";

export default function App() {
  const { user, loading, login, register, logout } = useAuth();

  if (loading) {
    return (
      <p className="text-lg font-semibold p-4 rounded-lg m-auto text-gray-500">
        Caricamento...
      </p>
    );
  }

  if (!user) return <AuthForm onLogin={login} onRegister={register} />;

  // Keyed on user id so the quiz remounts (and refetches) on account switch.
  return <Quiz key={user.id} user={user} onLogout={logout} />;
}
