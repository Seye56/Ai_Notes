export const languageOptions = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ar', label: 'Arabic' },
  { value: 'yo', label: 'Yoruba' },
]

export const getLanguageLabel = (value) => {
  return languageOptions.find((option) => option.value === value)?.label ?? value
}
