import { type FormEvent, useState } from 'react'
import type { InputField } from '../lib/api'

interface Props {
  fields: InputField[]
  onSubmit: (values: Record<string, unknown>) => void
  submitting?: boolean
}

export function DynamicInputForm({ fields, onSubmit, submitting }: Props) {
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const init: Record<string, unknown> = {}
    for (const f of fields) {
      if (f.default !== undefined && f.default !== null) {
        init[f.name] = f.default
      } else if (f.type === 'boolean') {
        init[f.name] = false
      } else {
        init[f.name] = ''
      }
    }
    return init
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit(values)
  }

  if (fields.length === 0) {
    return (
      <form onSubmit={handleSubmit}>
        <p className="muted">This script has no input parameters.</p>
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Running...' : 'Run script'}
        </button>
      </form>
    )
  }

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      {fields.map((field) => (
        <label key={field.name}>
          {field.label}
          {field.required && <span className="required"> *</span>}
          {field.type === 'boolean' ? (
            <div className="checkbox-field">
              <input
                type="checkbox"
                checked={Boolean(values[field.name])}
                onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.checked }))}
              />
              <span>{field.label}</span>
            </div>
          ) : field.type === 'select' ? (
            <select
              value={String(values[field.name] ?? '')}
              onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
              required={field.required}
            >
              <option value="">Select...</option>
              {field.options?.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : field.type === 'textarea' ? (
            <textarea
              rows={4}
              value={String(values[field.name] ?? '')}
              onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
              required={field.required}
            />
          ) : (
            <input
              type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
              value={String(values[field.name] ?? '')}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  [field.name]: field.type === 'number' ? e.target.valueAsNumber : e.target.value,
                }))
              }
              required={field.required}
            />
          )}
        </label>
      ))}
      <button className="btn btn-primary" type="submit" disabled={submitting}>
        {submitting ? 'Running...' : 'Run script'}
      </button>
    </form>
  )
}
