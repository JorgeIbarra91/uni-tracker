import { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileText,
  Presentation,
  ClipboardList,
  BarChart3,
  X,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
  addMonths,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";

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

export default function Calendar({ session }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [evaluations, setEvaluations] = useState([]);
  const [subjects, setSubjects] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);

  const userId = session?.user?.id;

  const fetchData = async () => {
    if (!userId) return;
    setLoading(true);

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    const [subjectsRes, evalsRes] = await Promise.all([
      supabase.from("subjects").select("id, name, color").eq("user_id", userId),
      supabase
        .from("evaluations")
        .select("*")
        .eq("user_id", userId)
        .eq("completed", false)
        .not("due_date", "is", null)
        .gte("due_date", monthStart.toISOString())
        .lte("due_date", monthEnd.toISOString())
        .order("due_date", { ascending: true }),
    ]);

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
  }, [userId, currentMonth]);

  const evaluationsByDate = useMemo(() => {
    const map = {};
    for (const evalItem of evaluations) {
      const dayKey = format(parseISO(evalItem.due_date), "yyyy-MM-dd");
      if (!map[dayKey]) {
        map[dayKey] = [];
      }
      map[dayKey].push(evalItem);
    }
    return map;
  }, [evaluations]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const firstDayOfWeek = monthStart.getDay();
    const paddingDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

    const paddedDays = Array(paddingDays).fill(null).concat(days);

    return paddedDays;
  }, [currentMonth]);

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
    setSelectedDate(null);
  };

  const handleDayClick = (day) => {
    if (!day) return;
    const dayKey = format(day, "yyyy-MM-dd");
    if (evaluationsByDate[dayKey]) {
      setSelectedDate(day);
    }
  };

  const selectedDateEvaluations = useMemo(() => {
    if (!selectedDate) return [];
    const dayKey = format(selectedDate, "yyyy-MM-dd");
    return evaluationsByDate[dayKey] || [];
  }, [selectedDate, evaluationsByDate]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-ios-blue animate-spin" />
        <p className="text-sm text-ios-gray mt-3">Cargando calendario...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-ios-card rounded-2xl p-4 shadow-sm border border-ios-separator">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-lg text-ios-blue hover:bg-ios-blue/10 active:scale-95 transition-all"
            aria-label="Mes anterior"
          >
            <ChevronLeft size={20} strokeWidth={2.5} />
          </button>
          <h2 className="text-base font-semibold text-gray-900 capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: es })}
          </h2>
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-lg text-ios-blue hover:bg-ios-blue/10 active:scale-95 transition-all"
            aria-label="Mes siguiente"
          >
            <ChevronRight size={20} strokeWidth={2.5} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {["L", "M", "M", "J", "V", "S", "D"].map((day, i) => (
            <div
              key={i}
              className="text-center text-xs font-semibold text-ios-gray py-2"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            if (!day) {
              return <div key={`empty-${index}`} className="aspect-square" />;
            }

            const dayKey = format(day, "yyyy-MM-dd");
            const hasEvaluations = evaluationsByDate[dayKey]?.length > 0;
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isTodayDate = isToday(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);

            return (
              <button
                key={dayKey}
                onClick={() => handleDayClick(day)}
                disabled={!hasEvaluations}
                className={`
                  aspect-square rounded-lg flex flex-col items-center justify-center
                  text-sm transition-all relative
                  ${!isCurrentMonth ? "text-ios-gray-3" : "text-gray-900"}
                  ${isTodayDate ? "font-bold" : ""}
                  ${isSelected ? "bg-ios-blue text-white" : ""}
                  ${hasEvaluations && !isSelected ? "bg-ios-blue/10 hover:bg-ios-blue/20 active:scale-95" : ""}
                  ${!hasEvaluations ? "cursor-default" : "cursor-pointer"}
                `}
              >
                <span className={isTodayDate && !isSelected ? "text-ios-blue" : ""}>
                  {format(day, "d")}
                </span>
                {hasEvaluations && (
                  <div className="flex gap-0.5 mt-0.5">
                    {evaluationsByDate[dayKey].slice(0, 3).map((_, i) => (
                      <div
                        key={i}
                        className={`w-1 h-1 rounded-full ${isSelected ? "bg-white" : "bg-ios-blue"}`}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && selectedDateEvaluations.length > 0 && (
        <div className="bg-ios-card rounded-2xl p-4 shadow-sm border border-ios-separator">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">
              {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
            </h3>
            <button
              onClick={() => setSelectedDate(null)}
              className="p-1 rounded-lg text-ios-gray hover:bg-ios-gray-6 active:scale-95 transition-all"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-2">
            {selectedDateEvaluations.map((evalItem) => {
              const subject = subjects[evalItem.subject_id];
              const Icon = getEvalIcon(evalItem.type);

              return (
                <div
                  key={evalItem.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-ios-bg border border-ios-separator"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: subject?.color
                        ? `${subject.color}15`
                        : "#007AFF15",
                    }}
                  >
                    <Icon
                      size={18}
                      strokeWidth={2}
                      style={{ color: subject?.color || "#007AFF" }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-gray-900 truncate">
                      {evalItem.title}
                    </h4>
                    <p className="text-xs text-ios-gray mt-0.5">
                      {subject?.name || "Sin ramo"}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-ios-gray-2 capitalize">
                        {evalItem.type}
                      </span>
                      {evalItem.weight && (
                        <>
                          <span className="text-ios-gray-3">•</span>
                          <span className="text-xs text-ios-gray-2">
                            {evalItem.weight}%
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!selectedDate && evaluations.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-ios-gray">
            No hay evaluaciones en este mes
          </p>
        </div>
      )}
    </div>
  );
}
