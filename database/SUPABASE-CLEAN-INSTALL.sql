-- ============================================
-- StreamVault - CLEAN INSTALL (DROP & RECREATE)
-- ============================================
-- ⚠️ USE THIS IF YOU GOT "column does not exist" ERROR
-- This will DELETE existing tables and recreate them properly!

-- ============================================
-- STEP 1: DROP EXISTING TABLES (if any)
-- ============================================

DROP TABLE IF EXISTS public.sync_log CASCADE;
DROP TABLE IF EXISTS public.user_preferences CASCADE;

-- ============================================
-- STEP 2: CREATE USER PREFERENCES TABLE
-- ============================================

CREATE TABLE public.user_preferences (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  theme TEXT DEFAULT 'dark',
  language TEXT DEFAULT 'en',
  autoplay BOOLEAN DEFAULT TRUE,
  subtitle_language TEXT DEFAULT 'en',
  video_quality TEXT DEFAULT 'auto',
  notifications_enabled BOOLEAN DEFAULT TRUE,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes
CREATE INDEX idx_user_preferences_user_id ON public.user_preferences(user_id);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own preferences" 
  ON public.user_preferences FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" 
  ON public.user_preferences FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" 
  ON public.user_preferences FOR UPDATE 
  USING (auth.uid() = user_id);

-- ============================================
-- STEP 3: CREATE SYNC LOG TABLE
-- ============================================

CREATE TABLE public.sync_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  table_name TEXT NOT NULL,
  operation TEXT CHECK (operation IN ('push', 'pull', 'conflict', 'merge')) NOT NULL,
  status TEXT CHECK (status IN ('success', 'error', 'pending')) NOT NULL,
  records_affected INTEGER DEFAULT 0,
  error_message TEXT,
  sync_duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX idx_sync_log_user_id ON public.sync_log(user_id);
CREATE INDEX idx_sync_log_created_at ON public.sync_log(created_at DESC);
CREATE INDEX idx_sync_log_status ON public.sync_log(status);

-- Enable RLS
ALTER TABLE public.sync_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own sync logs" 
  ON public.sync_log FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sync logs" 
  ON public.sync_log FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- STEP 4: AUTO-UPDATE TIMESTAMPS
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to user_preferences
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- ✅ SUCCESS! Tables created properly!
-- ============================================
-- You should see: "Success. No rows returned."
-- 
-- Next steps:
-- 1. Go to Vercel dashboard
-- 2. Add VITE_TMDB_API_KEY = dac627d3f149527fdea2be483069bbdc
-- 3. Redeploy your app
-- 4. Test the homepage!

-- ============================================
-- VERIFICATION: Check if tables exist
-- ============================================
-- Run this query separately to verify:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('user_preferences', 'sync_log');
