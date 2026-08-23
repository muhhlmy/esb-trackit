<script setup>
import BaseSkeleton from './BaseSkeleton.vue'
import SkeletonAvatar from './SkeletonAvatar.vue'

defineProps({
  rows: {
    type: Number,
    default: 5,
  },
  cols: {
    type: Number,
    default: 5,
  },
  preset: {
    type: String,
    default: 'default',
    validator: (v) => ['default', 'users', 'employees', 'logs', 'tickets'].includes(v),
  },
  showActions: {
    type: Boolean,
    default: true,
  },
  showCheckboxes: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <!-- ═══════════════════════════════════════════════════════════════════════
       PRESET: USERS TABLE (Exact match to UsersView.vue actual table headers & columns)
       ═══════════════════════════════════════════════════════════════════════ -->
  <div
    v-if="preset === 'users'"
    class="w-full max-w-full overflow-hidden rounded-2xl border border-[#E2E8F0]/80 bg-white shadow-2xs"
  >
    <table class="w-full max-w-full text-left border-collapse table-fixed">
      <colgroup>
        <col class="w-[31%]" />
        <col class="w-[12%]" />
        <col class="w-[22%]" />
        <col class="w-[15%]" />
        <col class="w-[12%]" />
        <col class="w-[8%]" />
      </colgroup>
      <thead
        class="sticky top-0 z-10 border-b border-[#E2E8F0]/80 bg-[#F8FAFC]/80 backdrop-blur-xs select-none whitespace-nowrap"
      >
        <tr>
          <th
            class="py-3 pl-5 pr-4 text-[10.5px] font-semibold uppercase tracking-wider text-[#64748B] text-left whitespace-nowrap"
          >
            Pengguna
          </th>
          <th
            class="py-3 px-4 text-[10.5px] font-semibold uppercase tracking-wider text-[#64748B] text-left whitespace-nowrap"
          >
            Role Akses
          </th>
          <th
            class="py-3 px-4 text-[10.5px] font-semibold uppercase tracking-wider text-[#64748B] text-left whitespace-nowrap"
          >
            Sub Role / Unit Ditangani
          </th>
          <th
            class="py-3 px-4 text-[10.5px] font-semibold uppercase tracking-wider text-[#64748B] text-left whitespace-nowrap"
          >
            Hak Akses Fitur
          </th>
          <th
            class="py-3 px-4 text-[10.5px] font-semibold uppercase tracking-wider text-[#64748B] text-left whitespace-nowrap"
          >
            Status
          </th>
          <th
            class="py-3 pr-5 pl-4 text-right text-[10.5px] font-semibold uppercase tracking-wider text-[#64748B] whitespace-nowrap"
          >
            Aksi
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-[#F1F5F9]">
        <tr v-for="r in rows" :key="'user-row-' + r" class="hover:bg-[#F8FAFC] transition-colors">
          <!-- Col 1: Pengguna (Name + Email) -->
          <td class="py-4 pl-5 pr-4 overflow-hidden">
            <div class="flex flex-col gap-1.5 min-w-0">
              <BaseSkeleton width="130px" height="14px" radius="md" />
              <BaseSkeleton width="160px" height="12px" radius="sm" />
            </div>
          </td>
          <!-- Col 2: Role Akses Badge -->
          <td class="py-4 px-4 overflow-hidden">
            <BaseSkeleton width="75px" height="22px" radius="full" />
          </td>
          <!-- Col 3: Sub Role / Unit Ditangani -->
          <td class="py-4 px-4 overflow-hidden">
            <div class="flex gap-1 min-w-0">
              <BaseSkeleton width="50px" height="20px" radius="md" />
              <BaseSkeleton width="45px" height="20px" radius="md" />
            </div>
          </td>
          <!-- Col 4: Hak Akses Fitur Badge -->
          <td class="py-4 px-4 overflow-hidden">
            <BaseSkeleton width="85px" height="22px" radius="full" />
          </td>
          <!-- Col 5: Status Badge -->
          <td class="py-4 px-4 overflow-hidden">
            <BaseSkeleton width="60px" height="22px" radius="full" />
          </td>
          <!-- Col 6: Aksi -->
          <td class="py-4 pr-5 pl-4 text-right overflow-hidden">
            <div class="flex items-center justify-end gap-1">
              <BaseSkeleton width="28px" height="28px" radius="md" />
              <BaseSkeleton width="28px" height="28px" radius="md" />
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- ═══════════════════════════════════════════════════════════════════════
       PRESET: EMPLOYEES TABLE (Exact match to EmployeesView.vue actual table)
       ═══════════════════════════════════════════════════════════════════════ -->
  <div
    v-else-if="preset === 'employees'"
    class="w-full max-w-full overflow-hidden rounded-2xl border border-[#E2E8F0]/80 bg-white shadow-2xs"
  >
    <table class="w-full max-w-full text-left border-collapse table-fixed">
      <colgroup>
        <col class="w-[22%]" />
        <col class="w-[11%]" />
        <col class="w-[18%]" />
        <col class="w-[22%]" />
        <col class="w-[10%]" />
        <col class="w-[11%]" />
        <col class="w-[6%]" />
      </colgroup>
      <thead class="border-b border-[#E2E8F0]/80 bg-[#F8FAFC]/80 select-none whitespace-nowrap">
        <tr>
          <th
            class="py-3 pl-5 pr-4 text-[10.5px] font-semibold uppercase tracking-wider text-[#64748B] text-left whitespace-nowrap"
          >
            Karyawan
          </th>
          <th
            class="py-3 px-4 text-[10.5px] font-semibold uppercase tracking-wider text-[#64748B] text-left whitespace-nowrap"
          >
            NIK
          </th>
          <th
            class="py-3 px-4 text-[10.5px] font-semibold uppercase tracking-wider text-[#64748B] text-left whitespace-nowrap"
          >
            Title / Jabatan
          </th>
          <th
            class="py-3 px-4 text-[10.5px] font-semibold uppercase tracking-wider text-[#64748B] text-left whitespace-nowrap"
          >
            Departemen / Direktorat
          </th>
          <th
            class="py-3 px-4 text-[10.5px] font-semibold uppercase tracking-wider text-[#64748B] text-left whitespace-nowrap"
          >
            Status
          </th>
          <th
            class="py-3 px-4 text-[10.5px] font-semibold uppercase tracking-wider text-[#64748B] text-left whitespace-nowrap"
          >
            Lokasi Kerja
          </th>
          <th
            class="py-3 pr-5 pl-4 text-right text-[10.5px] font-semibold uppercase tracking-wider text-[#64748B] whitespace-nowrap"
          >
            Aksi
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-[#F1F5F9]">
        <tr v-for="r in rows" :key="'emp-row-' + r" class="hover:bg-[#F8FAFC] transition-colors">
          <!-- Col 1: Name + Email -->
          <td class="py-4 pl-5 pr-4 overflow-hidden">
            <div class="flex flex-col gap-1.5 min-w-0">
              <BaseSkeleton width="120px" height="14px" radius="md" />
              <BaseSkeleton width="140px" height="11px" radius="sm" />
            </div>
          </td>
          <!-- Col 2: NIK -->
          <td class="py-4 px-4 overflow-hidden">
            <BaseSkeleton width="75px" height="13px" radius="sm" />
          </td>
          <!-- Col 3: Title / Jabatan -->
          <td class="py-4 px-4 overflow-hidden">
            <BaseSkeleton width="110px" height="13px" radius="sm" />
          </td>
          <!-- Col 4: Departemen / Direktorat -->
          <td class="py-4 px-4 overflow-hidden">
            <div class="flex flex-col gap-1.5 min-w-0">
              <BaseSkeleton width="120px" height="13px" radius="sm" />
              <BaseSkeleton width="90px" height="11px" radius="sm" />
            </div>
          </td>
          <!-- Col 5: Status -->
          <td class="py-4 px-4 overflow-hidden">
            <BaseSkeleton width="65px" height="22px" radius="full" />
          </td>
          <!-- Col 6: Lokasi Kerja -->
          <td class="py-4 px-4 overflow-hidden">
            <BaseSkeleton width="85px" height="13px" radius="sm" />
          </td>
          <!-- Col 7: Actions -->
          <td class="py-4 pr-5 pl-4 text-right overflow-hidden">
            <div class="flex items-center justify-end gap-1">
              <BaseSkeleton width="28px" height="28px" radius="md" />
              <BaseSkeleton width="28px" height="28px" radius="md" />
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- ═══════════════════════════════════════════════════════════════════════
       PRESET: LOGS TABLE (Exact match to LogsView.vue audit/asset history)
       ═══════════════════════════════════════════════════════════════════════ -->
  <div
    v-else-if="preset === 'logs'"
    class="w-full overflow-x-auto rounded-2xl border border-[#E2E8F0]/80 bg-white shadow-2xs"
  >
    <table class="w-full text-left border-collapse">
      <thead class="border-b border-[#E2E8F0]/80 bg-[#F8FAFC]/80 select-none">
        <tr>
          <th
            class="py-3 pl-5 pr-4 text-[10.5px] font-semibold uppercase tracking-wider text-[#64748B] min-w-[140px]"
          >
            Waktu
          </th>
          <th
            class="py-3 px-4 text-[10.5px] font-semibold uppercase tracking-wider text-[#64748B] min-w-[180px]"
          >
            Pelaku
          </th>
          <th
            class="py-3 px-4 text-[10.5px] font-semibold uppercase tracking-wider text-[#64748B] min-w-[110px]"
          >
            Aksi
          </th>
          <th
            class="py-3 px-4 text-[10.5px] font-semibold uppercase tracking-wider text-[#64748B] min-w-[240px]"
          >
            Detail Aktivitas
          </th>
          <th
            class="py-3 pr-5 pl-4 text-right text-[10.5px] font-semibold uppercase tracking-wider text-[#64748B]"
          >
            IP / Perangkat
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-[#F1F5F9]">
        <tr v-for="r in rows" :key="'log-row-' + r" class="hover:bg-[#F8FAFC] transition-colors">
          <td class="py-3.5 pl-5 pr-4 min-w-[140px]">
            <BaseSkeleton width="110px" height="13px" radius="sm" />
          </td>
          <td class="py-3.5 px-4 min-w-[180px]">
            <div class="flex items-center gap-2.5">
              <SkeletonAvatar size="28px" shape="circle" class="shrink-0" />
              <BaseSkeleton width="120px" height="13px" radius="md" />
            </div>
          </td>
          <td class="py-3.5 px-4 min-w-[110px]">
            <BaseSkeleton width="65px" height="20px" radius="full" />
          </td>
          <td class="py-3.5 px-4 min-w-[240px]">
            <BaseSkeleton width="210px" height="13px" radius="sm" />
          </td>
          <td class="py-3.5 pr-5 pl-4 text-right">
            <BaseSkeleton width="90px" height="12px" radius="sm" class="ml-auto" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- ═══════════════════════════════════════════════════════════════════════
       PRESET: TICKETS TABLE (Exact match to TicketsView.vue inbox table)
       ═══════════════════════════════════════════════════════════════════════ -->
  <div
    v-else-if="preset === 'tickets'"
    class="w-full overflow-x-auto rounded-2xl border border-[#E2E8F0]/80 bg-white shadow-2xs"
  >
    <table class="w-full text-left border-collapse">
      <thead class="border-b border-[#E2E8F0]/80 bg-[#F8FAFC]/80 select-none">
        <tr>
          <th
            class="py-3 pl-5 pr-4 text-[10.5px] font-semibold uppercase tracking-wider text-[#64748B] min-w-[240px]"
          >
            Tiket &amp; Subjek
          </th>
          <th
            class="py-3 px-4 text-[10.5px] font-semibold uppercase tracking-wider text-[#64748B] min-w-[150px]"
          >
            Pemohon
          </th>
          <th
            class="py-3 px-4 text-[10.5px] font-semibold uppercase tracking-wider text-[#64748B] min-w-[110px]"
          >
            Unit
          </th>
          <th
            class="py-3 px-4 text-[10.5px] font-semibold uppercase tracking-wider text-[#64748B] min-w-[110px]"
          >
            Status
          </th>
          <th
            class="py-3 px-4 text-[10.5px] font-semibold uppercase tracking-wider text-[#64748B] min-w-[100px]"
          >
            Prioritas
          </th>
          <th
            class="py-3 pr-5 pl-4 text-right text-[10.5px] font-semibold uppercase tracking-wider text-[#64748B]"
          >
            Aksi
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-[#F1F5F9]">
        <tr v-for="r in rows" :key="'ticket-row-' + r" class="hover:bg-[#F8FAFC] transition-colors">
          <td class="py-4 pl-5 pr-4 min-w-[240px]">
            <div class="flex items-center gap-3">
              <SkeletonAvatar size="36px" shape="rounded" class="shrink-0" />
              <div class="flex flex-col gap-1.5">
                <BaseSkeleton width="180px" height="14px" radius="md" />
                <BaseSkeleton width="110px" height="11px" radius="sm" />
              </div>
            </div>
          </td>
          <td class="py-4 px-4 min-w-[150px]">
            <div class="flex items-center gap-2">
              <SkeletonAvatar size="24px" shape="circle" class="shrink-0" />
              <BaseSkeleton width="100px" height="13px" radius="sm" />
            </div>
          </td>
          <td class="py-4 px-4 min-w-[110px]">
            <BaseSkeleton width="60px" height="20px" radius="md" />
          </td>
          <td class="py-4 px-4 min-w-[110px]">
            <BaseSkeleton width="75px" height="22px" radius="full" />
          </td>
          <td class="py-4 px-4 min-w-[100px]">
            <BaseSkeleton width="65px" height="20px" radius="full" />
          </td>
          <td class="py-4 pr-5 pl-4 text-right">
            <BaseSkeleton width="24px" height="24px" radius="md" class="ml-auto" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- ═══════════════════════════════════════════════════════════════════════
       DEFAULT GENERIC TABLE (Used for general fallback tables)
       ═══════════════════════════════════════════════════════════════════════ -->
  <div
    v-else
    class="w-full overflow-x-auto rounded-2xl border border-[#E2E8F0]/80 bg-white shadow-2xs"
  >
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="bg-[#F8FAFC] border-b border-[#E2E8F0]">
          <th v-if="showCheckboxes" class="w-10 px-4 py-3">
            <BaseSkeleton width="16px" height="16px" radius="sm" />
          </th>
          <th v-for="c in cols" :key="'head-' + c" class="px-4 py-3">
            <BaseSkeleton
              :width="c === 1 ? '70%' : c === cols ? '40%' : '55%'"
              height="12px"
              radius="sm"
            />
          </th>
          <th v-if="showActions" class="w-20 px-4 py-3 text-right">
            <BaseSkeleton width="50px" height="12px" radius="sm" class="ml-auto" />
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-[#F1F5F9]">
        <tr v-for="r in rows" :key="'row-' + r" class="hover:bg-[#F8FAFC] transition-colors">
          <td v-if="showCheckboxes" class="w-10 px-4 py-3.5">
            <BaseSkeleton width="16px" height="16px" radius="sm" />
          </td>
          <td v-for="c in cols" :key="'cell-' + r + '-' + c" class="px-4 py-3.5">
            <div class="flex items-center gap-2">
              <BaseSkeleton
                v-if="c === 1"
                width="24px"
                height="24px"
                radius="full"
                class="shrink-0"
              />
              <BaseSkeleton
                :width="c === 1 ? '75%' : c === 2 ? '60%' : c === 3 ? '45%' : '80%'"
                height="14px"
                radius="md"
              />
            </div>
          </td>
          <td v-if="showActions" class="w-20 px-4 py-3.5 text-right">
            <div class="flex items-center justify-end gap-1">
              <BaseSkeleton width="24px" height="24px" radius="md" />
              <BaseSkeleton width="24px" height="24px" radius="md" />
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
