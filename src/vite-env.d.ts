/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MOONSHOT_API_KEY?: string
  readonly VITE_GOOGLE_GENERATIVE_AI_API_KEY?: string
  readonly VITE_ALIBABA_API_KEY?: string
  readonly VITE_OPENAI_API_KEY?: string
  readonly VITE_ANTHROPIC_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
