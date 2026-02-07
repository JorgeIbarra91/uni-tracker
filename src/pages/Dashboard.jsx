import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  CalendarDays,
  Clock,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  Loader2,
  FileText,
  Presentation,
  ClipboardList,
  BarChart3,
  Bell,
  BellOff,
  BellRing,
  X,
} from "lucide-react";
import {
  format,
  formatDistanceToNow,
  differenceInHours,
  isPast,
  isToday,
  isTomorrow,
  parseISO,
} from "date-fns";
import { es } from "date-fns/locale";
import {
  supportsNotifications,
  getPermissionStatus,
  requestPermission,
  startNotificationChecker,
  stopNotificationChecker,
} from "../lib/notifications";

const TYPE_ICONS = {
  prueba: ClipboardList,
  tarea: FileText,
  trabajo: FileText,
  exposicion: Presentation,
  presentacion: Presentation,
  examen: ClipboardList,
  quiz: ClipboardList,
  proyecto: BarChart3,
};

function getEvalIcon(type) {
  const key = (type || "").toLowerCase().trim();
  return TYPE_ICONS[key] || FileText;
}

function DueBadge({ dueDate }) {
  const now = new Date();
  const due = parseISO(dueDate);
  const hoursLeft = differenceInHours(due, now);

  if (isPast(due)) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-ios-gray/10 text-ios-gray">
        Vencida
      </span>
    );
  }

  if (hoursLeft < 24) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-ios-red/10 text-ios-red animate-pulse">
        <AlertTriangle size={12} strokeWidth={2.5} />
        ¡Mañana!
      </span>
    );
  }

  if (hoursLeft < 72) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-ios-orange/10 text-ios-orange">
        <Clock size={12} strokeWidth={2.5} />
        Pronto
      </span>
    );
  }

  return null;
}

function formatDueDate(dueDate) {
  const due = parseISO(dueDate);

  if (isToday(due)) {
    return `Hoy, ${format(due, "HH:mm")}`;
  }
  if (isTomorrow(due)) {
    return `Mañana, ${format(due, "HH:mm")}`;
  }
  return format(due, "EEE d 'de' MMM", { locale: es });
}

function formatTimeLeft(dueDate) {
  const due = parseISO(dueDate);
  if (isPast(due)) return "Plazo vencido";
  return `Quedan ${formatDistanceToNow(due, { locale: es })}`;
}

// ── Urgent banner component ─────────────────────────────────────────
function UrgentBanner({ urgentEvals, onDismiss }) {
  if (!urgentEvals || urgentEvals.length === 0) return null;

  return (
    <div className="bg-ios-red/10 border border-ios-red/20 rounded-2xl p-4 relative overflow-hidden">
      {/* Dismiss button */}
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 p-1 rounded-full text-ios-red/50 hover:text-ios-red active:scale-90 transition-all"
        aria-label="Cerrar alerta"
      >
        <X size={16} strokeWidth={2.5} />
      </button>

      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 bg-ios-red/15 rounded-full flex items-center justify-center">
          <BellRing size={16} className="text-ios-red" strokeWidth={2.2} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-ios-red">
            ⚠️{" "}
            {urgentEvals.length === 1
              ? "¡1 entrega en menos de 24h!"
              : `¡${urgentEvals.length} entregas en menos de 24h!`}
          </h3>
        </div>
      </div>

      {/* List of urgent items */}
      <div className="space-y-2">
        {urgentEvals.slice(0, 3).map((evalItem) => (
          <div
            key={evalItem.id}
            className="flex items-center gap-3 bg-white/60 rounded-xl px-3 py-2.5"
          >
            <AlertTriangle
              size={16}
              className="text-ios-red shrink-0 animate-pulse"
              strokeWidth={2.2}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {evalItem.title}
              </p>
              <p className="text-[11px] text-ios-gray">
                {evalItem.subjectName} — Hoy a las {evalItem.timeStr} · Quedan{" "}
                {evalItem.hoursLeft <= 1
                  ? "menos de 1h"
                  : `${evalItem.hoursLeft}h`}
              </p>
            </div>
          </div>
        ))}
        {urgentEvals.length > 3 && (
          <p className="text-xs text-ios-red/70 text-center font-medium">
            +{urgentEvals.length - 3} más
          </p>
        )}
      </div>
    </div>
  );
}

// ── Notification permission card ────────────────────────────────────
function NotificationPermissionCard() {
  const [permStatus, setPermStatus] = useState(() => getPermissionStatus());
  const [requesting, setRequesting] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem("uni-tracker-notif-dismissed") === "true";
    } catch {
      return false;
    }
  });

  if (!supportsNotifications()) return null;
  if (permStatus === "granted") return null;
  if (permStatus === "denied") return null;
  if (dismissed) return null;

  const handleRequest = async () => {
    setRequesting(true);
    const result = await requestPermission();
    setPermStatus(result);
    setRequesting(false);
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem("uni-tracker-notif-dismissed", "true");
    } catch {
      // ignore
    }
  };

  return (
    <div className="bg-ios-blue/5 border border-ios-blue/15 rounded-2xl p-4 relative">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 rounded-full text-ios-gray-3 hover:text-ios-gray active:scale-90 transition-all"
        aria-label="Cerrar"
      >
        <X size={14} strokeWidth={2.5} />
      </button>

      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-ios-blue/10 rounded-xl flex items-center justify-center shrink-0">
          <Bell size={20} className="text-ios-blue" strokeWidth={1.8} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900">
            Activar notificaciones
          </h3>
          <p className="text-xs text-ios-gray mt-0.5 leading-relaxed">
            Recibe alertas cuando una evaluación vence en menos de 24 horas.
          </p>
          <button
            onClick={handleRequest}
            disabled={requesting}
            className="mt-2.5 flex items-center gap-1.5 px-4 py-2 bg-ios-blue hover:bg-ios-blue-dark active:scale-[0.97] disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-all"
          >
            {requesting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Solicitando...</span>
              </>
            ) : (
              <>
                <Bell size={14} strokeWidth={2} />
                <span>Permitir notificaciones</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ──────────────────────────────────────────────────
export default function Dashboard({ session }) {
  const [evaluations, setEvaluations] = useState([]);
  const [subjects, setSubjects] = useState({});
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0 });
  const [urgentEvals, setUrgentEvals] = useState([]);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const userId = session?.user?.id;

  // Callback for notification checker
  const handleUrgentEvals = useCallback((evals) => {
    setUrgentEvals(evals);
  }, []);

  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      setLoading(true);

      // Fetch subjects and evaluations in parallel
      const [subjectsRes, evalsRes, statsRes] = await Promise.all([
        supabase
          .from("subjects")
          .select("id, name, color")
          .eq("user_id", userId),
        supabase
          .from("evaluations")
          .select("*")
          .eq("user_id", userId)
          .eq("completed", false)
          .order("due_date", { ascending: true })
          .limit(20),
        supabase
          .from("evaluations")
          .select("id, completed")
          .eq("user_id", userId),
      ]);

      // Build subjects lookup map
      if (subjectsRes.data) {
        const map = {};
        subjectsRes.data.forEach((s) => {
          map[s.id] = s;
        });
        setSubjects(map);
      }

      if (evalsRes.data) {
        setEvaluations(evalsRes.data);
      }

      if (statsRes.data) {
        const total = statsRes.data.length;
        const completed = statsRes.data.filter((e) => e.completed).length;
        setStats({ total, completed, pending: total - completed });
      }

      setLoading(false);
    };

    fetchData();

    // Start notification checker (runs immediately + every 30min)
    startNotificationChecker(userId, handleUrgentEvals);

    return () => {
      stopNotificationChecker();
    };
  }, [userId, handleUrgentEvals]);

  // Toggle evaluation as completed
  const handleToggleComplete = async (evalItem) => {
    const { error } = await supabase
      .from("evaluations")
      .update({ completed: true })
      .eq("id", evalItem.id);

    if (!error) {
      setEvaluations((prev) => prev.filter((e) => e.id !== evalItem.id));
      setStats((prev) => ({
        ...prev,
        completed: prev.completed + 1,
        pending: prev.pending - 1,
      }));
      // Also remove from urgent list
      setUrgentEvals((prev) => prev.filter((e) => e.id !== evalItem.id));
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-ios-blue animate-spin" />
        <p className="text-sm text-ios-gray mt-3">Cargando dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Urgent evaluations banner (<24h) */}
      {!bannerDismissed && urgentEvals.length > 0 && (
        <UrgentBanner
          urgentEvals={urgentEvals}
          onDismiss={() => setBannerDismissed(true)}
        />
      )}

      {/* Notification permission request */}
      <NotificationPermissionCard />

      {/* Welcome card */}
      <div className="bg-ios-card rounded-2xl p-5 shadow-sm border border-ios-separator">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              ¡Hola! 👋
            </h2>
            <p className="text-sm text-ios-gray leading-relaxed">
              Tienes{" "}
              <span className="font-semibold text-ios-blue">
                {stats.pending}
              </span>{" "}
              {stats.pending === 1
                ? "evaluación pendiente"
                : "evaluaciones pendientes"}
              .
            </p>
          </div>
          {/* Notification status indicator */}
          {supportsNotifications() && (
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center ${
                getPermissionStatus() === "granted"
                  ? "bg-ios-green/10"
                  : "bg-ios-gray-5"
              }`}
              title={
                getPermissionStatus() === "granted"
                  ? "Notificaciones activas"
                  : "Notificaciones desactivadas"
              }
            >
              {getPermissionStatus() === "granted" ? (
                <Bell size={18} className="text-ios-green" strokeWidth={2} />
              ) : (
                <BellOff
                  size={18}
                  className="text-ios-gray-2"
                  strokeWidth={2}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-ios-card rounded-2xl p-4 shadow-sm border border-ios-separator text-center">
          <p className="text-2xl font-bold text-ios-blue">{stats.total}</p>
          <p className="text-[11px] text-ios-gray font-medium mt-0.5">Total</p>
        </div>
        <div className="bg-ios-card rounded-2xl p-4 shadow-sm border border-ios-separator text-center">
          <p className="text-2xl font-bold text-ios-green">{stats.completed}</p>
          <p className="text-[11px] text-ios-gray font-medium mt-0.5">Listas</p>
        </div>
        <div className="bg-ios-card rounded-2xl p-4 shadow-sm border border-ios-separator text-center">
          <p className="text-2xl font-bold text-ios-orange">{stats.pending}</p>
          <p className="text-[11px] text-ios-gray font-medium mt-0.5">
            Pendientes
          </p>
        </div>
      </div>

      {/* Upcoming evaluations */}
      <div>
        <h3 className="text-sm font-semibold text-ios-gray uppercase tracking-wide mb-3">
          Próximas Entregas
        </h3>

        {evaluations.length === 0 ? (
          <div className="bg-ios-card rounded-2xl p-5 shadow-sm border border-ios-separator">
            <div className="flex flex-col items-center justify-center py-8 text-ios-gray-2">
              <CheckCircle2
                size={40}
                strokeWidth={1.5}
                className="text-ios-green"
              />
              <p className="text-sm mt-3 text-ios-gray font-medium">
                ¡Todo al día!
              </p>
              <p className="text-xs mt-1 text-ios-gray-2">
                No tienes evaluaciones pendientes
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {evaluations.map((evalItem) => {
              const subject = subjects[evalItem.subject_id];
              const subjectColor = subject?.color || "#007AFF";
              const EvalIcon = getEvalIcon(evalItem.type);

              return (
                <div
                  key={evalItem.id}
                  className="bg-ios-card rounded-2xl shadow-sm border border-ios-separator overflow-hidden flex items-stretch"
                >
                  {/* Color accent */}
                  <div
                    className="w-1.5 shrink-0"
                    style={{ backgroundColor: subjectColor }}
                  />

                  <div className="flex-1 p-4 min-w-0">
                    {/* Top row: title + badge */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${subjectColor}18` }}
                        >
                          <EvalIcon
                            size={18}
                            strokeWidth={1.8}
                            style={{ color: subjectColor }}
                          />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-[15px] font-semibold text-gray-900 truncate">
                            {evalItem.title}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <BookOpen
                              size={12}
                              strokeWidth={2}
                              style={{ color: subjectColor }}
                            />
                            <span className="text-xs text-ios-gray truncate">
                              {subject?.name || "Sin ramo"}
                            </span>
                          </div>
                        </div>
                      </div>
                      {evalItem.due_date && (
                        <DueBadge dueDate={evalItem.due_date} />
                      )}
                    </div>

                    {/* Bottom row: date + type + complete button */}
                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-ios-separator">
                      <div className="flex items-center gap-3">
                        {evalItem.due_date && (
                          <div className="flex items-center gap-1.5 text-ios-gray">
                            <CalendarDays size={13} strokeWidth={2} />
                            <span className="text-xs font-medium">
                              {formatDueDate(evalItem.due_date)}
                            </span>
                          </div>
                        )}
                        {evalItem.type && (
                          <span className="text-xs text-ios-gray-2 bg-ios-gray-6 px-2 py-0.5 rounded-md capitalize">
                            {evalItem.type}
                          </span>
                        )}
                        {evalItem.weight != null && evalItem.weight > 0 && (
                          <span className="text-xs text-ios-gray-2">
                            {evalItem.weight}%
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleToggleComplete(evalItem)}
                        className="flex items-center gap-1.5 text-xs font-medium text-ios-green hover:text-ios-green/80 active:scale-95 transition-all px-2.5 py-1.5 rounded-lg bg-ios-green/8 hover:bg-ios-green/15"
                      >
                        <CheckCircle2 size={14} strokeWidth={2.2} />
                        <span>Listo</span>
                      </button>
                    </div>

                    {/* Time left hint */}
                    {evalItem.due_date && (
                      <p className="text-[11px] text-ios-gray-2 mt-2">
                        {formatTimeLeft(evalItem.due_date)}
                      </p>
                    )}

                    {/* Grade display */}
                    {evalItem.grade != null && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="text-xs font-medium text-ios-gray">
                          Nota:
                        </span>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                            evalItem.grade >= 4.0
                              ? "text-ios-green bg-ios-green/10"
                              : "text-ios-red bg-ios-red/10"
                          }`}
                        >
                          {evalItem.grade}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
