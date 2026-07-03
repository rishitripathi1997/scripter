import { type FormEvent, useState } from 'react'
import type { InputField } from '../lib/api'

interface Props {
  fields: InputField[]
  onSubmit: (values: Record<string, unknown>) => void
  submitting?: boolean
  disabled?: boolean
}

export function DynamicInputForm({ fields, onSubmit, submitting, disabled }: Props) {
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

  const isDisabled = submitting || disabled

  if (fields.length === 0) {
    return (
      <form className="card form-section run-input-form" onSubmit={handleSubmit}>
        <p className="muted">This script has no input parameters.</p>
        <button className="btn btn-primary btn-block" type="submit" disabled={isDisabled}>
          {submitting ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Running…
            </>
          ) : (
            'Run script'
          )}
        </button>
      </form>
    )
  }

  return (
    <form className="card form-section run-input-form" onSubmit={handleSubmit}>
      <div className="form-section-header">
        <h3>Script inputs</h3>
        <p className="muted small">Values are passed as CLI arguments</p>
      </div>

      {fields.map((field) => (
        <div key={field.name} className="field">
          {field.type === 'boolean' ? (
            <>
              <label className="checkbox-label" htmlFor={field.name}>
                <input
                  id={field.name}
                  type="checkbox"
                  checked={Boolean(values[field.name])}
                  onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.checked }))}
                />
                <span>
                  {field.label}
                  {field.required && <span className="required"> *</span>}
                </span>
              </label>
            </>
          ) : (
            <>
              <label htmlFor={field.name}>
                {field.label}
                {field.required && <span className="required"> *</span>}
              </label>
              {field.type === 'select' ? (
                <select
                  id={field.name}
                  value={String(values[field.name] ?? '')}
                  onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
                  required={field.required}
                >
                  <option value="">Select…</option>
                  {field.options?.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : field.type === 'textarea' ? (
                <textarea
                  id={field.name}
                  rows={4}
                  value={String(values[field.name] ?? '')}
                  onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
                  required={field.required}
                />
              ) : (
                <input
                  id={field.name}
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
            </>
          )}
        </div>
      ))}

      <button className="btn btn-primary btn-block" type="submit" disabled={isDisabled}>
        {submitting ? (
          <>
            <span className="spinner" aria-hidden="true" />
            Running…
          </>
        ) : (
          'Run script'
        )}
      </button>
    </form>
  )
}
