import NextAuth, { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import axios from 'axios'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          // Визначаємо API URL (server-side, тому використовуємо тільки env)
          const apiUrl = process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.includes('pro-part.online')
            ? process.env.NEXT_PUBLIC_API_URL
            : process.env.NEXT_PUBLIC_API_URL || 'https://admin.foryou-realestate.com/api'
          
          const { data } = await axios.post(
            `${apiUrl}/auth/login`,
            {
              email: credentials?.email,
              password: credentials?.password,
            }
          )
          if (data.success && data.data.token) {
            return { id: credentials?.email || '', email: credentials?.email, token: data.data.token }
          }
          return null
        } catch {
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.token = (user as any).token
      }
      return token
    },
    async session({ session, token }) {
      session.token = token.token as string
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
}

export default NextAuth(authOptions)

