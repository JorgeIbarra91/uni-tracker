import { useState } from "react";
import { Home, BookOpen, User, LogOut, ArrowLeft } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import Dashboard from "../pages/Dashboard";
import Subjects from "../pages/Subjects";
import SubjectDetail from "../pages/SubjectDetail";

const tabs = [
  { id: "dashboard", label: "Inicio", icon: Home },
  { id: "subjects", label: "Ramos", icon: BookOpen },
  { id: "profile", label: "Perfil", icon: User },
];

function ProfilePage({ session }) {
  return (
    <div className="space-y-4">
      <div className="bg-ios-card rounded-2xl p-5 shadow-sm border border-ios-separator">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-ios-blue/10 flex items-center justify-center">
            <User size={28} className="text-ios-blue" strokeWidth={1.8} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-gray-900 truncate">
              Mi Perfil
            </h2>
            <p className="text-sm text-ios-gray truncate">
              {session?.user?.email ?? "Sin correo"}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-ios-card rounded-2xl overflow-hidden shadow-sm border border-ios-separator">
        <div className="px-5 py-3.5 flex items-center justify-between">
          <span className="text-sm text-gray-900">Correo</span>
          <span className="text-sm text-ios-gray truncate ml-4 max-w-[60%] text-right">
            {session?.user?.email ?? "—"}
          </span>
        </div>
        <div className="h-px bg-ios-separator mx-5" />
        <div className="px-5 py-3.5 flex items-center justify-between">
          <span className="text-sm text-gray-900">ID de usuario</span>
          <span className="text-xs text-ios-gray font-mono truncate ml-4 max-w-[50%] text-right">
            {session?.user?.id?.slice(0, 12) ?? "—"}…
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Layout({ session }) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loggingOut, setLoggingOut] = useState(false);

  // Stack-based navigation for drill-down views
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);

  const handleLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    setLoggingOut(false);
  };

  // When switching tabs, clear any drill-down state
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSelectedSubjectId(null);
  };

  // Navigate into a subject detail view
  const handleSelectSubject = (subjectId) => {
    setSelectedSubjectId(subjectId);
  };

  // Navigate back from subject detail to the subjects list
  const handleBackFromDetail = () => {
    setSelectedSubjectId(null);
  };

  // Are we in a drill-down view?
  const isInDetail = activeTab === "subjects" && selectedSubjectId !== null;

  // Determine the header title
  const getHeaderTitle = () => {
    if (isInDetail) return "Detalle del Ramo";
    return tabs.find((t) => t.id === activeTab)?.label ?? "uni-tracker";
  };

  const renderPage = () => {
    // If we're in the subjects tab and a subject is selected, show detail
    if (isInDetail) {
      return (
        <SubjectDetail
          subjectId={selectedSubjectId}
          session={session}
          onBack={handleBackFromDetail}
        />
      );
    }

    switch (activeTab) {
      case "dashboard":
        return <Dashboard session={session} />;
      case "subjects":
        return (
          <Subjects session={session} onSelectSubject={handleSelectSubject} />
        );
      case "profile":
        return <ProfilePage session={session} />;
      default:
        return <Dashboard session={session} />;
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-ios-bg">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-ios-card/80 backdrop-blur-xl border-b border-ios-separator">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            {/* Back button when in detail view */}
            {isInDetail && (
              <button
                onClick={handleBackFromDetail}
                className="p-1 -ml-1 rounded-lg text-ios-blue active:scale-90 active:bg-ios-blue/10 transition-all"
                aria-label="Volver a Ramos"
              >
                <ArrowLeft size={22} strokeWidth={2.2} />
              </button>
            )}
            <h1 className="text-lg font-semibold text-gray-900 tracking-tight truncate">
              {getHeaderTitle()}
            </h1>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-1.5 text-ios-gray hover:text-ios-red transition-colors text-sm active:scale-95 shrink-0"
            aria-label="Cerrar sesión"
          >
            <LogOut size={18} strokeWidth={2} />
          </button>
        </div>
      </header>

      {/* Scrollable content area */}
      <main className="flex-1 overflow-y-auto overscroll-y-contain scroll-smooth pb-[calc(env(safe-area-inset-bottom)+5rem)]">
        <div className="px-4 pt-4 pb-6">{renderPage()}</div>
      </main>

      {/* Bottom Tab Bar — iOS style */}
      <nav
        className="
          fixed bottom-0 left-0 right-0 z-40
          bg-ios-card/75 backdrop-blur-2xl
          border-t border-ios-separator
          pb-[env(safe-area-inset-bottom)]
        "
      >
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {tabs.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => handleTabChange(id)}
                className={`
                  flex flex-col items-center justify-center gap-0.5
                  w-full h-full
                  transition-colors duration-150
                  active:scale-95
                  ${isActive ? "text-ios-blue" : "text-ios-gray"}
                `}
                aria-label={label}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon
                  size={24}
                  strokeWidth={isActive ? 2.2 : 1.8}
                  className="transition-all duration-150"
                />
                <span
                  className={`text-[10px] leading-tight ${
                    isActive ? "font-semibold" : "font-medium"
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
