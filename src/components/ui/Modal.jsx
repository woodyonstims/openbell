// Modal — a reusable dark-themed dialog overlay
// Props:
//   isOpen   — controls visibility
//   onClose  — called when the user closes the modal
//   title    — text shown in the header bar
//   children — the modal body content
import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export default function Modal({ isOpen, onClose, title, children }) {
  // Ref to the modal panel so we can trap focus inside it
  const panelRef = useRef(null)

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  // Trap focus inside the modal while it's open
  useEffect(() => {
    if (!isOpen || !panelRef.current) return
    const focusable = panelRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const first = focusable[0]
    const last  = focusable[focusable.length - 1]

    function handleTab(e) {
      if (e.key !== 'Tab') return
      if (e.shiftKey) {
        // Shift+Tab — wrap backwards
        if (document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        }
      } else {
        // Tab forward — wrap to start
        if (document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleTab)
    // Focus the first focusable element when the modal opens
    first?.focus()
    return () => document.removeEventListener('keydown', handleTab)
  }, [isOpen])

  // Don't render anything if closed (keeps DOM clean)
  if (!isOpen) return null

  return (
    // Dark overlay — fills the whole screen, closes modal when clicked
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      {/* Modal panel — stop click from bubbling to overlay */}
      <div
        ref={panelRef}
        className="relative w-full max-w-md bg-surface border border-white/[0.08] rounded-2xl shadow-2xl
                   animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header bar: title + close button */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
          <h2 id="modal-title" className="text-sm font-semibold text-slate-100">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 transition-colors p-1 rounded-md hover:bg-white/[0.06]"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body — whatever the parent passes in */}
        <div className="p-5">
          {children}
        </div>
      </div>
    </div>
  )
}
