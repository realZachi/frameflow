export type ToolbarPreset = {
  label: string
  value: number
}

export const percentPresets: ToolbarPreset[] = [
  { label: 'None', value: 0 },
  { label: 'Light', value: 25 },
  { label: 'Medium', value: 50 },
  { label: 'Strong', value: 75 },
  { label: 'Max', value: 100 },
]
