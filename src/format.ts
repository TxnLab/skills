import wrapAnsi from 'wrap-ansi'

export function wrapText(text: string, indent: number): string {
  const columns = process.stdout.columns || 80
  const width = Math.max(columns - indent, 20)
  const wrapped = wrapAnsi(text, width, { hard: true })
  const pad = ' '.repeat(indent)
  return wrapped
    .split('\n')
    .map((line) => `${pad}${line}`)
    .join('\n')
}
