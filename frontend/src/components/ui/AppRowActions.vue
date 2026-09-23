<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'

const props = defineProps({
  actions: {
    type: Array,
    required: true,
    // Array of: { label: String, icon?: String, danger?: Boolean, disabled?: Boolean, hidden?: Boolean, onClick: Function }
  },
  label: {
    type: String,
    default: 'Opsi Aksi',
  },
  menuClass: { type: String, default: '' },
})

const isOpen = ref(false)
const buttonRef = ref(null)
const dropdownRef = ref(null)
const dropdownStyle = ref({})
const activeMenuIndex = ref(-1)

function updateDropdownPosition() {
  if (!buttonRef.value) return
  const rect = buttonRef.value.getBoundingClientRect()
  const visibleActions = props.actions.filter((a) => !a.hidden)
  const estimatedHeight =
    (props.menuClass && dropdownRef.value?.offsetHeight) || visibleActions.length * 38 + 16
  const spaceBelow = window.innerHeight - rect.bottom

  const rightDistance = window.innerWidth - rect.right

  const styleObj = {
    position: 'fixed',
    minWidth: '175px',
    maxWidth: '280px',
    width: 'max-content',
    zIndex: 9999,
  }

  // Vertical placement (top vs bottom)
  if (spaceBelow < estimatedHeight && rect.top > estimatedHeight) {
    styleObj.top = `${Math.max(8, rect.top - estimatedHeight - 4)}px`
  } else {
    styleObj.top = `${rect.bottom + 4}px`
  }

  // Horizontal placement (align right edge of dropdown with right edge of action button)
  if (rightDistance >= 0) {
    styleObj.right = `${Math.max(8, rightDistance)}px`
  } else {
    styleObj.left = `${Math.max(8, rect.left)}px`
  }

  dropdownStyle.value = styleObj
}

let isJustClosed = false

async function toggleDropdown() {
  if (isJustClosed) return
  if (!isOpen.value) {
    updateDropdownPosition()
    isOpen.value = true
    await nextTick()
    updateDropdownPosition()
    // Fokus masuk ke item menu pertama agar keyboard langsung beroperasi di
    // dalam menu (pola ARIA menu). Escape/Tab akan mengembalikan fokus.
    const items = dropdownRef.value?.querySelectorAll('button:not([disabled])') || []
    activeMenuIndex.value = items.length ? 0 : -1
    items[0]?.focus()
  } else {
    closeDropdown()
  }
}

function closeDropdown() {
  isOpen.value = false
  activeMenuIndex.value = -1
}

function handleMenuKeydown(event) {
  const items = Array.from(dropdownRef.value?.querySelectorAll('button:not([disabled])') || [])
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    if (items.length === 0) return
    const dir = event.key === 'ArrowDown' ? 1 : -1
    let idx = items.indexOf(document.activeElement)
    if (idx === -1) idx = 0
    else idx = (idx + dir + items.length) % items.length
    activeMenuIndex.value = idx
    items[idx].focus()
    return
  }
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    closeDropdown()
    buttonRef.value?.focus()
    return
  }
  if (event.key === 'Tab') {
    // Tab keluar dari menu: tutup dan kembalikan fokus ke tombol pemicu agar
    // urutan tab tidak melompat ke elemen yang tersembunyi di teleport layer.
    event.preventDefault()
    closeDropdown()
    buttonRef.value?.focus()
  }
}

function handleAction(actionItem) {
  if (actionItem.disabled) return
  isJustClosed = true
  closeDropdown()
  setTimeout(() => {
    isJustClosed = false
  }, 200)
  // Kembalikan fokus ke tombol pemicu sebelum aksi dijalankan agar fokus tidak
  // hilang saat menu di-teleport di-unmount (target aksi bisa membuka modal).
  buttonRef.value?.focus()
  if (typeof actionItem.onClick === 'function') {
    actionItem.onClick()
  }
}

function handleClickOutside(event) {
  if (isOpen.value) {
    const isClickOnButton = buttonRef.value && buttonRef.value.contains(event.target)
    const isClickOnDropdown = dropdownRef.value && dropdownRef.value.contains(event.target)
    if (!isClickOnButton && !isClickOnDropdown) {
      closeDropdown()
    }
  }
}

function handleScrollOrResize() {
  if (isOpen.value) {
    updateDropdownPosition()
  }
}

function handleKeydown(event) {
  if (event.key === 'Escape' && isOpen.value) {
    event.stopPropagation()
    closeDropdown()
    buttonRef.value?.focus()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside, true)
  document.addEventListener('keydown', handleKeydown)
  window.addEventListener('scroll', handleScrollOrResize, true)
  window.addEventListener('resize', handleScrollOrResize)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside, true)
  document.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('scroll', handleScrollOrResize, true)
  window.removeEventListener('resize', handleScrollOrResize)
})
</script>

<template>
  <div class="relative inline-block text-left">
    <button
      ref="buttonRef"
      type="button"
      @click.stop="toggleDropdown"
      :aria-label="label"
      :title="label"
      :aria-haspopup="'menu'"
      :aria-expanded="isOpen ? 'true' : 'false'"
      class="ui-menu-trigger flex h-7 w-7 items-center justify-center rounded-lg text-[#66728d] hover:bg-[#F8FAFC] hover:text-[#333333] transition-all cursor-pointer"
      :class="isOpen ? 'bg-[#ECF2FF] text-[#333333]' : ''"
    >
      <span aria-hidden="true" class="material-symbols-outlined text-[18px]">more_horiz</span>
    </button>

    <Teleport to="body">
      <Transition name="fade-scale">
        <div
          v-if="isOpen"
          ref="dropdownRef"
          :style="dropdownStyle"
          :class="menuClass"
          role="menu"
          :aria-label="label"
          class="ui-action-menu rounded-xl border border-[#E5EAEF] bg-white p-1.5 shadow-2xl outline-none select-none"
          @keydown="handleMenuKeydown"
        >
          <template v-for="(act, idx) in actions" :key="idx">
            <button
              v-if="!act.hidden"
              type="button"
              role="menuitem"
              :disabled="act.disabled"
              :tabindex="idx === activeMenuIndex ? 0 : -1"
              @click.stop="handleAction(act)"
              class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-bold transition-all cursor-pointer text-left whitespace-nowrap"
              :class="[
                act.disabled
                  ? 'opacity-40 cursor-not-allowed text-gray-500'
                  : act.danger
                    ? 'text-rose-700 hover:bg-rose-50'
                    : 'text-[#2A3547] hover:bg-[#ECF2FF] hover:text-[#333333]',
              ]"
            >
              <span
                v-if="act.icon"
                aria-hidden="true"
                class="material-symbols-outlined text-[16px] shrink-0"
              >
                {{ act.icon }}
              </span>
              <span class="whitespace-nowrap shrink-0">{{ act.label }}</span>
            </button>
          </template>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: all 0.15s ease-out;
}
.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-4px);
}
</style>
