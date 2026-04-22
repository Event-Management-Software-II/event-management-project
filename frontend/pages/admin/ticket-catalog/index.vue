<template>
  <div>
    <div class="section-header">
      <h1 class="section-title">Tipos de ticket</h1>
      <AppButtonAdmin variant="primary" @click="openModal('create')">
        <template #icon>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 5v14M5 12h14"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
            />
          </svg>
        </template>
        Nuevo tipo
      </AppButtonAdmin>
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
          placeholder="Buscar tipo…"
          class="search-input"
        />
      </div>
      <AppButtonAdmin variant="secondary" size="sm" @click="sortAsc = !sortAsc">
        <template #icon>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path
              d="M3 6h18M7 12h10M11 18h2"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </template>
        A–Z {{ sortAsc ? '↑' : '↓' }}
      </AppButtonAdmin>
    </div>

    <div class="card">
      <div class="table-scroll">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td
                colspan="3"
                style="
                  text-align: center;
                  padding: 32px;
                  color: var(--text-muted);
                "
              >
                Cargando…
              </td>
            </tr>
            <tr v-else-if="filteredCatalog.length === 0">
              <td colspan="3">
                <div class="empty-state">
                  <div class="empty-state-icon">🎫</div>
                  <div class="empty-state-text">No hay tipos de ticket.</div>
                </div>
              </td>
            </tr>
            <tr
              v-for="item in filteredCatalog"
              :key="item.id_catalog"
              :class="{ 'row-inactive': item.deleted_at }"
            >
              <td>
                <div class="cat-name-cell">
                  <div
                    class="cat-bar"
                    :class="{ 'cat-bar--inactive': item.deleted_at }"
                  ></div>
                  <span class="cat-name">{{ item.typeName }}</span>
                </div>
              </td>
              <td>
                <span
                  :class="[
                    'badge',
                    item.deleted_at ? 'badge--hidden' : 'badge--visible',
                  ]"
                >
                  {{ item.deleted_at ? 'Inactivo' : 'Activo' }}
                </span>
              </td>
              <td>
                <div class="actions">
                  <AppButtonAdmin
                    variant="ghost"
                    size="sm"
                    icon-only
                    @click="openModal('edit', item)"
                    title="Editar"
                  >
                    <template #icon>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
                          stroke="currentColor"
                          stroke-width="1.8"
                          stroke-linecap="round"
                        />
                        <path
                          d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                          stroke="currentColor"
                          stroke-width="1.8"
                          stroke-linecap="round"
                        />
                      </svg>
                    </template>
                  </AppButtonAdmin>
                  <AppButtonAdmin
                    v-if="!item.deleted_at"
                    variant="danger"
                    size="sm"
                    icon-only
                    @click="tryDeactivate(item)"
                    title="Inactivar"
                  >
                    <template #icon>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          cx="12"
                          cy="12"
                          r="9"
                          stroke="currentColor"
                          stroke-width="1.8"
                        />
                        <path
                          d="M9 9l6 6M15 9l-6 6"
                          stroke="currentColor"
                          stroke-width="1.8"
                          stroke-linecap="round"
                        />
                      </svg>
                    </template>
                  </AppButtonAdmin>
                  <AppButtonAdmin
                    v-else
                    variant="secondary"
                    size="sm"
                    icon-only
                    @click="handleReactivate(item.id_catalog)"
                    title="Restaurar"
                  >
                    <template #icon>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M1 4v6h6"
                          stroke="currentColor"
                          stroke-width="1.8"
                          stroke-linecap="round"
                        />
                        <path
                          d="M3.51 15a9 9 0 1 0 .49-4.95L1 10"
                          stroke="currentColor"
                          stroke-width="1.8"
                          stroke-linecap="round"
                        />
                      </svg>
                    </template>
                  </AppButtonAdmin>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MODAL CREATE / EDIT -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="modalOpen" class="modal-overlay" @click.self="closeModal">
          <div class="modal-box" style="max-width: 440px">
            <div class="modal-header">
              <h2 class="modal-title">
                {{
                  mode === 'create'
                    ? 'Nuevo tipo de ticket'
                    : 'Editar tipo de ticket'
                }}
              </h2>
              <button class="modal-close" @click="closeModal">✕</button>
            </div>
            <div class="modal-body">
              <AppInputAdmin
                v-model="formName"
                label="Nombre"
                placeholder="Ej: VIP, General, Estudiante…"
                :error="formError"
                required
                helper="Debe ser único. Se usará en el builder de tickets al crear eventos."
              />
            </div>
            <div class="modal-footer">
              <AppButtonAdmin variant="secondary" @click="closeModal"
                >Cancelar</AppButtonAdmin
              >
              <AppButtonAdmin variant="primary" :loading="saving" @click="save">
                {{ mode === 'create' ? 'Guardar' : 'Actualizar' }}
              </AppButtonAdmin>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- MODAL ERROR DEACTIVATE -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="deactivateErrorOpen"
          class="modal-overlay"
          @click.self="deactivateErrorOpen = false"
        >
          <div class="modal-box" style="max-width: 440px">
            <div class="modal-header">
              <h2 class="modal-title" style="color: var(--danger)">
                No es posible inactivar
              </h2>
              <button class="modal-close" @click="deactivateErrorOpen = false">
                ✕
              </button>
            </div>
            <div class="modal-body">
              <p class="error-message">{{ deactivateErrorMsg }}</p>
            </div>
            <div class="modal-footer">
              <AppButtonAdmin
                variant="secondary"
                @click="deactivateErrorOpen = false"
                >Entendido</AppButtonAdmin
              >
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { TicketCatalog } from '~/composables/useTicketCatalog';
import AppButtonAdmin from '~/components/admin/AppButtonAdmin.vue';
import AppInputAdmin from '~/components/admin/AppInputAdmin.vue';

definePageMeta({ layout: 'admin' });

const {
  catalog,
  loading,
  fetchCatalogAdmin,
  createCatalogItem,
  updateCatalogItem,
  deactivateCatalogItem,
  reactivateCatalogItem,
} = useTicketCatalog();

onMounted(() => fetchCatalogAdmin());

// ── Filtros ──
const searchQuery = ref('');
const sortAsc = ref(true);

const filteredCatalog = computed(() => {
  const list = sortAsc.value
    ? [...catalog.value].sort((a, b) =>
        a.typeName.localeCompare(b.typeName, 'es')
      )
    : [...catalog.value].sort((a, b) =>
        b.typeName.localeCompare(a.typeName, 'es')
      );
  if (!searchQuery.value) return list;
  return list.filter((i) =>
    i.typeName.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

// ── Modal ──
const modalOpen = ref(false);
const mode = ref<'create' | 'edit'>('create');
const editing = ref<TicketCatalog | null>(null);
const formName = ref('');
const formError = ref('');
const saving = ref(false);

function openModal(m: 'create' | 'edit', item?: TicketCatalog) {
  mode.value = m;
  formError.value = '';
  formName.value = m === 'edit' && item ? item.typeName : '';
  editing.value = item ?? null;
  modalOpen.value = true;
}
function closeModal() {
  modalOpen.value = false;
  formError.value = '';
}

async function save() {
  saving.value = true;
  const result =
    mode.value === 'create'
      ? await createCatalogItem(formName.value)
      : await updateCatalogItem(editing.value!.id_catalog, formName.value);
  if (result.success) closeModal();
  else
    formError.value =
      result.errors?.typeName ?? result.message ?? 'Error desconocido.';
  saving.value = false;
}

// ── Deactivate / Reactivate ──
const deactivateErrorOpen = ref(false);
const deactivateErrorMsg = ref('');

async function tryDeactivate(item: TicketCatalog) {
  const result = await deactivateCatalogItem(item.id_catalog);
  if (!result.success) {
    deactivateErrorMsg.value =
      result.message ?? 'No es posible inactivar este tipo.';
    deactivateErrorOpen.value = true;
  }
}

async function handleReactivate(id: number) {
  await reactivateCatalogItem(id);
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
.table-scroll {
  overflow-x: auto;
}
.cat-name-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}
.cat-bar {
  width: 3px;
  height: 22px;
  background: var(--primary-light);
  border-radius: 2px;
  flex-shrink: 0;
}
.cat-bar--inactive {
  background: var(--border-strong);
}
.cat-name {
  font-weight: 600;
  font-size: 0.9rem;
}
.td-secondary {
  font-size: 0.85rem;
  color: var(--text-secondary);
}
.actions {
  display: flex;
  gap: 5px;
  justify-content: center;
}
.row-inactive td {
  opacity: 0.5;
}
.badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}
.badge--visible {
  background: var(--primary-pale);
  color: var(--primary);
}
.badge--hidden {
  background: var(--bg-elevated);
  color: var(--text-muted);
}
.error-message {
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.5;
}
.modal-enter-active,
.modal-leave-active {
  transition: opacity 180ms ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
