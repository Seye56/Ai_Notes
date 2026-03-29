import { useUserStore } from '../store/userStore'

export const useAuth = () => {
  return useUserStore((state) => state)
}

export default useAuth
