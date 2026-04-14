// composables/useUsers.ts
import { readonly } from 'vue'

export interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'external'
  created_at: string
}

export function useUsers() {

  const config = useRuntimeConfig()
  const API = `${config.public.apiUrl}/api`

  const { authHeaders } = useAuth()

  const users = useState<User[]>('users', () => [])
  const loading = useState<boolean>('users_loading', () => false)
  const error = useState<string | null>('users_error', () => null)

  async function fetchUsers() {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`${API}/admin/users`, {
        headers: { ...authHeaders() },
      })
      if (!res.ok) throw new Error('Error al cargar usuarios')
      users.value = await res.json()
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  return {
    users: readonly(users),
    loading: readonly(loading),
    error: readonly(error),
    fetchUsers,
  }
}