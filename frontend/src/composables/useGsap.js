import { onBeforeUnmount, onMounted } from 'vue'

/**
 * GSAP is a ~70 kB (≈28 kB gzip) animation library and is *decorative only*.
 * It used to be a hard import, which put it on the startup path of every page —
 * including Login and the public Help Center, which never animate. It is now
 * loaded on demand: the first animation request fetches the chunk, and until it
 * arrives (or if it ever fails) each helper degrades to its final visible state.
 * The final-state fallback matters: content must never be left at opacity 0.
 */
let gsapLib = null
let gsapPromise = null

function loadGsap() {
  if (gsapLib) return Promise.resolve(gsapLib)
  if (!gsapPromise) {
    gsapPromise = import('gsap')
      .then((mod) => {
        gsapLib = mod.default || mod
        return gsapLib
      })
      .catch((err) => {
        devWarn('[gsap] Module unavailable; animations disabled:', err?.message)
        return null
      })
  }
  return gsapPromise
}

function devWarn(...args) {
  if (import.meta.env?.DEV) {
    console.warn(...args)
  }
}

/**
 * Native check for prefers-reduced-motion
 */
export function isReducedMotion() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Vue 3 Composable managing GSAP Context & Lifecycle Cleanup
 * Automatically calls ctx.revert() on onBeforeUnmount to prevent memory leaks.
 */
export function useGsapContext(scopeRef) {
  let ctx = null

  onMounted(() => {
    loadGsap().then((gsap) => {
      if (gsap) ctx = gsap.context(() => {}, scopeRef?.value || undefined)
    })
  })

  onBeforeUnmount(() => {
    if (ctx) {
      ctx.revert()
      ctx = null
    }
  })

  function add(fn) {
    if (ctx) {
      return ctx.add(fn)
    } else {
      return fn()
    }
  }

  return { ctx, add }
}

/**
 * Run a GSAP context scoped to a root element, loading GSAP on demand.
 * Replaces the repeated `gsap.context(() => { ... }, root)` blocks that used to
 * force a static `import gsap` (and therefore an eager ~28 kB gzip load) into
 * HomeView and the admin views.
 *
 * @param {{value: Element|null}} scopeRef
 * @param {(gsap: object, root: Element) => void} builder
 */
export function animateIn(scopeRef, builder) {
  if (isReducedMotion()) return
  const root = scopeRef?.value
  if (!root) return

  loadGsap().then((gsap) => {
    if (!gsap || !root.isConnected) return
    try {
      gsap.context(() => builder(gsap, root), root)
    } catch (err) {
      devWarn('[AnimateIn] GSAP error handled:', err?.message)
    }
  })
}

/**
 * Membangun done-callback sekali pakai untuk transition hooks Vue.
 * Mencegah double-invocation dan menelan error setelah teardown.
 */
function createSafeDone(label, done) {
  let called = false
  return () => {
    if (called) return
    called = true
    if (typeof done === 'function') {
      try {
        done()
      } catch (err) {
        devWarn(`[${label}] Transition hook handled:`, err?.message)
      }
    }
  }
}

/**
 * Target valid untuk animasi transition (harus terhubung ke DOM).
 */
function isValidTransitionTarget(el, requireParent = true) {
  return !!el && el.isConnected && (!requireParent || !!el.parentNode)
}

/**
 * Set state final tanpa animasi (prefer-reduced-motion / fallback).
 * Pure DOM writes — intentionally does not depend on GSAP being loaded, so the
 * fallback can never leave content hidden if the chunk fails to arrive.
 */
function setFinalState(el, { opacity, y } = {}) {
  const els = Array.isArray(el) ? el : [el]
  for (const node of els) {
    if (!node || !node.style) continue
    if (opacity !== undefined) node.style.opacity = String(opacity)
    if (y !== undefined) node.style.transform = y ? `translateY(${y}px)` : ''
  }
}

/**
 * Route / Page transition ENTER hook for Vue Router
 */
export function animatePageEnter(el, done) {
  const safeDone = createSafeDone('PageEnter', done)

  if (!isValidTransitionTarget(el)) {
    safeDone()
    return
  }

  if (isReducedMotion()) {
    setFinalState(el, { opacity: 1, y: 0 })
    safeDone()
    return
  }

  loadGsap().then((gsap) => {
    if (!gsap || !isValidTransitionTarget(el)) {
      setFinalState(el, { opacity: 1, y: 0 })
      safeDone()
      return
    }
    try {
      gsap.killTweensOf(el)
      gsap.fromTo(
        el,
        { opacity: 0, y: 10 },
        {
          opacity: 1,
          y: 0,
          duration: 0.25,
          ease: 'power2.out',
          clearProps: 'transform,opacity',
          onComplete: safeDone,
          onInterrupt: safeDone,
        },
      )
      setTimeout(safeDone, 350)
    } catch (err) {
      devWarn('[PageEnter] GSAP fallback triggered:', err?.message)
      setFinalState(el, { opacity: 1, y: 0 })
      safeDone()
    }
  })
}

/**
 * Route / Page transition LEAVE hook for Vue Router
 */
export function animatePageLeave(el, done) {
  const safeDone = createSafeDone('PageLeave', done)

  if (!isValidTransitionTarget(el)) {
    safeDone()
    return
  }

  if (isReducedMotion()) {
    setFinalState(el, { opacity: 0 })
    safeDone()
    return
  }

  loadGsap().then((gsap) => {
    if (!gsap || !isValidTransitionTarget(el)) {
      setFinalState(el, { opacity: 0 })
      safeDone()
      return
    }
    try {
      gsap.killTweensOf(el)
      gsap.to(el, {
        opacity: 0,
        y: -6,
        duration: 0.18,
        ease: 'power2.in',
        onComplete: safeDone,
        onInterrupt: safeDone,
      })
      setTimeout(safeDone, 280)
    } catch (err) {
      devWarn('[PageLeave] GSAP fallback triggered:', err?.message)
      setFinalState(el, { opacity: 0 })
      safeDone()
    }
  })
}

/**
 * Stagger entrance animation for card grids, table rows, and list items
 */
export function animateStagger(targets, options = {}) {
  if (!targets) return

  let els = []
  if (typeof targets === 'string') {
    if (typeof document === 'undefined') return
    els = Array.from(document.querySelectorAll(targets)).filter((el) => el && el.isConnected)
  } else if (typeof Element !== 'undefined' && targets instanceof Element) {
    if (targets.isConnected) els = [targets]
  } else if (
    Array.isArray(targets) ||
    targets instanceof NodeList ||
    targets instanceof HTMLCollection
  ) {
    els = Array.from(targets).filter((el) => el && el.isConnected)
  }

  if (!els || els.length === 0) return

  if (isReducedMotion()) {
    setFinalState(els, { opacity: 1, y: 0 })
    return
  }

  const { y = 12, duration = 0.3, stagger = 0.04, ease = 'power2.out', delay = 0 } = options

  return loadGsap().then((gsap) => {
    if (!gsap) {
      setFinalState(els, { opacity: 1, y: 0 })
      return
    }
    try {
      gsap.killTweensOf(els)
      return gsap.fromTo(
        els,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration,
          stagger,
          ease,
          delay,
          clearProps: 'transform,opacity',
        },
      )
    } catch (err) {
      devWarn('[Stagger Animation] GSAP error handled:', err?.message)
      setFinalState(els, { opacity: 1, y: 0 })
    }
  })
}

/**
 * Menjalankan animasi panel modal (backdrop + panel) dengan fallback aman.
 */
function runModalTransition(label, el, animatePanel, timeoutMs, done) {
  const safeDone = createSafeDone(label, done)

  if (!isValidTransitionTarget(el, false)) {
    safeDone()
    return
  }

  if (isReducedMotion()) {
    safeDone()
    return
  }

  loadGsap().then((gsap) => {
    if (!gsap || !isValidTransitionTarget(el, false)) {
      safeDone()
      return
    }
    try {
      const panel = el.querySelector('.app-modal-panel') || el
      gsap.killTweensOf([el, panel])
      animatePanel(gsap, el, panel, safeDone)
      setTimeout(safeDone, timeoutMs)
    } catch (err) {
      devWarn(`[${label}] GSAP fallback triggered:`, err?.message)
      safeDone()
    }
  })
}

/**
 * Modal Open Transition (Backdrop fade + Modal scale/slide)
 */
export function animateModalEnter(el, done) {
  runModalTransition(
    'ModalEnter',
    el,
    (gsap, backdrop, panel, cb) => {
      gsap.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power2.out' })
      gsap.fromTo(
        panel,
        { opacity: 0, scale: 0.96, y: 8 },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 0.25,
          ease: 'power3.out',
          clearProps: 'transform,opacity',
          onComplete: cb,
          onInterrupt: cb,
        },
      )
    },
    350,
    done,
  )
}

/**
 * Modal Close Transition
 */
export function animateModalLeave(el, done) {
  runModalTransition(
    'ModalLeave',
    el,
    (gsap, backdrop, panel, cb) => {
      gsap.to(backdrop, { opacity: 0, duration: 0.18, ease: 'power2.in' })
      gsap.to(panel, {
        opacity: 0,
        scale: 0.97,
        y: 4,
        duration: 0.18,
        ease: 'power2.in',
        onComplete: cb,
        onInterrupt: cb,
      })
    },
    280,
    done,
  )
}

/**
 * Numeric Counter Animation for Dashboard Metric Cards
 */
export function animateCounter(targetRef, endValue, duration = 0.8) {
  const setValue = () => {
    if (targetRef) targetRef.value = endValue
  }

  if (isReducedMotion() || typeof endValue !== 'number' || isNaN(endValue)) {
    setValue()
    return
  }

  loadGsap().then((gsap) => {
    if (!gsap) {
      setValue()
      return
    }
    try {
      const obj = { val: targetRef.value || 0 }
      gsap.to(obj, {
        val: endValue,
        duration,
        ease: 'power1.out',
        onUpdate: () => {
          if (targetRef) targetRef.value = Math.round(obj.val)
        },
      })
    } catch {
      setValue()
    }
  })
}
