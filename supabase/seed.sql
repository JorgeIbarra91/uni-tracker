-- ============================================================
-- Seed data for uni-tracker
-- Run this in Supabase → SQL Editor → New Query → Run
--
-- ⚠️  IMPORTANT: Replace the USER_ID below with your actual
--     authenticated user's UUID from Supabase Auth.
--     You can find it in: Authentication → Users → Copy UID
-- ============================================================

-- 👇 CHANGE THIS to your real user ID
DO $$
DECLARE
  uid UUID := '00000000-0000-0000-0000-000000000000'; -- ← REPLACE ME

  -- Subject IDs
  sid_calc   UUID;
  sid_progra UUID;
  sid_fisica UUID;
  sid_admin  UUID;

BEGIN

-- ────────────────────────────────────────────────────────────
-- 1. Clean up any previous seed data (safe to re-run)
-- ────────────────────────────────────────────────────────────
DELETE FROM evaluations WHERE user_id = uid;
DELETE FROM subjects    WHERE user_id = uid;

-- ────────────────────────────────────────────────────────────
-- 2. Create 4 subjects (ramos)
-- ────────────────────────────────────────────────────────────
INSERT INTO subjects (id, user_id, name, color, created_at)
VALUES
  (gen_random_uuid(), uid, 'Cálculo I',               '#007AFF', NOW() - INTERVAL '10 days'),
  (gen_random_uuid(), uid, 'Programación',             '#AF52DE', NOW() - INTERVAL '9 days'),
  (gen_random_uuid(), uid, 'Física General',           '#FF9500', NOW() - INTERVAL '8 days'),
  (gen_random_uuid(), uid, 'Administración de Empresas','#34C759', NOW() - INTERVAL '7 days');

-- Capture the generated IDs
SELECT id INTO sid_calc   FROM subjects WHERE user_id = uid AND name = 'Cálculo I';
SELECT id INTO sid_progra FROM subjects WHERE user_id = uid AND name = 'Programación';
SELECT id INTO sid_fisica FROM subjects WHERE user_id = uid AND name = 'Física General';
SELECT id INTO sid_admin  FROM subjects WHERE user_id = uid AND name = 'Administración de Empresas';

-- ────────────────────────────────────────────────────────────
-- 3. Create 12 evaluations across the 4 subjects
--    - 6 with grades (completed)
--    - 6 pending (upcoming due dates)
-- ────────────────────────────────────────────────────────────

-- ═══ Cálculo I (3 evaluations) ═══

-- ✅ Completed with grade
INSERT INTO evaluations (user_id, subject_id, title, type, due_date, weight, grade, completed)
VALUES (
  uid, sid_calc, 'Prueba 1 — Límites y Continuidad', 'prueba',
  NOW() - INTERVAL '14 days', 25, 5.8, TRUE
);

-- ✅ Completed with grade
INSERT INTO evaluations (user_id, subject_id, title, type, due_date, weight, grade, completed)
VALUES (
  uid, sid_calc, 'Tarea 1 — Derivadas', 'tarea',
  NOW() - INTERVAL '7 days', 10, 6.2, TRUE
);

-- 🔜 Pending — due in 3 days
INSERT INTO evaluations (user_id, subject_id, title, type, due_date, weight, grade, completed)
VALUES (
  uid, sid_calc, 'Prueba 2 — Integrales', 'prueba',
  NOW() + INTERVAL '3 days' + INTERVAL '14 hours', 25, NULL, FALSE
);

-- ═══ Programación (4 evaluations) ═══

-- ✅ Completed with grade
INSERT INTO evaluations (user_id, subject_id, title, type, due_date, weight, grade, completed)
VALUES (
  uid, sid_progra, 'Tarea 1 — Arrays y Funciones', 'tarea',
  NOW() - INTERVAL '20 days', 10, 6.5, TRUE
);

-- ✅ Completed with grade
INSERT INTO evaluations (user_id, subject_id, title, type, due_date, weight, grade, completed)
VALUES (
  uid, sid_progra, 'Quiz 1 — Condicionales', 'quiz',
  NOW() - INTERVAL '10 days', 5, 7.0, TRUE
);

-- 🔜 Pending — due tomorrow
INSERT INTO evaluations (user_id, subject_id, title, type, due_date, weight, grade, completed)
VALUES (
  uid, sid_progra, 'Tarea 2 — Clases y Objetos', 'tarea',
  NOW() + INTERVAL '1 day' + INTERVAL '10 hours', 10, NULL, FALSE
);

-- 🔜 Pending — due in 12 days
INSERT INTO evaluations (user_id, subject_id, title, type, due_date, weight, grade, completed)
VALUES (
  uid, sid_progra, 'Proyecto — App Web con React', 'proyecto',
  NOW() + INTERVAL '12 days' + INTERVAL '16 hours', 30, NULL, FALSE
);

-- ═══ Física General (3 evaluations) ═══

-- ✅ Completed with grade
INSERT INTO evaluations (user_id, subject_id, title, type, due_date, weight, grade, completed)
VALUES (
  uid, sid_fisica, 'Prueba 1 — Cinemática', 'prueba',
  NOW() - INTERVAL '12 days', 30, 4.5, TRUE
);

-- 🔜 Pending — due in 6 hours (URGENT!)
INSERT INTO evaluations (user_id, subject_id, title, type, due_date, weight, grade, completed)
VALUES (
  uid, sid_fisica, 'Tarea 3 — Dinámica (Newton)', 'tarea',
  NOW() + INTERVAL '6 hours', 10, NULL, FALSE
);

-- 🔜 Pending — due in 21 days
INSERT INTO evaluations (user_id, subject_id, title, type, due_date, weight, grade, completed)
VALUES (
  uid, sid_fisica, 'Exposición — Energía y Trabajo', 'exposicion',
  NOW() + INTERVAL '21 days' + INTERVAL '11 hours', 20, NULL, FALSE
);

-- ═══ Administración de Empresas (2 evaluations) ═══

-- ✅ Completed with grade
INSERT INTO evaluations (user_id, subject_id, title, type, due_date, weight, grade, completed)
VALUES (
  uid, sid_admin, 'Presentación — Análisis FODA', 'presentacion',
  NOW() - INTERVAL '5 days', 15, 6.0, TRUE
);

-- 🔜 Pending — due in 8 days
INSERT INTO evaluations (user_id, subject_id, title, type, due_date, weight, grade, completed)
VALUES (
  uid, sid_admin, 'Trabajo — Plan de Negocios', 'trabajo',
  NOW() + INTERVAL '8 days' + INTERVAL '18 hours', 35, NULL, FALSE
);

-- ────────────────────────────────────────────────────────────
-- Done! Summary:
-- ────────────────────────────────────────────────────────────
RAISE NOTICE '✅ Seed completed!';
RAISE NOTICE '   → 4 subjects created';
RAISE NOTICE '   → 12 evaluations created (6 completed + 6 pending)';
RAISE NOTICE '   → 6 grades assigned (range 4.5 – 7.0)';
RAISE NOTICE '   → 1 urgent evaluation (due in ~6h)';
RAISE NOTICE '   → 1 evaluation due tomorrow';

END $$;
