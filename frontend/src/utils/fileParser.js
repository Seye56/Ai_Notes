export const acceptedImportTypes = '.txt,.pdf,.doc,.docx'

export const getFileDisplayName = (file) => {
  if (!file) {
    return 'No file selected'
  }
  return `${file.name} • ${(file.size / 1024).toFixed(1)} KB`
}
