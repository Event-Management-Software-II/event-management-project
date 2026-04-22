<template>
  <div>
    <div class="section-header">
      <h1 class="section-title">Usuarios</h1>
    </div>

    <div class="filters">
      <div class="search-box">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          class="search-icon"
        >
          <circle
            cx="11"
            cy="11"
            r="7"
            stroke="currentColor"
            stroke-width="2"
          />
          <path
            d="M16.5 16.5L21 21"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
        <input
          v-model="searchQuery"
          placeholder="Buscar por nombre o correo…"
          class="search-input"
        />
      </div>
      <select v-model="roleFilter" class="filter-select">
        <option value="">Todos los roles</option>
        <option value="admin">Administrador</option>
        <option value="external">Usuario externo</option>
      </select>
    </div>

    <div class="card">
      <div class="table-scroll">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Rol</th>
              <th>Fecha de registro</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td
                colspan="4"
                style="
                  text-align: center;
                  padding: 32px;
                  color: var(--text-muted);
                "
              >
                Cargando…
              </td>
            </tr>
            <tr v-else-if="error">
              <td
                colspan="4"
                style="text-align: center; padding: 32px; color: var(--danger)"
              >
                {{ error }}
              </td>
            </tr>
            <tr v-else-if="filteredUsers.length === 0">
              <td colspan="4">
                <div class="empty-state">
                  <div class="empty-state-icon">👤</div>
                  <div class="empty-state-text">
                    No se encontraron usuarios.
                  </div>
                </div>
              </td>
            </tr>
            <tr v-for="u in filteredUsers" :key="u.id">
              <td>
                <div class="user-name-cell">
                  <div class="user-avatar">{{ initials(u.name) }}</div>
                  <span class="user-name">{{ u.name }}</span>
                </div>
              </td>
              <td class="td-secondary">{{ u.email }}</td>
              <td>
                <span
                  :class="[
                    'role-badge',
                    u.role === 'admin'
                      ? 'role-badge--admin'
                      : 'role-badge--external',
                  ]"
                >
                  {{ u.role === 'admin' ? 'Administrador' : 'Usuario externo' }}
                </span>
              </td>
              <td class="td-secondary">{{ formatDate(u.created_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="!loading && filteredUsers.length > 0" class="table-footer">
        {{ filteredUsers.length }} usuario(s) encontrado(s)
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' });

const { users, loading, error, fetchUsers } = useUsers();

onMounted(() => fetchUsers());

const searchQuery = ref('');
const roleFilter = ref('');

const filteredUsers = computed(() => {
  return users.value.filter((u) => {
    const matchSearch =
      !searchQuery.value ||
      u.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.value.toLowerCase());
    const matchRole = !roleFilter.value || u.role === roleFilter.value;
    return matchSearch && matchRole;
  });
});

function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatDate(date: string): string {
  try {
    return new Date(date).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return date;
  }
}
</script>

<style scoped>
.filters {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  align-items: center;
}
.search-box {
  flex: 1;
  min-width: 200px;
  position: relative;
  display: flex;
  align-items: center;
}
.search-icon {
  position: absolute;
  left: 11px;
  color: var(--text-muted);
  pointer-events: none;
}
.search-input {
  width: 100%;
  background: var(--bg-surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 0.875rem;
  padding: 9px 13px 9px 34px;
  outline: none;
  transition:
    border-color var(--transition),
    box-shadow var(--transition);
}
.search-input::placeholder {
  color: var(--text-muted);
}
.search-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(52, 101, 109, 0.1);
}
.filter-select {
  background: var(--bg-surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 0.85rem;
  padding: 9px 13px;
  outline: none;
  cursor: pointer;
}
.table-scroll {
  overflow-x: auto;
}
.user-name-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}
.user-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--primary-pale);
  color: var(--primary);
  font-size: 0.7rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.user-name {
  font-weight: 600;
  font-size: 0.88rem;
  color: var(--text-primary);
}
.td-secondary {
  font-size: 0.84rem;
  color: var(--text-secondary);
}
.role-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}
.role-badge--admin {
  background: var(--primary-pale);
  color: var(--primary);
}
.role-badge--external {
  background: var(--bg-elevated);
  color: var(--text-muted);
  border: 1px solid var(--border);
}
.table-footer {
  padding: 12px 16px;
  font-size: 0.78rem;
  color: var(--text-muted);
  border-top: 1px solid var(--border);
  text-align: right;
}
</style>
