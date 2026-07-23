import { useEffect, useState } from 'react'
import { Check, Copy } from './icons'

export const CODING_ASSISTANT_PROMPT = `I use Frameflow to generate App Store screenshots from a short written description of my app. Read this codebase and write that description for me.

Return a single plain-prose paragraph (about 60-120 words, no markdown, no bullet lists, no headings) that I can paste straight into the generator. Cover:
- What the app does and who it is for.
- Its three to five most important features or selling points, phrased the way a user would understand them rather than in technical terms.
- The overall tone and mood, and if the codebase has a clear visual identity (brand colors, dark or light, playful or serious), the theme the screenshots should match.

Describe the product like a marketer would, not the code, tech stack, or file layout, and do not invent features that are not in the codebase.`

export const CopyCodingPromptButton = () => {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [copied])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(CODING_ASSISTANT_PROMPT)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button
      type="button"
      className="ai-modal-copy-prompt"
      onClick={() => void handleCopy()}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      <span>{copied ? 'Prompt copied to clipboard' : 'Copy a prompt for your coding AI'}</span>
    </button>
  )
}
