import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { BookOpen, Loader2, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setSuccessMsg(
          "¡Cuenta creada! Revisa tu correo para confirmar tu cuenta."
        );
      }
    } catch (err) {
      const messages = {
        "Invalid login credentials": "Correo o contraseña incorrectos",
        "User already registered": "Este correo ya está registrado",
        "Password should be at least 6 characters":
          "La contraseña debe tener al menos 6 caracteres",
        "Unable to validate email address: invalid format":
          "El formato del correo no es válido",
      };
      setError(messages[err.message] || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-ios-bg px-6">
      {/* Logo / Branding */}
      <div className="mb-8 flex flex-col items-center">
        <div className="w-16 h-16 bg-ios-blue rounded-2xl flex items-center justify-center shadow-lg mb-4">
          <BookOpen className="w-8 h-8 text-white" strokeWidth={2} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          uni-tracker
        </h1>
        <p className="text-sm text-ios-gray mt-1">
          Organiza tus ramos y evaluaciones
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm">
        {/* Toggle Login / Registro */}
        <div className="flex bg-ios-gray-5 rounded-xl p-1 mb-6">
          <button
            type="button"
            onClick={() => {
              setIsLogin(true);
              setError(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
              isLogin
                ? "bg-white text-gray-900 shadow-sm"
                : "text-ios-gray bg-transparent"
            }`}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLogin(false);
              setError(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
              !isLogin
                ? "bg-white text-gray-900 shadow-sm"
                : "text-ios-gray bg-transparent"
            }`}
          >
            Crear cuenta
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="bg-ios-card rounded-xl overflow-hidden shadow-sm border border-ios-separator">
            {/* Email */}
            <div className="relative">
              <input
                type="email"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3.5 bg-transparent text-gray-900 placeholder-ios-gray-2 outline-none text-[16px]"
              />
            </div>

            <div className="h-px bg-ios-separator mx-4" />

            {/* Password */}
            <div className="relative flex items-center">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={isLogin ? "current-password" : "new-password"}
                minLength={6}
                className="w-full px-4 py-3.5 bg-transparent text-gray-900 placeholder-ios-gray-2 outline-none text-[16px] pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 p-1 text-ios-gray-2 hover:text-ios-gray transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-ios-red/10 border border-ios-red/20 text-ios-red text-sm px-4 py-3 rounded-xl text-center font-medium">
              {error}
            </div>
          )}

          {/* Success message */}
          {successMsg && (
            <div className="bg-ios-green/10 border border-ios-green/20 text-ios-green text-sm px-4 py-3 rounded-xl text-center font-medium">
              {successMsg}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-ios-blue hover:bg-ios-blue-dark active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 text-white font-semibold rounded-xl transition-all duration-150 flex items-center justify-center gap-2 shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{isLogin ? "Ingresando..." : "Creando cuenta..."}</span>
              </>
            ) : (
              <span>{isLogin ? "Iniciar sesión" : "Crear cuenta"}</span>
            )}
          </button>
        </form>

        {/* Footer hint */}
        <p className="text-center text-xs text-ios-gray mt-6">
          {isLogin
            ? "¿No tienes cuenta? Toca \"Crear cuenta\" arriba"
            : "La contraseña debe tener al menos 6 caracteres"}
        </p>
      </div>
    </div>
  );
}
