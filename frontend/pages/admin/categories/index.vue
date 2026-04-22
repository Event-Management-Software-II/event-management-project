<template>
  <div>
    <div class="section-header">
      <h1 class="section-title">Categorías</h1>
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
        Nueva categoría
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
          placeholder="Buscar categoría…"
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
              <th>Eventos activos</th>
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
            <tr v-else-if="filteredCategories.length === 0">
              <td colspan="3">
                <div class="empty-state">
                  <div class="empty-state-icon">🏷️</div>
                  <div class="empty-state-text">No hay categorías activas.</div>
                </div>
              </td>
            </tr>
            <tr v-for="cat in filteredCategories" :key="cat.id_category">
              <td>
                <div class="cat-name-cell">
                  <div class="cat-bar"></div>
                  <span class="cat-name">{{ cat.categoryName }}</span>
                  <!-- CORREGIDO: categoryName -->
                </div>
              </td>
              <td class="td-secondary">
                {{ countActiveEvents(cat.id_category) }}
              </td>
              <td>
                <div class="actions">
                  <AppButtonAdmin
                    variant="ghost"
                    size="sm"
                    icon-only
                    @click="openModal('edit', cat)"
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
                    variant="danger"
                    size="sm"
                    icon-only
                    @click="tryDeactivate(cat)"
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
                {{ mode === 'create' ? 'Nueva categoría' : 'Editar categoría' }}
              </h2>
              <button class="modal-close" @click="closeModal">✕</button>
            </div>
            <div class="modal-body">
              <AppInputAdmin
                v-model="formName"
                label="Nombre"
                placeholder="Nombre de la categoría"
                :error="formError"
                required
                helper="Debe ser único y no puede quedar vacío"
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
import type { Category } from '~/composables/useCategories';
import AppButtonAdmin from '~/components/admin/AppButtonAdmin.vue';
import AppInputAdmin from '~/components/admin/AppInputAdmin.vue';

definePageMeta({ layout: 'admin' });

const {
  sortedActiveCategories,
  loading,
  fetchCategoriesAdmin,
  createCategory,
  updateCategory,
  deactivateCategory,
} = useCategories();
const { events, fetchEventsAdmin } = useEvents();

onMounted(async () => {
  await Promise.all([fetchCategoriesAdmin(), fetchEventsAdmin()]);
});

const searchQuery = ref('');
const sortAsc = ref(true);

const filteredCategories = computed(() => {
  const list = sortAsc.value
    ? [...sortedActiveCategories.value]
    : [...sortedActiveCategories.value].reverse();
  if (!searchQuery.value) return list;
  return list.filter((c) =>
    c.categoryName.toLowerCase().includes(searchQuery.value.toLowerCase())
  ); // CORREGIDO: categoryName
});

function countActiveEvents(categoryId: number): number {
  return events.value.filter(
    (e) => e.id_category === categoryId && e.deleted_at === null
  ).length; // CORREGIDO: id_category (minúscula)
}

const modalOpen = ref(false);
const mode = ref<'create' | 'edit'>('create');
const editing = ref<Category | null>(null);
const formName = ref('');
const formError = ref('');
const saving = ref(false);

function openModal(m: 'create' | 'edit', cat?: Category) {
  mode.value = m;
  formError.value = '';
  formName.value = m === 'edit' && cat ? cat.categoryName : ''; // CORREGIDO: categoryName
  editing.value = cat ?? null;
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
      ? await createCategory(formName.value)
      : await updateCategory(editing.value!.id_category, formName.value);
  if (result.success) closeModal();
  else
    formError.value =
      result.errors?.categoryName ?? result.message ?? 'Error desconocido.'; // CORREGIDO: categoryName
  saving.value = false;
}

const deactivateErrorOpen = ref(false);
const deactivateErrorMsg = ref('');

async function tryDeactivate(cat: Category) {
  const result = await deactivateCategory(cat.id_category);
  if (!result.success) {
    deactivateErrorMsg.value =
      result.message ?? 'No es posible inactivar esta categoría.';
    deactivateErrorOpen.value = true;
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
  font-family: var(--font-mono);
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
.cat-name {
  font-family: var(--font-display);
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
