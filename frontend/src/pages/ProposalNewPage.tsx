import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api, type InputField } from '../lib/api'

const INPUT_TYPES = ['text', 'number', 'date', 'boolean', 'select', 'textarea']

const emptyInput = (): InputField => ({
  name: '',
  label: '',
  type: 'text',
  required: false,
})

export function ProposalNewPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [scriptContent, setScriptContent] = useState(`#!/usr/bin/env python3
import argparse
import os


def main():
    parser = argparse.ArgumentParser(description="Example ConnectX script")
    parser.add_argument("--dry_run", choices=["true", "false"], default="false")
    args = parser.parse_args()

    tenant = os.environ.get("TENANT_ID", "not-set")
    token_set = "yes" if os.environ.get("BEARER_TOKEN") else "no"

    print(f"Tenant ID: {tenant}")
    print(f"Bearer token configured: {token_set}")
    print(f"Dry run: {args.dry_run}")

    if args.dry_run == "true":
        print("Dry run complete — no changes made.")
    else:
        print("Script finished successfully.")


if __name__ == "__main__":
    main()
`)
  const [inputs, setInputs] = useState<InputField[]>([
    { name: 'dry_run', label: 'Dry run', type: 'boolean', required: false, default: false },
  ])
  const [requiredCreds, setRequiredCreds] = useState('BEARER_TOKEN,TENANT_ID')
  const [timeoutSeconds, setTimeoutSeconds] = useState('')
  const [error, setError] = useState('')

  const createMutation = useMutation({
    mutationFn: () =>
      api.createProposal({
        name,
        slug,
        description,
        script_content: scriptContent,
        input_schema: { inputs: inputs.filter((i) => i.name && i.label) },
        credential_requirements: {
          required: requiredCreds.split(',').map((s) => s.trim()).filter(Boolean),
          optional: [],
        },
        timeout_seconds: timeoutSeconds ? Number(timeoutSeconds) : null,
      }),
    onSuccess: () => navigate('/proposals'),
    onError: (e: Error) => setError(e.message),
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    createMutation.mutate()
  }

  const updateInput = (index: number, patch: Partial<InputField>) => {
    setInputs((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  return (
    <div>
      <header className="page-header">
        <h1>Propose Script</h1>
        <p>Define the script and its unique input structure for admin review</p>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      <form className="card form-card" onSubmit={handleSubmit}>
        <label>Name<input value={name} onChange={(e) => setName(e.target.value)} required /></label>
        <label>
          Slug (lowercase, hyphens)
          <input value={slug} onChange={(e) => setSlug(e.target.value)} pattern="[a-z0-9-]+" required />
        </label>
        <label>Description<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></label>

        <label>
          Python script
          <textarea className="code-input" value={scriptContent} onChange={(e) => setScriptContent(e.target.value)} rows={12} required />
        </label>

        <fieldset>
          <legend>Input fields (unique per script)</legend>
          {inputs.map((input, index) => (
            <div key={index} className="input-row">
              <input placeholder="name" value={input.name} onChange={(e) => updateInput(index, { name: e.target.value })} />
              <input placeholder="Label" value={input.label} onChange={(e) => updateInput(index, { label: e.target.value })} />
              <select value={input.type} onChange={(e) => updateInput(index, { type: e.target.value })}>
                {INPUT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <label className="checkbox-inline">
                <input type="checkbox" checked={!!input.required} onChange={(e) => updateInput(index, { required: e.target.checked })} />
                Required
              </label>
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setInputs((p) => [...p, emptyInput()])}>
            + Add input field
          </button>
        </fieldset>

        <label>
          Required credentials (comma-separated ENV keys)
          <input value={requiredCreds} onChange={(e) => setRequiredCreds(e.target.value)} placeholder="BEARER_TOKEN, TENANT_ID" />
        </label>

        <label>
          Timeout override (seconds, optional)
          <input type="number" min={30} max={86400} value={timeoutSeconds} onChange={(e) => setTimeoutSeconds(e.target.value)} placeholder="600" />
        </label>

        <button className="btn btn-primary" type="submit" disabled={createMutation.isPending}>
          Save as draft
        </button>
      </form>
    </div>
  )
}
