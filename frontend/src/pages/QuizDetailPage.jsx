import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { ChevronDown, Mic, MoreHorizontal, Sparkles } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../components/ui/Button'
import Loader from '../components/ui/Loader'
import Modal from '../components/ui/Modal'
import { useStudyStore } from '../store/studyStore'
import { useUserStore } from '../store/userStore'
import { getLanguageLabel, languageOptions } from '../utils/languageMap'

const buildQuestionAudioText = (question) => {
  const lines = [question.question]
  question.options.forEach((option, index) => {
    lines.push(`Option ${index + 1}. ${option}`)
  })
  return lines.join(' ')
}

const buildExplanationAudioText = (question) => {
  const parts = []
  if (question.answer) {
    parts.push(`Answer: ${question.answer}.`)
  }
  if (question.explanation) {
    parts.push(`Explanation: ${question.explanation}`)
  }
  return parts.join(' ')
}

const QuizDetailPage = () => {
  const navigate = useNavigate()
  const { quizId } = useParams()
  const { profile } = useUserStore()
  const { quizzes, quizFolders, hydrateQuizzes, hydrateQuizFolders, generateSpeech, translateQuizDocument, loading } = useStudyStore()
  const [speechLanguage, setSpeechLanguage] = useState(profile?.preferred_language || 'en')
  const [revealedMap, setRevealedMap] = useState({})
  const [menuIndex, setMenuIndex] = useState(null)
  const [audioModeMap, setAudioModeMap] = useState({})
  const [playingIndex, setPlayingIndex] = useState(null)
  const [loadingIndex, setLoadingIndex] = useState(null)
  const [actionsOpen, setActionsOpen] = useState(false)
  const [translateOpen, setTranslateOpen] = useState(false)
  const [targetLanguage, setTargetLanguage] = useState(profile?.preferred_language || 'fr')
  const audioRef = useRef(null)

  useEffect(() => {
    if (profile?.id) {
      hydrateQuizzes(profile.id)
      hydrateQuizFolders(profile.id)
      setSpeechLanguage(profile.preferred_language || 'en')
    }
  }, [hydrateQuizzes, hydrateQuizFolders, profile?.id, profile?.preferred_language])

  useEffect(() => () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
  }, [])

  const quiz = useMemo(() => quizzes.find((item) => item.id === quizId) ?? null, [quizzes, quizId])
  const folderName = useMemo(
    () => quizFolders.find((folder) => folder.itemIds.includes(quizId))?.name ?? quiz?.folder_name ?? 'Quiz',
    [quiz?.folder_name, quizFolders, quizId]
  )

  const handleReveal = (index) => {
    setRevealedMap((current) => ({ ...current, [index]: true }))
  }

  const handlePlayQuestionAudio = async (question, index) => {
    const mode = audioModeMap[index] || 'question'
    const text =
      mode === 'explanation'
        ? buildExplanationAudioText(question)
        : buildQuestionAudioText(question)

    if (!text.trim()) {
      toast.error(mode === 'explanation' ? 'No explanation is available yet.' : 'This question has no readable content.')
      return
    }

    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }

    try {
      setLoadingIndex(index)
      const audio = await generateSpeech({
        source_type: 'text',
        text,
        source_language: quiz.source_language,
        gender: 'female',
        mood: mode === 'explanation' ? 'narration' : 'interactive',
        language: speechLanguage,
      })
      const player = new Audio(audio.public_url)
      audioRef.current = player
      player.onended = () => {
        setPlayingIndex(null)
      }
      player.onerror = () => {
        setPlayingIndex(null)
      }
      await player.play()
      setPlayingIndex(index)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoadingIndex(null)
      setMenuIndex(null)
    }
  }

  const handleTranslate = async () => {
    if (!quiz) {
      return
    }

    try {
      const translated = await translateQuizDocument({
        userId: profile?.id,
        quiz,
        targetLanguage: getLanguageLabel(targetLanguage),
        folderName,
      })
      setTranslateOpen(false)
      toast.success(`${quiz.note_title} translated.`)
      navigate(`/quiz/${translated.id}`)
    } catch (error) {
      toast.error(error.message)
    }
  }

  if (!profile) {
    return (
      <div className="panel rounded-[28px] p-6">
        <Loader label="Loading quiz..." />
      </div>
    )
  }

  if (!quiz) {
    return (
      <div className="panel rounded-[28px] p-6 text-sm text-muted">
        This quiz is not available in your local quiz library yet. Return to the Quiz tab and generate or reopen it there.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-main">{quiz.note_title}</h1>
          <p className="text-sm text-muted">
            Quiz from {folderName} • {quiz.difficulty}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={speechLanguage}
            onChange={(event) => setSpeechLanguage(event.target.value)}
            className="select-field min-w-[12rem] text-sm"
          >
            {languageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="relative">
            <Button
              variant="secondary"
              className="h-12 w-12 rounded-full px-0"
              onClick={() => setActionsOpen((open) => !open)}
              aria-label="Quiz document actions"
            >
              <MoreHorizontal size={18} />
            </Button>
            {actionsOpen ? (
              <div className="panel absolute right-0 top-14 z-20 flex min-w-[13rem] flex-col rounded-2xl p-2">
                <button
                  type="button"
                  onClick={() => {
                    setActionsOpen(false)
                    setTranslateOpen(true)
                  }}
                  className="rounded-xl px-3 py-2 text-left text-sm font-medium text-main transition hover:bg-[var(--accent-soft)]"
                >
                  Translate
                </button>
              </div>
            ) : null}
          </div>
          <Button variant="secondary" onClick={() => navigate('/quiz')}>
            Back to quizzes
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {quiz.questions_json.map((question, index) => {
          const revealed = Boolean(revealedMap[index])
          const selectedAudioMode = audioModeMap[index] || 'question'
          const activeAudio = loadingIndex === index || playingIndex === index

          return (
            <div key={`${question.question}-${index}`} className="panel rounded-[28px] p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--accent)]">Question {index + 1}</p>
                  <h2 className="mt-2 text-lg font-bold text-main">{question.question}</h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePlayQuestionAudio(question, index)}
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition ${activeAudio ? 'bg-[var(--accent)] text-white shadow-lg shadow-purple-300/40' : 'bg-[var(--surface)] text-[var(--accent-strong)]'}`}
                    style={{ borderColor: activeAudio ? 'var(--accent)' : 'var(--border-soft)' }}
                    aria-label={`Play ${selectedAudioMode} audio for question ${index + 1}`}
                    disabled={loading}
                  >
                    <Mic size={18} />
                  </button>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setMenuIndex((current) => (current === index ? null : index))}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border bg-[var(--surface)] text-soft transition hover:bg-[var(--accent-soft)]"
                      style={{ borderColor: 'var(--border-soft)' }}
                      aria-label="Audio playback options"
                    >
                      <ChevronDown size={16} />
                    </button>
                    {menuIndex === index ? (
                      <div className="panel absolute right-0 top-14 z-20 flex min-w-[12rem] flex-col rounded-2xl p-2">
                        <button
                          type="button"
                          onClick={() => {
                            setAudioModeMap((current) => ({ ...current, [index]: 'question' }))
                            setMenuIndex(null)
                          }}
                          className={`rounded-xl px-3 py-2 text-left text-sm font-medium transition hover:bg-[var(--accent-soft)] ${selectedAudioMode === 'question' ? 'text-[var(--accent-strong)]' : 'text-main'}`}
                        >
                          Play question
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAudioModeMap((current) => ({ ...current, [index]: 'explanation' }))
                            setMenuIndex(null)
                          }}
                          className={`rounded-xl px-3 py-2 text-left text-sm font-medium transition hover:bg-[var(--accent-soft)] ${selectedAudioMode === 'explanation' ? 'text-[var(--accent-strong)]' : 'text-main'}`}
                        >
                          Play explanation
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-2">
                {question.options.map((option) => (
                  <div
                    key={option}
                    className={`rounded-2xl px-4 py-3 text-sm ${
                      revealed && option === question.answer ? 'border border-emerald-200' : 'border border-transparent'
                    }`}
                    style={
                      revealed && option === question.answer
                        ? { background: 'var(--success-soft)', color: 'var(--text-main)' }
                        : { background: 'var(--surface-muted)', color: 'var(--text-soft)' }
                    }
                  >
                    {option}
                  </div>
                ))}
              </div>

              {revealed ? (
                <div className="mt-5 rounded-[24px] border p-4" style={{ borderColor: 'var(--border-soft)', background: 'var(--surface-soft)' }}>
                  <div className="flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
                    <Sparkles size={16} />
                    Answer revealed
                  </div>
                  <p className="mt-3 text-sm font-semibold text-main">Correct answer: {question.answer}</p>
                  {question.explanation ? (
                    <p className="mt-3 text-sm leading-7 text-soft">{question.explanation}</p>
                  ) : null}
                </div>
              ) : (
                <div className="mt-5">
                  <Button variant="secondary" onClick={() => handleReveal(index)}>
                    Reveal
                  </Button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <Modal open={translateOpen} title="Translate quiz" onClose={() => setTranslateOpen(false)}>
        <div className="space-y-4">
          <select
            value={targetLanguage}
            onChange={(event) => setTargetLanguage(event.target.value)}
            className="select-field text-sm"
          >
            {languageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Button onClick={handleTranslate} disabled={loading}>
            Create translated quiz
          </Button>
        </div>
      </Modal>
    </div>
  )
}

export default QuizDetailPage
