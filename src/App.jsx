import { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";
import Login from "./components/Login";
import Layout from "./components/Layout";

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Get the current session on mount
    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.error("Error getting session:", error.message);
          setError(error.message);
        }
        setSession(session);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to connect to Supabase:", err);
        setError(err.message || "Error de conexión con Supabase");
        setLoading(false);
      });

    // Listen for auth state changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setError(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-ios-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-[3px] border-ios-gray-4 border-t-ios-blue rounded-full animate-spin" />
          <p className="text-sm text-ios-gray font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-ios-bg px-6">
        <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-sm border border-ios-separator text-center space-y-4">
          <div className="w-14 h-14 mx-auto bg-ios-red/10 rounded-full flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">
            Error de conexión
          </h2>
          <p className="text-sm text-ios-gray leading-relaxed">{error}</p>
          <p className="text-xs text-ios-gray-2">
            Verifica que las variables{" "}
            <code className="bg-ios-gray-6 px-1 py-0.5 rounded text-xs">
              VITE_SUPABASE_URL
            </code>{" "}
            y{" "}
            <code className="bg-ios-gray-6 px-1 py-0.5 rounded text-xs">
              VITE_SUPABASE_ANON_KEY
            </code>{" "}
            sean correctas en tu archivo{" "}
            <code className="bg-ios-gray-6 px-1 py-0.5 rounded text-xs">
              .env
            </code>
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-ios-blue hover:bg-ios-blue-dark active:scale-[0.98] text-white font-semibold rounded-xl transition-all duration-150"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  return <Layout session={session} />;
}

export default App;
