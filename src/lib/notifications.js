import { supabase } from "./supabaseClient";
import { differenceInHours, isPast, parseISO, format } from "date-fns";

// ── Constants ───────────────────────────────────────────────────────
const NOTIFICATION_CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutes
const NOTIFIED_KEY = "uni-tracker-notified-evals";

// ── Permission handling ─────────────────────────────────────────────

/**
 * Check if the browser supports notifications
 */
export function supportsNotifications() {
  return "Notification" in window;
}

/**
 * Get current notification permission status
 * @returns {"granted" | "denied" | "default" | "unsupported"}
 */
export function getPermissionStatus() {
  if (!supportsNotifications()) return "unsupported";
  return Notification.permission;
}

/**
 * Request notification permission from the user
 * @returns {Promise<"granted" | "denied" | "default">}
 */
export async function requestPermission() {
  if (!supportsNotifications()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";

  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    return "denied";
  }
}

// ── Track which evaluations we've already notified about ────────────

function getNotifiedIds() {
  try {
    const stored = localStorage.getItem(NOTIFIED_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored);
    // Clean up old entries (older than 48h)
    const now = Date.now();
    const cleaned = {};
    for (const [id, timestamp] of Object.entries(parsed)) {
      if (now - timestamp < 48 * 60 * 60 * 1000) {
        cleaned[id] = timestamp;
      }
    }
    return cleaned;
  } catch {
    return {};
  }
}

function markAsNotified(evalId) {
  const current = getNotifiedIds();
  current[evalId] = Date.now();
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify(current));
}

function wasAlreadyNotified(evalId) {
  const notified = getNotifiedIds();
  return evalId in notified;
}

// ── Send browser notification ───────────────────────────────────────

function sendBrowserNotification(title, body, tag) {
  if (getPermissionStatus() !== "granted") return;

  try {
    const notification = new Notification(title, {
      body,
      icon: "/vite.svg",
      badge: "/vite.svg",
      tag: tag || "uni-tracker",
      renotify: false,
      silent: false,
    });

    // Auto-close after 8 seconds
    setTimeout(() => notification.close(), 8000);

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch {
    // Silently fail — some browsers restrict notification creation
  }
}

// ── Core: check for upcoming evaluations ────────────────────────────

/**
 * Fetch evaluations due within 24 hours and send notifications
 * @param {string} userId - The authenticated user's ID
 * @returns {Promise<Array>} - Array of urgent evaluations (due < 24h)
 */
export async function checkUpcomingEvaluations(userId) {
  if (!userId) return [];

  try {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Fetch non-completed evaluations with due dates
    const { data: evaluations, error } = await supabase
      .from("evaluations")
      .select("id, title, due_date, subject_id, type")
      .eq("user_id", userId)
      .eq("completed", false)
      .not("due_date", "is", null)
      .lte("due_date", in24h.toISOString())
      .gte("due_date", now.toISOString())
      .order("due_date", { ascending: true });

    if (error || !evaluations) return [];

    // Fetch subject names for context
    const subjectIds = [...new Set(evaluations.map((e) => e.subject_id))];
    let subjectMap = {};

    if (subjectIds.length > 0) {
      const { data: subjects } = await supabase
        .from("subjects")
        .select("id, name")
        .in("id", subjectIds);

      if (subjects) {
        subjects.forEach((s) => {
          subjectMap[s.id] = s.name;
        });
      }
    }

    // Send browser notifications for each urgent evaluation
    const urgentEvals = evaluations.map((evalItem) => {
      const due = parseISO(evalItem.due_date);
      const hoursLeft = differenceInHours(due, now);
      const subjectName = subjectMap[evalItem.subject_id] || "Sin ramo";
      const timeStr = format(due, "HH:mm");

      return {
        ...evalItem,
        subjectName,
        hoursLeft,
        timeStr,
      };
    });

    // Send browser notifications only for new ones
    for (const evalItem of urgentEvals) {
      if (!wasAlreadyNotified(evalItem.id)) {
        const hoursText =
          evalItem.hoursLeft <= 1
            ? "¡Menos de 1 hora!"
            : `Quedan ${evalItem.hoursLeft}h`;

        sendBrowserNotification(
          `⚠️ ${evalItem.title}`,
          `${evalItem.subjectName} — Entrega hoy a las ${evalItem.timeStr}. ${hoursText}`,
          `eval-${evalItem.id}`,
        );

        markAsNotified(evalItem.id);
      }
    }

    return urgentEvals;
  } catch (err) {
    console.error("Error checking upcoming evaluations:", err);
    return [];
  }
}

// ── Periodic checker ────────────────────────────────────────────────

let intervalId = null;

/**
 * Start periodic notification checks
 * @param {string} userId
 * @param {function} onUrgentEvals - Callback with urgent evaluations for in-app display
 */
export function startNotificationChecker(userId, onUrgentEvals) {
  if (!userId) return;

  // Stop any existing checker
  stopNotificationChecker();

  // Run immediately
  checkUpcomingEvaluations(userId).then((evals) => {
    if (onUrgentEvals && evals.length > 0) {
      onUrgentEvals(evals);
    }
  });

  // Run periodically
  intervalId = setInterval(async () => {
    const evals = await checkUpcomingEvaluations(userId);
    if (onUrgentEvals && evals.length > 0) {
      onUrgentEvals(evals);
    }
  }, NOTIFICATION_CHECK_INTERVAL);
}

/**
 * Stop the periodic notification checker
 */
export function stopNotificationChecker() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
