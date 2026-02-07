import { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";
import Login from "./components/Login";
import Layout from "./components/Layout";

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get the current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth state changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
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

  if (!session) {
    return <Login />;
  }

  return <Layout session={session} />;
}

export default App;
