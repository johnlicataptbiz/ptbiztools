"use client";

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface CorexDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

const sizeClasses = {
  sm: '400px',
  md: '500px',
  lg: '700px',
  xl: '900px',
  full: '95vw'
}

export function CorexDialog({ 
  open, 
  onOpenChange, 
  title, 
  description, 
  children,
  size = 'lg'
}: CorexDialogProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false)
      }
    }
    
    if (open) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [open, onOpenChange])

  return (
    <AnimatePresence>
      {open && (
        <div className="corex-dialog-overlay" data-state="open">
          <motion.div
            className="corex-dialog-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />
          <div className="corex-dialog-position">
            <motion.div
              className="corex-dialog-content"
              data-size={size}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? 'corex-dialog-title' : undefined}
              aria-describedby={description ? 'corex-dialog-description' : undefined}
              style={{ maxWidth: sizeClasses[size] }}
            >
              {title && (
                <div className="corex-dialog-header">
                  <h2 id="corex-dialog-title" className="corex-dialog-title">{title}</h2>
                  {description && (
                    <p id="corex-dialog-description" className="corex-dialog-description">
                      {description}
                    </p>
                  )}
                </div>
              )}
              <button
                className="corex-dialog-close"
                onClick={() => onOpenChange(false)}
                aria-label="Close dialog"
              >
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                </svg>
              </button>
              <div className="corex-dialog-body">
                {children}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  )
}

interface CorexAccordionProps {
  items: {
    title: string
    content: React.ReactNode
    disabled?: boolean
  }[]
  collapsible?: boolean
  multiple?: boolean
  defaultValue?: string[]
}

export function CorexAccordion({ items, collapsible = true, multiple = false, defaultValue = [] }: CorexAccordionProps) {
  const [value, setValue] = useState<string[]>(defaultValue)

  const toggle = (itemValue: string) => {
    if (multiple) {
      setValue(prev => 
        prev.includes(itemValue) 
          ? prev.filter(v => v !== itemValue)
          : [...prev, itemValue]
      )
    } else {
      setValue(prev => prev.includes(itemValue) && collapsible ? [] : [itemValue])
    }
  }

  return (
    <div className="corex-accordion" data-multiple={multiple} data-collapsible={collapsible}>
      {items.map((item, index) => {
        const itemValue = `item-${index}`
        const isOpen = value.includes(itemValue)
        
        return (
          <div 
            key={itemValue} 
            className="corex-accordion-item"
            data-state={isOpen ? 'open' : 'closed'}
            data-disabled={item.disabled}
          >
            <button
              className="corex-accordion-trigger"
              onClick={() => !item.disabled && toggle(itemValue)}
              aria-expanded={isOpen}
              disabled={item.disabled}
            >
              <span className="corex-accordion-trigger-text">{item.title}</span>
              <svg className="corex-accordion-chevron" width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M4.78164 5.28157C4.54432 5.51889 4.54432 5.90726 4.78164 6.14458L7.78164 9.14458C8.01896 9.3819 8.40733 9.3819 8.64465 9.14458L11.6447 6.14458C11.882 5.90726 11.882 5.51889 11.6447 5.28157C11.4073 5.04425 11.019 5.04425 10.7816 5.28157L7.78164 8.28157L4.78164 5.28157Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
              </svg>
            </button>
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  className="corex-accordion-content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="corex-accordion-content-inner">
                    {item.content}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}

export function CorexButton({ 
  children, 
  variant = 'primary', 
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  className = ''
}: {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  className?: string
}) {
  return (
    <button
      type={type}
      className={`corex-button corex-button-${variant} corex-button-${size} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      data-disabled={disabled || loading}
      data-loading={loading}
    >
      {loading ? <span className="corex-spinner" /> : children}
    </button>
  )
}

export function CorexInput({ 
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  disabled = false
}: {
  label?: string
  type?: string
  placeholder?: string
  value?: string | number
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  error?: string
  disabled?: boolean
}) {
  return (
    <div className="corex-field">
      {label && <label className="corex-field-label">{label}</label>}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="corex-input"
        data-error={error}
      />
      {error && <span className="corex-field-error">{error}</span>}
    </div>
  )
}

export function CorexSelect({ 
  label,
  value,
  onChange,
  options,
  disabled = false
}: {
  label?: string
  value?: string
  onChange?: (value: string) => void
  options: { value: string; label: string }[]
  disabled?: boolean
}) {
  return (
    <div className="corex-field">
      {label && <label className="corex-field-label">{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        className="corex-select"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}

export function CorexTabs({ 
  tabs, 
  value, 
  onChange 
}: { 
  tabs: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="corex-tabs" role="tablist">
      {tabs.map(tab => (
        <button
          key={tab.value}
          role="tab"
          aria-selected={value === tab.value}
          data-state={value === tab.value ? 'active' : 'inactive'}
          className="corex-tab"
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
