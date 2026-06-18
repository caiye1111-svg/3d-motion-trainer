import { NextResponse } from 'next/server';

export async function updateSession(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Skip auth if Supabase is not configured
  if (!supabaseUrl || !supabaseKey || supabaseUrl === 'your-supabase-url') {
    return NextResponse.next({ request });
  }

  // Dynamic import to avoid bundling when Supabase is disabled
  const { createServerClient } = await import('@supabase/ssr');

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        const cookieHeader = request.headers.get('cookie') || '';
        return cookieHeader.split(';').filter(Boolean).map(c => {
          const [name, ...rest] = c.trim().split('=');
          return { name, value: rest.join('=') };
        });
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  const url = new URL(request.url);
  const protectedPaths = ['/training', '/dashboard', '/onboarding'];
  const isProtected = protectedPaths.some(path => url.pathname.startsWith(path));

  if (isProtected && !user) {
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
