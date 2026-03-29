import { useEffect, useRef, useState } from 'react'

export const useAudio = (src) => {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!src) {
      audioRef.current?.pause()
      audioRef.current = null
      setPlaying(false)
      return
    }

    const audio = new Audio(src)
    audioRef.current = audio
    const handleEnded = () => setPlaying(false)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.pause()
      audio.removeEventListener('ended', handleEnded)
    }
  }, [src])

  const play = async () => {
    if (!audioRef.current) {
      return
    }
    await audioRef.current.play()
    setPlaying(true)
  }

  const pause = () => {
    audioRef.current?.pause()
    setPlaying(false)
  }

  return { playing, play, pause }
}

export default useAudio
