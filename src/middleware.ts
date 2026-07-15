import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/forgot-password')
  const isAppRoute = pathname.startsWith('/app')
  const matchesRoute = (route: string) => pathname === route || pathname.startsWith(`${route}/`)
  // Rotas exclusivas do plano Profissional (freelancer).
  const isFreelancerRoute = matchesRoute('/app/projetos') || matchesRoute('/app/clientes')

  function redirectTo(path: string) {
    const url = request.nextUrl.clone()
    url.pathname = path
    const redirectResponse = NextResponse.redirect(url)

    // Preserva uma eventual renovação de sessão feita por getUser().
    supabaseResponse.cookies.getAll().forEach(({ name, value, ...options }) => {
      redirectResponse.cookies.set(name, value, options)
    })

    return redirectResponse
  }

  if (!user && isAppRoute) {
    return redirectTo('/login')
  }

  if (user && isAuthRoute) {
    return redirectTo('/app')
  }

  // Gate das áreas Projetos/Clientes: só consulta o perfil nessas rotas.
  if (user && isFreelancerRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('account_type')
      .eq('id', user.id)
      .single()

    if (profile?.account_type !== 'freelancer') {
      return redirectTo('/app')
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|offline\\.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
