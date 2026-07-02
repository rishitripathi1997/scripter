const AWS_KEYS = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_SESSION_TOKEN']

export function getMissingCredentials(
  required: string[],
  savedKeys: Set<string>,
): string[] {
  const hasSts = savedKeys.has('AWS_STS_CONFIG')
  return required.filter((key) => {
    if (hasSts && AWS_KEYS.includes(key)) return false
    return !savedKeys.has(key)
  })
}
