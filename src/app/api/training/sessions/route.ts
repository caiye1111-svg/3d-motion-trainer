import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const {
      level_id,
      mode = 'daily',
      planned_duration_seconds,
      actual_duration_seconds,
      completed,
      pre_score,
      peak_score,
      post_score,
      recovery_minutes,
      comfort_mode_used = false,
      stopped_reason,
      severe_symptoms,
      system_recommendation,
      user_note,
      checkpoints, // Array of { timestamp_seconds, score, symptom_tags }
    } = body;

    // Insert session
    const { data: session, error: sessionError } = await supabase
      .from('training_sessions')
      .insert({
        user_id: user.id,
        level_id,
        mode,
        planned_duration_seconds,
        actual_duration_seconds,
        completed,
        pre_score,
        peak_score,
        post_score,
        recovery_minutes,
        comfort_mode_used,
        stopped_reason,
        severe_symptoms: severe_symptoms || [],
        system_recommendation,
        user_note,
        ended_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Session insert error:', sessionError);
      return NextResponse.json({ error: '保存训练记录失败' }, { status: 500 });
    }

    // Insert checkpoints
    if (checkpoints && checkpoints.length > 0 && session) {
      const checkpointRows = checkpoints.map((cp: {
        timestamp_seconds: number;
        score: number;
        symptom_tags: string[];
      }) => ({
        session_id: session.id,
        timestamp_seconds: cp.timestamp_seconds,
        score: cp.score,
        symptom_tags: cp.symptom_tags || [],
      }));

      await supabase.from('symptom_checkpoints').insert(checkpointRows);
    }

    // Update user_level_progress
    if (level_id !== undefined && session) {
      const { data: existing } = await supabase
        .from('user_level_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('level_id', level_id)
        .single();

      if (existing) {
        const isStable = completed && (peak_score || 0) <= 3 && (recovery_minutes || 0) <= 5;
        await supabase
          .from('user_level_progress')
          .update({
            completed_count: existing.completed_count + 1,
            stable_success_count: existing.stable_success_count + (isStable ? 1 : 0),
            last_peak_score: peak_score,
            last_recovery_minutes: recovery_minutes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('user_level_progress')
          .insert({
            user_id: user.id,
            level_id,
            completed_count: 1,
            last_peak_score: peak_score,
            last_recovery_minutes: recovery_minutes,
            unlocked: true,
          });
      }

      // Update user's current_level in profiles
      if (completed) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('current_level')
          .eq('id', user.id)
          .single();

        if (profile) {
          const rec = system_recommendation || '';
          let newLevel = profile.current_level;
          if (rec.includes('candidate_upgrade') || rec.includes('upgrade')) {
            newLevel = Math.min(profile.current_level + 1, 12);
          } else if (rec.includes('downgrade')) {
            newLevel = Math.max(profile.current_level - 1, 0);
          }

          if (newLevel !== profile.current_level) {
            await supabase
              .from('profiles')
              .update({ current_level: newLevel, updated_at: new Date().toISOString() })
              .eq('id', user.id);
          }
        }
      }
    }

    return NextResponse.json({ success: true, session }, { status: 201 });
  } catch (error) {
    console.error('POST /api/training/sessions error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const { data: sessions, error, count } = await supabase
      .from('training_sessions')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: '获取训练记录失败' }, { status: 500 });
    }

    return NextResponse.json({ sessions, total: count });
  } catch (error) {
    console.error('GET /api/training/sessions error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
