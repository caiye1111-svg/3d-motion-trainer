-- 001_initial_schema.sql
-- 3D Motion Sickness Trainer - Initial Database Schema

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  nickname TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  initial_severity TEXT,
  target_mode TEXT,
  current_level INT DEFAULT 1,
  is_premium BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Onboarding answers
CREATE TABLE IF NOT EXISTS public.onboarding_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  fps_tolerance_minutes INT,
  main_symptom TEXT,
  trigger_type TEXT,
  motion_sickness_history BOOLEAN,
  recovery_minutes INT,
  risk_flags JSONB DEFAULT '[]',
  recommended_start_level INT,
  target_game_mode TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Training levels definition
CREATE TABLE IF NOT EXISTS public.training_levels (
  id INT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  scene_type TEXT NOT NULL,
  default_duration_seconds INT NOT NULL,
  max_duration_seconds INT NOT NULL,
  movement_speed NUMERIC DEFAULT 0,
  turn_speed NUMERIC DEFAULT 0,
  fov NUMERIC DEFAULT 75,
  head_bob_strength NUMERIC DEFAULT 0,
  visual_complexity INT DEFAULT 1,
  vertical_motion BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Training sessions
CREATE TABLE IF NOT EXISTS public.training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  level_id INT REFERENCES public.training_levels(id),
  mode TEXT DEFAULT 'daily',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  planned_duration_seconds INT,
  actual_duration_seconds INT,
  completed BOOLEAN DEFAULT FALSE,
  pre_score INT,
  peak_score INT,
  post_score INT,
  recovery_minutes INT,
  comfort_mode_used BOOLEAN DEFAULT FALSE,
  stopped_reason TEXT,
  severe_symptoms JSONB DEFAULT '[]',
  system_recommendation TEXT,
  user_note TEXT
);

-- Symptom checkpoints (mid-training ratings)
CREATE TABLE IF NOT EXISTS public.symptom_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  timestamp_seconds INT NOT NULL,
  score INT NOT NULL,
  symptom_tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User level progress tracking
CREATE TABLE IF NOT EXISTS public.user_level_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  level_id INT REFERENCES public.training_levels(id),
  completed_count INT DEFAULT 0,
  stable_success_count INT DEFAULT 0,
  last_peak_score INT,
  last_recovery_minutes INT,
  unlocked BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, level_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_training_sessions_user ON public.training_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_symptom_checkpoints_session ON public.symptom_checkpoints(session_id);
CREATE INDEX IF NOT EXISTS idx_user_level_progress_user ON public.user_level_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_current_level ON public.profiles(current_level);

-- RLS Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.symptom_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_level_progress ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/write their own
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Onboarding: users can CRUD own answers
CREATE POLICY "Users can read own answers"
  ON public.onboarding_answers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own answers"
  ON public.onboarding_answers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Training sessions: users can CRUD own
CREATE POLICY "Users can read own sessions"
  ON public.training_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON public.training_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.training_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- Symptom checkpoints: users can read/insert own
CREATE POLICY "Users can read own checkpoints"
  ON public.symptom_checkpoints FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.training_sessions
    WHERE training_sessions.id = symptom_checkpoints.session_id
    AND training_sessions.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own checkpoints"
  ON public.symptom_checkpoints FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.training_sessions
    WHERE training_sessions.id = symptom_checkpoints.session_id
    AND training_sessions.user_id = auth.uid()
  ));

-- Level progress: users can read/update own
CREATE POLICY "Users can read own progress"
  ON public.user_level_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON public.user_level_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON public.user_level_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Seed training levels
INSERT INTO public.training_levels (id, name, description, scene_type, default_duration_seconds, max_duration_seconds, movement_speed, turn_speed, fov, head_bob_strength, visual_complexity, vertical_motion) VALUES
  (0, '安全与屏幕适配', '静态3D房间，确认屏幕适配安全', 'static_room', 60, 120, 0, 0, 70, 0, 1, false),
  (1, '静态3D空间适应', '明亮小房间内慢速转动视角，找到3个物体', 'static_room', 180, 240, 0, 30, 75, 0, 1, false),
  (2, '低速视觉流适应', '注视中央点，适应画面缓慢前进的感觉', 'visual_flow_tunnel', 240, 300, 0.5, 0, 80, 0, 2, false),
  (3, '主动慢速前进', '按W键走完简单走廊，经过检查点时休息', 'slow_walk_corridor', 300, 360, 1.0, 20, 80, 0, 2, false),
  (4, '左右小角度转向', 'T字走廊中按提示完成15°~45°左右转向', 'turn_training', 360, 420, 1.0, 45, 80, 0, 2, false),
  (5, '小迷宫找光球', '低复杂度小迷宫中找到5个发光球体', 'maze_search', 360, 480, 1.4, 75, 85, 0, 3, false)
ON CONFLICT (id) DO NOTHING;

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nickname, current_level)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nickname', split_part(NEW.email, '@', 1)), 1);

  -- Initialize level progress for Lv.0 and Lv.1
  INSERT INTO public.user_level_progress (user_id, level_id, unlocked)
  VALUES (NEW.id, 0, TRUE), (NEW.id, 1, TRUE);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
