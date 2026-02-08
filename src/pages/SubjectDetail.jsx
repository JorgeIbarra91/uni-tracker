import { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  ArrowLeft,
  Plus,
  X,
  Loader2,
  BookOpen,
  CalendarDays,
  Clock,
  CheckCircle2,
  Circle,
  AlertTriangle,
  FileText,
  ClipboardList,
  Presentation,
  BarChart3,
  Trash2,
  PenLine,
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

// ── Evaluation type config ──────────────────────────────────────────
const EVAL_TYPES = [
  { value: "prueba", label: "Prueba", icon: ClipboardList },
  { value: "trabajo", label: "Trabajo", icon: FileText },
  { value: "tarea", label: "Tarea", icon: FileText },
  { value: "exposicion", label: "Exposición", icon: Presentation },
  { value: "proyecto", label: "Proyecto", icon: BarChart3 },
  { value: "quiz", label: "Quiz", icon: ClipboardList },
];

function getEvalIcon(type) {
  const found = EVAL_TYPES.find(
    (t) => t.value === (type || "").toLowerCase().trim(),
  );
  return found?.icon || FileText;
}

// ── Due-date badge ──────────────────────────────────────────────────
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

// ── Helpers ──────────────────────────────────────────────────────────
function formatDueDate(dueDate) {
  const due = parseISO(dueDate);
  if (isToday(due)) return `Hoy, ${format(due, "HH:mm")}`;
  if (isTomorrow(due)) return `Mañana, ${format(due, "HH:mm")}`;
  return format(due, "EEE d 'de' MMM, HH:mm", { locale: es });
}

function formatTimeLeft(dueDate) {
  const due = parseISO(dueDate);
  if (isPast(due)) return "Plazo vencido";
  return `Quedan ${formatDistanceToNow(due, { locale: es })}`;
}

function getDefaultDatetime() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(23, 59, 0, 0);
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

// ── Main component ──────────────────────────────────────────────────
export default function SubjectDetail({ subjectId, session, onBack }) {
  const [subject, setSubject] = useState(null);
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // New evaluation form state
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState("prueba");
  const [formDueDate, setFormDueDate] = useState(getDefaultDatetime);
  const [formWeight, setFormWeight] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const userId = session?.user?.id;
  const subjectColor = subject?.color || "#007AFF";

  // ── Fetch data ────────────────────────────────────────────────────
  const fetchData = async () => {
    if (!userId || !subjectId) return;
    setLoading(true);

    const [subjectRes, evalsRes] = await Promise.all([
      supabase.from("subjects").select("*").eq("id", subjectId).single(),
      supabase
        .from("evaluations")
        .select("*")
        .eq("subject_id", subjectId)
        .eq("user_id", userId)
        .order("due_date", { ascending: true }),
    ]);

    if (subjectRes.data) setSubject(subjectRes.data);
    if (evalsRes.data) setEvaluations(evalsRes.data);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [subjectId, userId]);

  // ── Stats ─────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = evaluations.length;
    const completed = evaluations.filter((e) => e.completed).length;
    const pending = total - completed;

    const withGrade = evaluations.filter((e) => e.grade != null);
    const gradeCount = withGrade.length;

    // Simple average
    const avgGrade =
      gradeCount > 0
        ? (withGrade.reduce((sum, e) => sum + e.grade, 0) / gradeCount).toFixed(
            1,
          )
        : null;

    // Weighted average (only evaluations that have BOTH grade and weight)
    const withGradeAndWeight = evaluations.filter(
      (e) => e.grade != null && e.weight != null && e.weight > 0,
    );
    const totalWeight = withGradeAndWeight.reduce(
      (sum, e) => sum + e.weight,
      0,
    );
    const weightedAvg =
      withGradeAndWeight.length > 0 && totalWeight > 0
        ? (
            withGradeAndWeight.reduce((sum, e) => sum + e.grade * e.weight, 0) /
            totalWeight
          ).toFixed(1)
        : null;

    return { total, completed, pending, avgGrade, weightedAvg, gradeCount };
  }, [evaluations]);

  // ── Toggle completed ──────────────────────────────────────────────
  const handleToggle = async (evalItem) => {
    setTogglingId(evalItem.id);
    const newCompleted = !evalItem.completed;

    const { error } = await supabase
      .from("evaluations")
      .update({ completed: newCompleted })
      .eq("id", evalItem.id);

    if (!error) {
      setEvaluations((prev) =>
        prev.map((e) =>
          e.id === evalItem.id ? { ...e, completed: newCompleted } : e,
        ),
      );
    }
    setTogglingId(null);
  };

  // ── Update grade ──────────────────────────────────────────────────
  const handleUpdateGrade = async (evalItem, newGrade) => {
    // null means "clear grade", otherwise parse the float
    const gradeValue =
      newGrade === null || newGrade === "" ? null : parseFloat(newGrade);

    // Validate: if it's a number, make sure it's reasonable (Chilean scale 1.0 - 7.0)
    if (
      gradeValue !== null &&
      (isNaN(gradeValue) || gradeValue < 1 || gradeValue > 7)
    ) {
      return { valid: false, message: "La nota debe estar entre 1.0 y 7.0" };
    }

    const { error } = await supabase
      .from("evaluations")
      .update({ grade: gradeValue })
      .eq("id", evalItem.id);

    if (!error) {
      setEvaluations((prev) =>
        prev.map((e) =>
          e.id === evalItem.id ? { ...e, grade: gradeValue } : e,
        ),
      );
    }

    return { valid: true };
  };

  // ── Delete evaluation ─────────────────────────────────────────────
  const handleDelete = async (evalItem) => {
    setDeletingId(evalItem.id);

    const { error } = await supabase
      .from("evaluations")
      .delete()
      .eq("id", evalItem.id);

    if (!error) {
      setEvaluations((prev) => prev.filter((e) => e.id !== evalItem.id));
    }
    setDeletingId(null);
  };

  // ── Create evaluation ─────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    setError(null);

    // ── Validation: title required ──────────────────────────────
    if (!formTitle.trim()) {
      setError("El título de la evaluación es obligatorio.");
      return;
    }

    // ── Validation: due date required & not in the past ─────────
    if (!formDueDate) {
      setError("La fecha de entrega es obligatoria.");
      return;
    }

    const dueDateObj = new Date(formDueDate);
    if (isNaN(dueDateObj.getTime())) {
      setError("La fecha ingresada no es válida.");
      return;
    }

    if (isPast(dueDateObj)) {
      setError("La fecha de entrega no puede estar en el pasado.");
      return;
    }

    // ── Validation: weight in range 0-100 ───────────────────────
    if (formWeight !== "" && formWeight != null) {
      const w = parseFloat(formWeight);
      if (isNaN(w)) {
        setError("La ponderación debe ser un número válido.");
        return;
      }
      if (w < 0 || w > 100) {
        setError("La ponderación debe estar entre 0% y 100%.");
        return;
      }
    }

    setSaving(true);

    const payload = {
      user_id: userId,
      subject_id: subjectId,
      title: formTitle.trim(),
      type: formType,
      due_date: dueDateObj.toISOString(),
      weight:
        formWeight !== "" && formWeight != null ? parseFloat(formWeight) : null,
      grade: null,
      completed: false,
    };

    const { data, error: insertErr } = await supabase
      .from("evaluations")
      .insert([payload])
      .select()
      .single();

    if (insertErr) {
      setError(insertErr.message);
    } else {
      setEvaluations((prev) => {
        const updated = [...prev, data];
        updated.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
        return updated;
      });
      closeModal();
    }
    setSaving(false);
  };

  // ── Modal helpers ─────────────────────────────────────────────────
  const closeModal = () => {
    setShowModal(false);
    setFormTitle("");
    setFormType("prueba");
    setFormDueDate(getDefaultDatetime());
    setFormWeight("");
    setError(null);
  };

  // ── Separate pending & completed ──────────────────────────────────
  const pendingEvals = evaluations.filter((e) => !e.completed);
  const completedEvals = evaluations.filter((e) => e.completed);

  // ── Loading ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-ios-blue animate-spin" />
        <p className="text-sm text-ios-gray mt-3">Cargando ramo...</p>
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-ios-gray">
        <BookOpen size={40} strokeWidth={1.5} />
        <p className="text-sm mt-3">Ramo no encontrado</p>
        <button
          onClick={onBack}
          className="mt-4 text-ios-blue text-sm font-medium"
        >
          Volver a Ramos
        </button>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Back button + Subject header */}
      <div className="flex items-center gap-3 -mx-1">
        <button
          onClick={onBack}
          className="p-2 rounded-xl text-ios-blue active:scale-90 active:bg-ios-blue/10 transition-all"
          aria-label="Volver"
        >
          <ArrowLeft size={22} strokeWidth={2.2} />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${subjectColor}18` }}
          >
            <BookOpen
              size={22}
              strokeWidth={1.8}
              style={{ color: subjectColor }}
            />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900 truncate">
              {subject.name}
            </h2>
            <p className="text-xs text-ios-gray">
              {stats.total} {stats.total === 1 ? "evaluación" : "evaluaciones"}
            </p>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-ios-card rounded-2xl p-3.5 shadow-sm border border-ios-separator text-center">
          <p className="text-xl font-bold" style={{ color: subjectColor }}>
            {stats.pending}
          </p>
          <p className="text-[11px] text-ios-gray font-medium mt-0.5">
            Pendientes
          </p>
        </div>
        <div className="bg-ios-card rounded-2xl p-3.5 shadow-sm border border-ios-separator text-center">
          <p className="text-xl font-bold text-ios-green">{stats.completed}</p>
          <p className="text-[11px] text-ios-gray font-medium mt-0.5">
            Completadas
          </p>
        </div>
        <div className="bg-ios-card rounded-2xl p-3.5 shadow-sm border border-ios-separator text-center">
          <p
            className={`text-xl font-bold ${
              stats.avgGrade !== null
                ? parseFloat(stats.avgGrade) >= 4.0
                  ? "text-ios-green"
                  : "text-ios-red"
                : "text-gray-900"
            }`}
          >
            {stats.avgGrade ?? "—"}
          </p>
          <p className="text-[11px] text-ios-gray font-medium mt-0.5">
            Promedio
          </p>
        </div>
      </div>

      {/* Weighted average card (only if there are weighted grades) */}
      {stats.weightedAvg !== null && (
        <div className="bg-ios-card rounded-2xl p-4 shadow-sm border border-ios-separator flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              Promedio Ponderado
            </p>
            <p className="text-[11px] text-ios-gray mt-0.5">
              Basado en {stats.gradeCount}{" "}
              {stats.gradeCount === 1 ? "nota" : "notas"} con ponderación
            </p>
          </div>
          <p
            className={`text-2xl font-bold ${
              parseFloat(stats.weightedAvg) >= 4.0
                ? "text-ios-green"
                : "text-ios-red"
            }`}
          >
            {stats.weightedAvg}
          </p>
        </div>
      )}

      {/* ── Pending evaluations ──────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-ios-gray uppercase tracking-wide mb-3">
          Pendientes ({pendingEvals.length})
        </h3>

        {pendingEvals.length === 0 && completedEvals.length === 0 && (
          <div className="bg-ios-card rounded-2xl p-5 shadow-sm border border-ios-separator">
            <div className="flex flex-col items-center justify-center py-8 text-ios-gray-2">
              <ClipboardList size={40} strokeWidth={1.5} />
              <p className="text-sm mt-3 text-ios-gray">Sin evaluaciones aún</p>
              <p className="text-xs mt-1 text-ios-gray-2">
                Toca el botón{" "}
                <span className="inline-flex items-center justify-center w-5 h-5 bg-ios-blue rounded-full text-white text-xs font-bold align-middle">
                  +
                </span>{" "}
                para crear una
              </p>
            </div>
          </div>
        )}

        {pendingEvals.length === 0 && completedEvals.length > 0 && (
          <div className="bg-ios-green/5 rounded-2xl p-4 border border-ios-green/15 flex items-center gap-3">
            <CheckCircle2
              size={24}
              className="text-ios-green shrink-0"
              strokeWidth={2}
            />
            <p className="text-sm text-ios-green font-medium">
              ¡Todo al día en este ramo!
            </p>
          </div>
        )}

        <div className="space-y-3">
          {pendingEvals.map((evalItem) => (
            <EvalCard
              key={evalItem.id}
              evalItem={evalItem}
              subjectColor={subjectColor}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onUpdateGrade={handleUpdateGrade}
              togglingId={togglingId}
              deletingId={deletingId}
            />
          ))}
        </div>
      </div>

      {/* ── Completed evaluations ────────────────────────────────── */}
      {completedEvals.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-ios-gray uppercase tracking-wide mb-3">
            Completadas ({completedEvals.length})
          </h3>
          <div className="space-y-3">
            {completedEvals.map((evalItem) => (
              <EvalCard
                key={evalItem.id}
                evalItem={evalItem}
                subjectColor={subjectColor}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onUpdateGrade={handleUpdateGrade}
                togglingId={togglingId}
                deletingId={deletingId}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── FAB — New evaluation ─────────────────────────────────── */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-24 right-5 z-30 w-14 h-14 active:scale-90 rounded-full shadow-lg flex items-center justify-center transition-all duration-150"
        style={{
          backgroundColor: subjectColor,
          boxShadow: `0 8px 24px ${subjectColor}40`,
        }}
        aria-label="Nueva evaluación"
      >
        <Plus size={28} className="text-white" strokeWidth={2.5} />
      </button>

      {/* ── Create evaluation modal ──────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeModal}
          />

          {/* Sheet */}
          <div className="relative w-full sm:max-w-md bg-ios-card rounded-t-3xl sm:rounded-2xl p-6 pb-8 sm:pb-6 shadow-xl animate-slide-up max-h-[90dvh] overflow-y-auto">
            {/* Handle bar (mobile) */}
            <div className="flex justify-center mb-4 sm:hidden">
              <div className="w-10 h-1 bg-ios-gray-4 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Nueva Evaluación
                </h2>
                <p className="text-xs text-ios-gray mt-0.5">{subject.name}</p>
              </div>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-full bg-ios-gray-5 text-ios-gray hover:bg-ios-gray-4 transition-colors active:scale-90"
                aria-label="Cerrar"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-ios-gray mb-1.5">
                  Título
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ej: Prueba 1 — Derivadas"
                  required
                  autoFocus
                  className="w-full px-4 py-3 bg-ios-gray-6 text-gray-900 placeholder-ios-gray-2 rounded-xl outline-none text-[16px] border border-transparent focus:border-ios-blue focus:ring-1 focus:ring-ios-blue/30 transition-all"
                />
              </div>

              {/* Type selector — segmented control iOS style */}
              <div>
                <label className="block text-sm font-medium text-ios-gray mb-1.5">
                  Tipo
                </label>
                <div className="flex flex-wrap gap-2">
                  {EVAL_TYPES.map(({ value, label, icon: Icon }) => {
                    const isSelected = formType === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setFormType(value)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 active:scale-95 border ${
                          isSelected
                            ? "text-white border-transparent shadow-sm"
                            : "bg-ios-gray-6 text-ios-gray border-transparent hover:bg-ios-gray-5"
                        }`}
                        style={
                          isSelected
                            ? { backgroundColor: subjectColor }
                            : undefined
                        }
                      >
                        <Icon size={15} strokeWidth={2} />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date & time */}
              <div>
                <label className="block text-sm font-medium text-ios-gray mb-1.5">
                  Fecha y hora de entrega
                </label>
                <input
                  type="datetime-local"
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-ios-gray-6 text-gray-900 rounded-xl outline-none text-[16px] border border-transparent focus:border-ios-blue focus:ring-1 focus:ring-ios-blue/30 transition-all appearance-none"
                />
              </div>

              {/* Weight (optional) */}
              <div>
                <label className="block text-sm font-medium text-ios-gray mb-1.5">
                  Ponderación{" "}
                  <span className="text-ios-gray-2 font-normal">
                    (opcional, %)
                  </span>
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={formWeight}
                  onChange={(e) => setFormWeight(e.target.value)}
                  placeholder="Ej: 30"
                  min="0"
                  max="100"
                  step="any"
                  className="w-full px-4 py-3 bg-ios-gray-6 text-gray-900 placeholder-ios-gray-2 rounded-xl outline-none text-[16px] border border-transparent focus:border-ios-blue focus:ring-1 focus:ring-ios-blue/30 transition-all"
                />
              </div>

              {/* Error */}
              {error && (
                <p className="text-ios-red text-sm text-center font-medium bg-ios-red/10 py-2 rounded-xl">
                  {error}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={saving || !formTitle.trim()}
                className="w-full py-3.5 hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 text-white font-semibold rounded-xl transition-all duration-150 flex items-center justify-center gap-2 shadow-sm"
                style={{ backgroundColor: subjectColor }}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <span>Crear Evaluación</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Animation keyframes */}
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.3s cubic-bezier(0.32, 0.72, 0, 1) forwards;
        }
      `}</style>
    </div>
  );
}

// ── Evaluation card sub-component ─────────────────────────────────
function EvalCard({
  evalItem,
  subjectColor,
  onToggle,
  onDelete,
  onUpdateGrade,
  togglingId,
  deletingId,
}) {
  const [editingGrade, setEditingGrade] = useState(false);
  const [gradeInput, setGradeInput] = useState(
    evalItem.grade != null ? String(evalItem.grade) : "",
  );
  const [savingGrade, setSavingGrade] = useState(false);
  const [gradeError, setGradeError] = useState(null);

  const EvalIcon = getEvalIcon(evalItem.type);
  const isCompleted = evalItem.completed;
  const isToggling = togglingId === evalItem.id;
  const isDeleting = deletingId === evalItem.id;

  const handleGradeSave = async () => {
    setGradeError(null);

    // Client-side validation before saving
    if (gradeInput !== "" && gradeInput != null) {
      const val = parseFloat(gradeInput);
      if (isNaN(val) || val < 1 || val > 7) {
        setGradeError("Nota entre 1.0 y 7.0");
        return;
      }
    }

    setSavingGrade(true);
    const result = await onUpdateGrade(
      evalItem,
      gradeInput === "" ? null : gradeInput,
    );
    setSavingGrade(false);

    if (result && !result.valid) {
      setGradeError(result.message);
      return;
    }

    setEditingGrade(false);
    setGradeError(null);
  };

  const handleGradeKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleGradeSave();
    }
    if (e.key === "Escape") {
      setGradeInput(evalItem.grade != null ? String(evalItem.grade) : "");
      setGradeError(null);
      setEditingGrade(false);
    }
  };

  const gradeColor =
    evalItem.grade != null
      ? evalItem.grade >= 4.0
        ? "text-ios-green"
        : "text-ios-red"
      : "text-ios-gray-2";

  return (
    <div
      className={`bg-ios-card rounded-2xl shadow-sm border border-ios-separator overflow-hidden transition-opacity duration-200 ${
        isCompleted ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-stretch">
        {/* Color accent */}
        <div
          className="w-1.5 shrink-0"
          style={{
            backgroundColor: isCompleted ? "#8E8E93" : subjectColor,
          }}
        />

        <div className="flex-1 p-4 min-w-0">
          {/* Row 1: checkbox + title + badge */}
          <div className="flex items-start gap-3">
            {/* Toggle checkbox */}
            <button
              onClick={() => onToggle(evalItem)}
              disabled={isToggling}
              className="mt-0.5 shrink-0 active:scale-90 transition-transform"
              aria-label={
                isCompleted ? "Marcar como pendiente" : "Marcar como completada"
              }
            >
              {isToggling ? (
                <Loader2 size={22} className="animate-spin text-ios-gray-2" />
              ) : isCompleted ? (
                <CheckCircle2
                  size={22}
                  strokeWidth={2}
                  className="text-ios-green"
                />
              ) : (
                <Circle
                  size={22}
                  strokeWidth={1.8}
                  className="text-ios-gray-3"
                />
              )}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h4
                  className={`text-[15px] font-semibold truncate ${
                    isCompleted ? "line-through text-ios-gray" : "text-gray-900"
                  }`}
                >
                  {evalItem.title}
                </h4>
                {evalItem.due_date && !isCompleted && (
                  <DueBadge dueDate={evalItem.due_date} />
                )}
              </div>

              {/* Meta row */}
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                {/* Type pill */}
                <span
                  className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md capitalize"
                  style={{
                    backgroundColor: `${subjectColor}12`,
                    color: subjectColor,
                  }}
                >
                  <EvalIcon size={12} strokeWidth={2} />
                  {evalItem.type || "Sin tipo"}
                </span>

                {/* Due date */}
                {evalItem.due_date && (
                  <span className="inline-flex items-center gap-1 text-xs text-ios-gray">
                    <CalendarDays size={12} strokeWidth={2} />
                    {formatDueDate(evalItem.due_date)}
                  </span>
                )}

                {/* Weight */}
                {evalItem.weight != null && evalItem.weight > 0 && (
                  <span className="text-xs text-ios-gray-2 bg-ios-gray-6 px-1.5 py-0.5 rounded">
                    {evalItem.weight}%
                  </span>
                )}
              </div>

              {/* Time left */}
              {evalItem.due_date && !isCompleted && (
                <p className="text-[11px] text-ios-gray-2 mt-1.5">
                  {formatTimeLeft(evalItem.due_date)}
                </p>
              )}

              {/* ── Grade section ─────────────────────────────────── */}
              <div className="mt-2.5 pt-2.5 border-t border-ios-separator">
                {editingGrade ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-ios-gray shrink-0">
                        Nota:
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={gradeInput}
                        onChange={(e) => {
                          setGradeInput(e.target.value);
                          setGradeError(null);
                        }}
                        onBlur={handleGradeSave}
                        onKeyDown={handleGradeKeyDown}
                        autoFocus
                        min="1.0"
                        max="7.0"
                        step="0.1"
                        placeholder="1.0 – 7.0"
                        className={`w-24 px-3 py-1.5 bg-ios-gray-6 text-gray-900 placeholder-ios-gray-3 rounded-lg outline-none text-[16px] font-semibold border focus:ring-1 transition-all text-center ${
                          gradeError
                            ? "border-ios-red focus:ring-ios-red/30"
                            : "border-ios-blue focus:ring-ios-blue/30"
                        }`}
                      />
                      {savingGrade && (
                        <Loader2
                          size={14}
                          className="animate-spin text-ios-gray-2"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setGradeInput(
                            evalItem.grade != null
                              ? String(evalItem.grade)
                              : "",
                          );
                          setGradeError(null);
                          setEditingGrade(false);
                        }}
                        className="text-xs text-ios-gray active:scale-90"
                      >
                        Cancelar
                      </button>
                    </div>
                    {gradeError && (
                      <p className="text-[11px] text-ios-red font-medium ml-0.5">
                        ⚠️ {gradeError}
                      </p>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingGrade(true)}
                    className="flex items-center gap-2 group active:scale-[0.97] transition-transform w-full"
                  >
                    {evalItem.grade != null ? (
                      <>
                        <span className="text-xs font-medium text-ios-gray">
                          Nota:
                        </span>
                        <span className={`text-lg font-bold ${gradeColor}`}>
                          {evalItem.grade}
                        </span>
                        <PenLine
                          size={12}
                          className="text-ios-gray-3 group-hover:text-ios-blue transition-colors ml-1"
                          strokeWidth={2}
                        />
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ios-blue bg-ios-blue/8 px-3 py-1.5 rounded-lg hover:bg-ios-blue/15 transition-colors">
                        <PenLine size={13} strokeWidth={2} />
                        Agregar nota
                      </span>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Delete */}
            <button
              onClick={() => {
                if (window.confirm(`¿Eliminar "${evalItem.title}"?`)) {
                  onDelete(evalItem);
                }
              }}
              disabled={isDeleting}
              className="p-1.5 text-ios-gray-3 hover:text-ios-red active:scale-90 transition-all shrink-0"
              aria-label={`Eliminar ${evalItem.title}`}
            >
              {isDeleting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Trash2 size={16} strokeWidth={1.8} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
