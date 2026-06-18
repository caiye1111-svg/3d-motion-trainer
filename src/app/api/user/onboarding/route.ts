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
      fps_tolerance_minutes,
      main_symptom,
      trigger_type,
      motion_sickness_history,
      recovery_minutes,
      risk_flags,
      recommended_start_level,
      target_game_mode,
    } = body;

    const { error } = await supabase
      .from('onboarding_answers')
      .upsert({
        user_id: user.id,
        fps_tolerance_minutes,
        main_symptom,
        trigger_type,
        motion_sickness_history,
        recovery_minutes,
        risk_flags: risk_flags || [],
        recommended_start_level,
        target_game_mode,
      }, { onConflict: 'user_id' });

    if (error) {
      console.error('Onboarding insert error:', error);
      return NextResponse.json({ error: '保存适配数据失败' }, { status: 500 });
    }

    await supabase
      .from('profiles')
      .update({
        current_level: recommended_start_level,
        initial_severity: risk_flags?.includes('high_risk') ? 'S0'
          : risk_flags?.includes('severe') ? 'S1'
          : risk_flags?.includes('moderate') ? 'S2'
          : 'S3',
        target_mode: target_game_mode,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    const maxUnlock = Math.min(recommended_start_level + 1, 5);
    for (let i = 2; i <= maxUnlock; i++) {
      await supabase
        .from('user_level_progress')
        .upsert({
          user_id: user.id,
          level_id: i,
          unlocked: i <= recommended_start_level,
        }, { onConflict: 'user_id,level_id' });
    }

    return NextResponse.json({ success: true, level: recommended_start_level });
  } catch (error) {
    console.error('POST /api/user/onboarding error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
