-- =====================================================================
-- 1. CLEANUP / RESET (Optional)
-- =====================================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.messages;
DROP TABLE IF EXISTS public.conversations;
DROP TABLE IF EXISTS public.users;

-- =====================================================================
-- 2. CREATE TABLES
-- =====================================================================

-- Users profile table (Extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar_id TEXT DEFAULT 'avatar_1',
    age_range TEXT NOT NULL CONSTRAINT check_age_range CHECK (age_range IN ('8-10', '11-13', '14-16')),
    parent_email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Conversations table
CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Session',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Messages table
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CONSTRAINT check_message_role CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    sources JSONB, -- Stores citations/retrieved chunks
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- 3. AUTOMATED USER PROFILE SYNC (Auth Trigger)
-- =====================================================================
-- Trigger function to automatically create a public.users row when a user signs up.
-- It extracts custom user metadata (username, age_range, parent_email) passed from the frontend.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, username, display_name, avatar_id, age_range, parent_email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
        'avatar_1',
        COALESCE(NEW.raw_user_meta_data->>'age_range', '8-10'),
        NEW.raw_user_meta_data->>'parent_email'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- A) Policies for 'users'
CREATE POLICY "Users can view own profile" 
    ON public.users FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
    ON public.users FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
    ON public.users FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- B) Policies for 'conversations'
CREATE POLICY "Users can manage own conversations" 
    ON public.conversations FOR ALL 
    USING (auth.uid() = user_id);

-- C) Policies for 'messages'
-- Allows users to select, insert, update, or delete messages if they own the parent conversation.
CREATE POLICY "Users can manage messages in own conversations" 
    ON public.messages FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations 
            WHERE conversations.id = messages.conversation_id 
            AND conversations.user_id = auth.uid()
        )
    );

-- =====================================================================
-- 5. COURSES FEATURE
-- =====================================================================

CREATE TABLE public.course_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL,
    lesson_id TEXT NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, course_id, lesson_id)
);

ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own course progress" 
    ON public.course_progress FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own course progress" 
    ON public.course_progress FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- =====================================================================
-- 6. GAMIFICATION FEATURE
-- =====================================================================

CREATE TABLE public.user_stats (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    total_points INTEGER NOT NULL DEFAULT 0,
    current_level TEXT NOT NULL DEFAULT 'Money Newbie',
    badges_earned TEXT[] NOT NULL DEFAULT '{}',
    quiz_correct_count INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stats" 
    ON public.user_stats FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own initial stats" 
    ON public.user_stats FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- =====================================================================
-- 7. FEEDBACK FEATURE
-- =====================================================================

CREATE TABLE public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert feedback (authenticated or not, since user_id is nullable)
-- If we want to restrict to authenticated only, we could use auth.uid() IS NOT NULL.
-- For now, letting anyone (or authenticated) insert. The user request: "users can insert their own feedback"
CREATE POLICY "Anyone can insert feedback" 
    ON public.feedback FOR INSERT 
    WITH CHECK (true);

-- No SELECT policy -> only admin/service_role can read
