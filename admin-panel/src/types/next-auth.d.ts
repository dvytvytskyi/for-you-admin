import 'next-auth'

declare module 'next-auth' {
  interface Session {
    token: string
  }

  interface User {
    token: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    token: string
  }
}

