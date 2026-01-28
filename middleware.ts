import { NextResponse } from 'next/server'
import { auth } from './lib/auth'

export const config = {
  matcher: ['/dashboard/:path*']
}

export default auth((req) => {
  if (!req.auth) {
    // Redirigir a login si no está autenticado
    const url = new URL('/login', req.url)
    return NextResponse.redirect(url)
  }
  
  // Permitir acceso si está autenticado
  return NextResponse.next()
})
