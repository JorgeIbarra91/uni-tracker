import { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  CalendarDays,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  FileText,
  Presentation,
  ClipboardList,
  BarChart3,
  Calendar,
  ChevronDown,
  ChevronUp,
  Filter,
  X,
} from "lucide-react";
import {
  format,
  formatDistanceToNow,
  differenceInHours,
  differenceInCalendarDays,
  isPast,
  isToday,
  isTomorrow,
  parseISO,
  addDays,
  startOfDay,
} from "date-fns";
import { es } from "date-fns/locale";

// ── Eval type icons ─────────────────────────────────────────────
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

// ── Due badge ───────────────────────────────────────────────────
function DueBadge({ dueDate }) {
  const now = new Date();
  const due = parseISO(dueDate);
  const hoursLeft = differenceInHours(due, now);

  if (isPast(due)) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-ios-red/10 text-ios-red">
        <AlertTriangle size={11} />
        Vencida
      </span>
    );
  }

  if (hoursLeft < 6) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-ios-red/10 text-ios-red">
        <Clock size={11} />
        {hoursLeft <= 1 ? "<1h" : `${hoursLeft}h`}
      </span>
    );
  }

  if (hoursLeft < 24) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-ios-orange/10 text-ios-orange">
        <Clock size={11} />
        {hoursLeft}h
      </span>
    );
  }

  return null;
}

// ── Day header label ────────────────────────────────────────────
function getDayLabel(dateStr) {
  const date = parseISO(dateStr);

  if (isToday(date)) return "Hoy";
  if (isTomorrow(date)) return "Mañana";

  const daysFromNow = differenceInCalendarDays(date, new Date());
  if (daysFromNow >= 2 && daysFromNow <= 6) {
    // "Miércoles" (this week)
    return format(date, "EEEE", { locale: es });
  }

  return format(date, "EEEE d 'de' MMMM", { locale: es });
}

function getDaySubLabel(dateStr) {
  const date = parseISO(dateStr);

  if (isToday(date)) {
    return format(date, "d 'de' MMMM", { locale: es });
  }
  if (isTomorrow(date)) {
    return format(date, "d 'de' MMMM", { locale: es });
  }

  const daysFromNow = differenceInCalendarDays(date, new Date());
  if (daysFromNow >= 2 && daysFromNow <= 6) {
    return format(date, "d 'de' MMMM", { locale: es });
  }

  return `en ${daysFromNow} días`;
}

// ── Filter options ──────────────────────────────────────────────
const RANGE_OPTIONS = [
  { value: 7, label: "7 días" },
  { value: 14, label: "14 días" },
  { value: 30, label: "30 días" },
  { value: 60, label: "60 días" },
];

// ═════════════════════════════════════════════════════════════════
export default function Agenda({ session }) {
  const [evaluations, setEvaluations] = useState([]);
  const [subjects, setSubjects] = useState({});
  const [loading, setLoading] = useState(true);
  const [rangeDays, setRangeDays] = useState(30);
  const [showFilters, setShowFilters] = useState(false);
  const [filterSubject, setFilterSubject] = useState("all");
  const [togglingId, setTogglingId] = useState(null);

  const userId = session?.user?.id;

  // ── Fetch ───────────────────────────────────────────────────
  const fetchData = async () => {
    if (!userId) return;
    setLoading(true);

    const now = new Date();
    const rangeEnd = addDays(now, rangeDays);

    const [subjectsRes, evalsRes] = await Promise.all([
      supabase.from("subjects").select("id, name, color").eq("user_id", userId),
      supabase
        .from("evaluations")
        .select("*")
        .eq("user_id", userId)
        .eq("completed", false)
        .not("due_date", "is", null)
        .gte("due_date", now.toISOString())
        .lte("due_date", rangeEnd.toISOString())
        .order("due_date", { ascending: true }),
    ]);

    // Build subject lookup map
    const map = {};
    if (subjectsRes.data) {
      subjectsRes.data.forEach((s) => {
        map[s.id] = s;
      });
    }
    setSubjects(map);

    if (evalsRes.data) {
      setEvaluations(evalsRes.data);
    } else {
      setEvaluations([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [userId, rangeDays]);

  // ── Group evaluations by day ────────────────────────────────
  const groupedByDay = useMemo(() => {
    let filtered = evaluations;

    // Apply subject filter
    if (filterSubject !== "all") {
      filtered = filtered.filter((e) => e.subject_id === filterSubject);
    }

    const groups = {};
    for (const evalItem of filtered) {
      const dayKey = format(parseISO(evalItem.due_date), "yyyy-MM-dd");
      if (!groups[dayKey]) {
        groups[dayKey] = [];
      }
      groups[dayKey].push(evalItem);
    }

    // Convert to sorted array of [dayKey, evals[]]
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [evaluations, filterSubject]);

  // Subject list for filter
  const subjectList = useMemo(() => {
    return Object.values(subjects).sort((a, b) => a.name.localeCompare(b.name));
  }, [subjects]);

  // Stats
  const totalPending = evaluations.length;
  const totalFiltered = groupedByDay.reduce(
    (sum, [, evals]) => sum + evals.length,
    0,
  );
  const daysWithEvals = groupedByDay.length;

  // ── Toggle complete ─────────────────────────────────────────
  const handleToggleComplete = async (evalId) => {
    setTogglingId(evalId);
    const { error } = await supabase
      .from("evaluations")
      .update({ completed: true })
      .eq("id", evalId);

    if (!error) {
      setEvaluations((prev) => prev.filter((e) => e.id !== evalId));
    }
    setTogglingId(null);
  };

  // ── Loading ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-ios-blue animate-spin" />
        <p className="text-sm text-ios-gray mt-3">Cargando agenda...</p>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-ios-gray uppercase tracking-wide">
            Próximos {rangeDays} días
          </h2>
          <p className="text-xs text-ios-gray-2 mt-0.5">
            {totalPending}{" "}
            {totalPending === 1
              ? "evaluación pendiente"
              : "evaluaciones pendientes"}
            {filterSubject !== "all" && ` · ${totalFiltered} mostradas`}
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`
            flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium
            transition-all duration-150 active:scale-95
            ${
              showFilters || filterSubject !== "all"
                ? "bg-ios-blue text-white"
                : "bg-ios-gray-5 text-ios-gray"
            }
          `}
        >
          <Filter size={14} strokeWidth={2} />
          Filtros
          {showFilters ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-ios-card rounded-2xl p-4 shadow-sm border border-ios-separator space-y-4 animate-slide-down">
          {/* Range selector */}
          <div>
            <label className="block text-xs font-semibold text-ios-gray uppercase tracking-wide mb-2">
              Rango de tiempo
            </label>
            <div className="flex gap-2">
              {RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setRangeDays(opt.value)}
                  className={`
                    flex-1 py-2 rounded-xl text-xs font-semibold transition-all duration-150 active:scale-95
                    ${
                      rangeDays === opt.value
                        ? "bg-ios-blue text-white shadow-sm"
                        : "bg-ios-gray-6 text-ios-gray hover:bg-ios-gray-5"
                    }
                  `}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Subject filter */}
          {subjectList.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-ios-gray uppercase tracking-wide mb-2">
                Filtrar por ramo
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterSubject("all")}
                  className={`
                    px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 active:scale-95
                    ${
                      filterSubject === "all"
                        ? "bg-ios-blue text-white"
                        : "bg-ios-gray-6 text-ios-gray"
                    }
                  `}
                >
                  Todos
                </button>
                {subjectList.map((subj) => (
                  <button
                    key={subj.id}
                    onClick={() =>
                      setFilterSubject(
                        filterSubject === subj.id ? "all" : subj.id,
                      )
                    }
                    className={`
                      px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 active:scale-95
                      flex items-center gap-1.5
                      ${
                        filterSubject === subj.id
                          ? "text-white shadow-sm"
                          : "bg-ios-gray-6 text-ios-gray"
                      }
                    `}
                    style={
                      filterSubject === subj.id
                        ? { backgroundColor: subj.color || "#007AFF" }
                        : undefined
                    }
                  >
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{
                        backgroundColor:
                          filterSubject === subj.id
                            ? "#fff"
                            : subj.color || "#007AFF",
                      }}
                    />
                    {subj.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {groupedByDay.length === 0 && (
        <div className="bg-ios-card rounded-2xl p-5 shadow-sm border border-ios-separator">
          <div className="flex flex-col items-center justify-center py-8 text-ios-gray-2">
            <Calendar size={48} strokeWidth={1.3} />
            <p className="text-sm mt-3 text-ios-gray">
              {filterSubject !== "all"
                ? "No hay evaluaciones para este ramo"
                : "No hay evaluaciones pendientes"}
            </p>
            <p className="text-xs mt-1 text-ios-gray-2">
              {filterSubject !== "all"
                ? "Prueba con otro filtro o rango de tiempo"
                : `En los próximos ${rangeDays} días estás libre 🎉`}
            </p>
            {filterSubject !== "all" && (
              <button
                onClick={() => setFilterSubject("all")}
                className="mt-3 px-4 py-2 bg-ios-blue text-white text-xs font-semibold rounded-xl active:scale-95 transition-all"
              >
                Ver todos los ramos
              </button>
            )}
          </div>
        </div>
      )}

      {/* Summary strip */}
      {groupedByDay.length > 0 && (
        <div className="flex gap-3">
          <div className="flex-1 bg-ios-card rounded-2xl p-3 shadow-sm border border-ios-separator text-center">
            <p className="text-xl font-bold text-ios-blue">{totalFiltered}</p>
            <p className="text-[10px] text-ios-gray font-medium mt-0.5">
              {totalFiltered === 1 ? "Evaluación" : "Evaluaciones"}
            </p>
          </div>
          <div className="flex-1 bg-ios-card rounded-2xl p-3 shadow-sm border border-ios-separator text-center">
            <p className="text-xl font-bold text-ios-orange">{daysWithEvals}</p>
            <p className="text-[10px] text-ios-gray font-medium mt-0.5">
              {daysWithEvals === 1 ? "Día" : "Días"} con entregas
            </p>
          </div>
        </div>
      )}

      {/* Timeline / grouped by day */}
      <div className="space-y-5">
        {groupedByDay.map(([dayKey, dayEvals]) => {
          const dayLabel = getDayLabel(dayKey);
          const daySubLabel = getDaySubLabel(dayKey);
          const isDayToday = isToday(parseISO(dayKey));
          const isDayTomorrow = isTomorrow(parseISO(dayKey));
          const isUrgentDay = isDayToday || isDayTomorrow;

          return (
            <div key={dayKey}>
              {/* Day header */}
              <div className="flex items-center gap-3 mb-2.5">
                {/* Timeline dot */}
                <div
                  className={`
                    w-3 h-3 rounded-full shrink-0 ring-2 ring-offset-2 ring-offset-ios-bg
                    ${
                      isDayToday
                        ? "bg-ios-red ring-ios-red/30"
                        : isDayTomorrow
                          ? "bg-ios-orange ring-ios-orange/30"
                          : "bg-ios-blue ring-ios-blue/20"
                    }
                  `}
                />
                <div className="flex-1 min-w-0">
                  <h3
                    className={`text-sm font-semibold capitalize ${
                      isDayToday
                        ? "text-ios-red"
                        : isDayTomorrow
                          ? "text-ios-orange"
                          : "text-gray-900"
                    }`}
                  >
                    {dayLabel}
                  </h3>
                  <p className="text-[11px] text-ios-gray-2">{daySubLabel}</p>
                </div>
                <span
                  className={`
                    text-[11px] font-semibold px-2 py-0.5 rounded-full
                    ${
                      isUrgentDay
                        ? "bg-ios-red/10 text-ios-red"
                        : "bg-ios-gray-5 text-ios-gray"
                    }
                  `}
                >
                  {dayEvals.length}
                </span>
              </div>

              {/* Eval cards for this day */}
              <div className="space-y-2 ml-1.5 pl-4 border-l-2 border-ios-gray-5">
                {dayEvals.map((evalItem) => {
                  const subject = subjects[evalItem.subject_id];
                  const subjectColor = subject?.color || "#007AFF";
                  const EvalIcon = getEvalIcon(evalItem.type);
                  const isToggling = togglingId === evalItem.id;

                  return (
                    <div
                      key={evalItem.id}
                      className="bg-ios-card rounded-2xl shadow-sm border border-ios-separator overflow-hidden flex items-stretch active:bg-ios-gray-6/50 transition-colors"
                    >
                      {/* Color accent */}
                      <div
                        className="w-1.5 shrink-0"
                        style={{ backgroundColor: subjectColor }}
                      />

                      <div className="flex-1 px-3.5 py-3">
                        {/* Top: icon + title + badge */}
                        <div className="flex items-start gap-2.5">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                            style={{
                              backgroundColor: `${subjectColor}15`,
                            }}
                          >
                            <EvalIcon
                              size={16}
                              strokeWidth={1.8}
                              style={{ color: subjectColor }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-semibold text-gray-900 truncate">
                                {evalItem.title}
                              </h4>
                              {evalItem.due_date && (
                                <DueBadge dueDate={evalItem.due_date} />
                              )}
                            </div>
                            <p className="text-xs text-ios-gray mt-0.5 truncate">
                              {subject?.name || "Sin ramo"} ·{" "}
                              <span className="capitalize">
                                {evalItem.type || "evaluación"}
                              </span>
                              {evalItem.weight > 0 && (
                                <span className="text-ios-gray-2">
                                  {" "}
                                  · {evalItem.weight}%
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Bottom: time + complete button */}
                        <div className="flex items-center justify-between mt-2 ml-[42px]">
                          <div className="flex items-center gap-1.5 text-xs text-ios-gray-2">
                            <Clock size={12} />
                            <span>
                              {format(parseISO(evalItem.due_date), "HH:mm")}
                            </span>
                            <span className="text-ios-gray-3">·</span>
                            <span>
                              {formatDistanceToNow(
                                parseISO(evalItem.due_date),
                                {
                                  addSuffix: true,
                                  locale: es,
                                },
                              )}
                            </span>
                          </div>
                          <button
                            onClick={() => handleToggleComplete(evalItem.id)}
                            disabled={isToggling}
                            className="flex items-center gap-1 text-xs font-medium text-ios-green hover:text-ios-green/80 active:scale-95 transition-all disabled:opacity-50"
                          >
                            {isToggling ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={14} strokeWidth={2} />
                            )}
                            <span>Lista</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Inline animations */}
      <style>{`
        @keyframes slide-down {
          from {
            transform: translateY(-8px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-down {
          animation: slide-down 0.2s cubic-bezier(0.32, 0.72, 0, 1) forwards;
        }
      `}</style>
    </div>
  );
}
