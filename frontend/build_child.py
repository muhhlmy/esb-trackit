import io, os

tmp = os.environ.get('LOCALAPPDATA') + '/Temp'
VIEWS = 'C:/Users/Helmy/Documents/Magang/Projects/esb-trackit/frontend/src/views/'
COMP = 'C:/Users/Helmy/Documents/Magang/Projects/esb-trackit/frontend/src/components/assets/'

orig = io.open(tmp + '/MyAssetsView.orig.vue', encoding='utf-8').read().split('\n')

# Bounds extracted via @vue/compiler-sfc AST (see extract_ast.mjs) — offsets exact.
l1_body = io.open(tmp + '/ast_l1.txt', encoding='utf-8').read()
l2_block = io.open(tmp + '/ast_l2.txt', encoding='utf-8').read()
l3_block = io.open(tmp + '/ast_l3.txt', encoding='utf-8').read()
modals = io.open(tmp + '/ast_modals.txt', encoding='utf-8').read()
style_part = '\n'.join(orig[1691:])

header = """<script setup>
import { computed } from 'vue'
import AppPagination from '../../ui/AppPagination.vue'
import SkeletonTable from '../../ui/skeleton/SkeletonTable.vue'
import { normalizeLocation } from '../../../utils/locationNormalizer.js'

const props = defineProps({
  filteredEmployees: { type: Array, default: () => [] },
  paginatedEmployees: { type: Array, default: () => [] },
  employeesWithAssets: { type: Array, default: () => [] },
  totalEmployeesHoldingAssets: { type: Number, default: 0 },
  totalAssignedAssetsCount: { type: Number, default: 0 },
  recentlyAssignedCount: { type: Number, default: 0 },
  employeeSearch: { type: String, default: '' },
  filterDepartemen: { type: String, default: '' },
  filterLokasi: { type: String, default: '' },
  departemenFilterOptions: { type: Array, default: () => [] },
  lokasiFilterOptions: { type: Array, default: () => [] },
  currentPageEmployees: { type: Number, default: 1 },
  itemsPerPage: { type: Number, default: 10 },
  isLoadingEmployees: { type: Boolean, default: false },
  employeeError: { type: String, default: '' },
})

const emit = defineEmits([
  'update:employeeSearch',
  'update:filterDepartemen',
  'update:filterLokasi',
  'update:currentPageEmployees',
  'select-employee',
  'refresh',
])

const search = computed({
  get: () => props.employeeSearch,
  set: (v) => emit('update:employeeSearch', v),
})
const departemen = computed({
  get: () => props.filterDepartemen,
  set: (v) => emit('update:filterDepartemen', v),
})
const lokasi = computed({
  get: () => props.filterLokasi,
  set: (v) => emit('update:filterLokasi', v),
})
const page = computed({
  get: () => props.currentPageEmployees,
  set: (v) => emit('update:currentPageEmployees', v),
})

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
function getAvatarGradient(index) {
  const gradients = [
    'linear-gradient(135deg,#003d9b,#0052cc)',
    'linear-gradient(135deg,#0052cc,#0066ff)',
    'linear-gradient(135deg,#0c56d0,#4f5f7b)',
    'linear-gradient(135deg,#4f5f7b,#737685)',
  ]
  return gradients[index % gradients.length]
}
function getDeviceIcon(tipe) {
  const map = {
    laptop: 'laptop',
    notebook: 'laptop',
    pc: 'desktop_windows',
    desktop: 'desktop_windows',
    monitor: 'monitor',
    printer: 'print',
    scanner: 'scanner',
    network: 'router',
    router: 'router',
    switch: 'router',
    phone: 'smartphone',
    smartphone: 'smartphone',
    tablet: 'tablet',
    headphone: 'headset',
    headset: 'headset',
    camera: 'photo_camera',
    storage: 'storage',
    hdd: 'storage',
    ssd: 'storage',
    ups: 'battery_charging_full',
  }
  if (!tipe) return 'devices'
  const key = tipe.toLowerCase().trim()
  return map[key] || 'devices'
}
</script>

<template>
  <div class="flex flex-col gap-5">
"""

footer = """
  </div>
</template>
"""

child = header + l1_body + footer
io.open(COMP + 'MyAssetsEmployeeList.vue', 'w', encoding='utf-8').write(child)
print('child written:', len(child.splitlines()), 'lines')

# ---- parent ----
script_part = '\n'.join(orig[:orig.index([l for l in orig if l == '<template>'][0])])
# swap AppPagination import for the child component
script_part = script_part.replace(
    "import AppPagination from '../components/ui/AppPagination.vue'",
    "import MyAssetsEmployeeList from '../components/assets/MyAssetsEmployeeList.vue'")

new_tmpl = """<template>
  <div
    class="employee-assets-page flex min-w-0 flex-col gap-5"
    :data-testid="!isLoading ? 'page-ready' : undefined"
  >
    <MyAssetsEmployeeList
      v-if="currentLevel === 1 && canBrowseOtherAssets"
      :filtered-employees="filteredEmployees"
      :paginated-employees="paginatedEmployees"
      :employees-with-assets="employeesWithAssets"
      :total-employees-holding-assets="totalEmployeesHoldingAssets"
      :total-assigned-assets-count="totalAssignedAssetsCount"
      :recently-assigned-count="recentlyAssignedCount"
      :employee-search="employeeSearch"
      :filter-departemen="filterDepartemen"
      :filter-lokasi="filterLokasi"
      :departemen-filter-options="departemenFilterOptions"
      :lokasi-filter-options="lokasiFilterOptions"
      :current-page-employees="currentPageEmployees"
      :items-per-page="itemsPerPage"
      :is-loading-employees="isLoadingEmployees"
      :employee-error="employeeError"
      @update:employee-search="employeeSearch = $event"
      @update:filter-departemen="filterDepartemen = $event"
      @update:filter-lokasi="filterLokasi = $event"
      @update:current-page-employees="currentPageEmployees = $event"
      @select-employee="goToLevel2"
      @refresh="fetchEmployees"
    />
"""

new_tmpl += '\n' + l2_block + '\n'
new_tmpl += '\n' + l3_block + '\n'
new_tmpl += '\n' + modals + '\n'
new_tmpl += """  </div>
</template>

"""

parent = script_part + new_tmpl + style_part
io.open(VIEWS + 'MyAssetsView.vue', 'w', encoding='utf-8').write(parent)
print('parent written:', len(parent.splitlines()), 'lines')
