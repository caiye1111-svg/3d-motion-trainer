import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // Get level progress
    const { data: levelProgress } = await supabase
      .from('user_level_progress')
      .select('*')
      .eq('user_id', user.id)
      .order('level_id', { ascending: true });

    // Get recent sessions for stats
    const { data: recentSessions } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(30);

    // Calculate stats
    const totalSessions = recentSessions?.length || 0;
    const completedSessions = recentSessions?.filter(s => s.completed).length || 0;
    const avgPeakScore = recentSessions && recentSessions.length > 0
      ? Math.round(recentSessions.reduce((sum, s) => sum + (s.peak_score || 0), 0) / recentSessions.length)
      : 0;
    const avgRecovery = recentSessions && recentSessions.length > 0
      ? Math.round(recentSessions.reduce((sum, s) => sum + (s.recovery_minutes || 0), 0) / recentSessions.length)
      : 0;

    // Build streak
    let streak = 0;
    if (recentSessions && recentSessions.length > 0) {
      const today = new Date();
      for (let i = 0; i < recentSessions.length; i++) {
        const sessionDate = new Date(recentSessions[i].started_at);
        const expectedDate = new Date(today);
        expectedDate.setDate(expectedDate.getDate() - i);
        if (sessionDate.toDateString() === expectedDate.toDateString()) {
          streak++;
        } else {
          break;
        }
      }
    }

    return NextResponse.json({
      profile,
      levelProgress: levelProgress || [],
      stats: {
        totalSessions,
        completedSessions,
        avgPeakScore,
        avgRecovery,
        streak,
      },
      recentSessions: recentSessions || [],
    });
  } catch (error) {
    console.error('GET /api/user/progress error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
