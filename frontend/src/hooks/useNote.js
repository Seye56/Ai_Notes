import { useNoteStore } from '../store/noteStore'

export const useNote = () => {
  return useNoteStore((state) => state)
}

export default useNote
