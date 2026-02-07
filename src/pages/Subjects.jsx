import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { Plus, X, BookOpen, Loader2, Trash2, ChevronRight } from "lucide-react";

const PRESET_COLORS = [
  "#007AFF", // iOS Blue
  "#FF3B30", // iOS Red
  "#34C759", // iOS Green
  "#FF9500", // iOS Orange
  "#AF52DE", // iOS Purple
  "#FF2D55", // iOS Pink
  "#5856D6", // iOS Indigo
  "#00C7BE", // iOS Teal
  "#FFD60A", // iOS Yellow
  "#8E8E93", // iOS Gray
];

export default function Subjects({ session, onSelectSubject }) {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const userId = session?.user?.id;

  // Fetch subjects from Supabase
  const fetchSubjects = async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("subjects")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching subjects:", error.message);
    } else {
      setSubjects(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSubjects();
  }, [userId]);

  // Add new subject
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setSaving(true);
    setError(null);

    const { data, error } = await supabase
      .from("subjects")
      .insert([
        {
          user_id: userId,
          name: newName.trim(),
          color: newColor,
        },
      ])
      .select()
      .single();

    if (error) {
      setError(error.message);
    } else {
      setSubjects((prev) => [data, ...prev]);
      setNewName("");
      setNewColor(PRESET_COLORS[0]);
      setShowModal(false);
    }
    setSaving(false);
  };

  // Delete a subject
  const handleDelete = async (id) => {
    setDeletingId(id);
    const { error } = await supabase.from("subjects").delete().eq("id", id);

    if (error) {
      console.error("Error deleting subject:", error.message);
    } else {
      setSubjects((prev) => prev.filter((s) => s.id !== id));
    }
    setDeletingId(null);
  };

  // Close modal and reset form
  const closeModal = () => {
    setShowModal(false);
    setNewName("");
    setNewColor(PRESET_COLORS[0]);
    setError(null);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-ios-blue animate-spin" />
        <p className="text-sm text-ios-gray mt-3">Cargando ramos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 relative">
      {/* Header count */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ios-gray uppercase tracking-wide">
          Mis Ramos ({subjects.length})
        </h2>
      </div>

      {/* Empty state */}
      {subjects.length === 0 && (
        <div className="bg-ios-card rounded-2xl p-5 shadow-sm border border-ios-separator">
          <div className="flex flex-col items-center justify-center py-8 text-ios-gray-2">
            <BookOpen size={40} strokeWidth={1.5} />
            <p className="text-sm mt-3 text-ios-gray">
              Aún no has agregado ramos
            </p>
            <p className="text-xs mt-1 text-ios-gray-2">
              Toca el botón{" "}
              <span className="inline-flex items-center justify-center w-5 h-5 bg-ios-blue rounded-full text-white text-xs font-bold align-middle">
                +
              </span>{" "}
              para agregar uno
            </p>
          </div>
        </div>
      )}

      {/* Subject cards */}
      <div className="space-y-3">
        {subjects.map((subject) => (
          <div
            key={subject.id}
            onClick={() => onSelectSubject?.(subject.id)}
            className="bg-ios-card rounded-2xl shadow-sm border border-ios-separator overflow-hidden flex items-stretch active:scale-[0.98] transition-transform duration-100 cursor-pointer"
          >
            {/* Color accent bar */}
            <div
              className="w-1.5 shrink-0"
              style={{ backgroundColor: subject.color || "#007AFF" }}
            />

            {/* Content */}
            <div className="flex-1 flex items-center justify-between px-4 py-4 min-w-0">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: `${subject.color || "#007AFF"}18`,
                  }}
                >
                  <BookOpen
                    size={20}
                    strokeWidth={1.8}
                    style={{ color: subject.color || "#007AFF" }}
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-gray-900 truncate">
                    {subject.name}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-2">
                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (
                      window.confirm(
                        `¿Eliminar "${subject.name}"? También se borrarán sus evaluaciones.`,
                      )
                    ) {
                      handleDelete(subject.id);
                    }
                  }}
                  disabled={deletingId === subject.id}
                  className="p-2 text-ios-gray-2 hover:text-ios-red active:scale-90 transition-all rounded-lg"
                  aria-label={`Eliminar ${subject.name}`}
                >
                  {deletingId === subject.id ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Trash2 size={18} strokeWidth={1.8} />
                  )}
                </button>
                <ChevronRight
                  size={18}
                  className="text-ios-gray-3"
                  strokeWidth={2}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Floating Add Button */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-24 right-5 z-30 w-14 h-14 bg-ios-blue hover:bg-ios-blue-dark active:scale-90 rounded-full shadow-lg shadow-ios-blue/30 flex items-center justify-center transition-all duration-150"
        aria-label="Agregar ramo"
      >
        <Plus size={28} className="text-white" strokeWidth={2.5} />
      </button>

      {/* Add Subject Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeModal}
          />

          {/* Modal content — slide up from bottom on mobile */}
          <div className="relative w-full sm:max-w-sm bg-ios-card rounded-t-3xl sm:rounded-2xl p-6 pb-8 sm:pb-6 shadow-xl animate-slide-up">
            {/* Handle bar (mobile) */}
            <div className="flex justify-center mb-4 sm:hidden">
              <div className="w-10 h-1 bg-ios-gray-4 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">
                Nuevo Ramo
              </h2>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-full bg-ios-gray-5 text-ios-gray hover:bg-ios-gray-4 transition-colors active:scale-90"
                aria-label="Cerrar"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-5">
              {/* Name input */}
              <div>
                <label className="block text-sm font-medium text-ios-gray mb-1.5">
                  Nombre del ramo
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ej: Cálculo I"
                  required
                  autoFocus
                  className="w-full px-4 py-3 bg-ios-gray-6 text-gray-900 placeholder-ios-gray-2 rounded-xl outline-none text-[16px] border border-transparent focus:border-ios-blue focus:ring-1 focus:ring-ios-blue/30 transition-all"
                />
              </div>

              {/* Color picker */}
              <div>
                <label className="block text-sm font-medium text-ios-gray mb-2">
                  Color
                </label>
                <div className="flex flex-wrap gap-3">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewColor(color)}
                      className={`w-9 h-9 rounded-full transition-all duration-150 active:scale-90 ${
                        newColor === color
                          ? "ring-2 ring-offset-2 ring-offset-ios-card scale-110"
                          : "hover:scale-105"
                      }`}
                      style={{
                        backgroundColor: color,
                        ringColor: newColor === color ? color : undefined,
                        "--tw-ring-color":
                          newColor === color ? color : undefined,
                      }}
                      aria-label={`Color ${color}`}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="flex items-center gap-3 bg-ios-gray-6 rounded-xl p-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${newColor}18` }}
                >
                  <BookOpen
                    size={16}
                    strokeWidth={2}
                    style={{ color: newColor }}
                  />
                </div>
                <span className="text-sm text-gray-900 font-medium">
                  {newName.trim() || "Vista previa"}
                </span>
                <div
                  className="w-3 h-3 rounded-full ml-auto"
                  style={{ backgroundColor: newColor }}
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
                disabled={saving || !newName.trim()}
                className="w-full py-3.5 bg-ios-blue hover:bg-ios-blue-dark active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 text-white font-semibold rounded-xl transition-all duration-150 flex items-center justify-center gap-2 shadow-sm"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <span>Agregar Ramo</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Inline animation keyframes */}
      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s cubic-bezier(0.32, 0.72, 0, 1) forwards;
        }
      `}</style>
    </div>
  );
}
