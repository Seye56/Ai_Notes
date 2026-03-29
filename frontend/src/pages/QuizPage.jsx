import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useParams } from 'react-router-dom'
import Button from '../components/ui/Button'
import Loader from '../components/ui/Loader'
import { useAudio } from '../hooks/useAudio'
import { useNoteStore } from '../store/noteStore'
import { useStudyStore } from '../store/studyStore'
import { languageOptions } from '../utils/languageMap'

const QuizPage = () => {
  const { id } = useParams()
  const { selectedNote, fetchNote } = useNoteStore()
  const { quiz, audio, generateQuiz, generateSpeech, loading } = useStudyStore()
  const [difficulty, setDifficulty] = useState('medium')
  const [numQuestions, setNumQuestions] = useState(5)
  const [speechLanguage, setSpeechLanguage] = useState('en')
  const { play, pause, playing } = useAudio(audio?.public_url)

  useEffect(() => {
    fetchNote(id).catch((error) => toast.error(error.message))
  }, [fetchNote, id])

  useEffect(() => {
    if (selectedNote?.source_language) {
      setSpeechLanguage(selectedNote.source_language)
    }
  }, [selectedNote?.source_language])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-main">Quiz Mode</h1>
        <p className="text-sm text-muted">Generate questions from your note and optionally hear them aloud.</p>
      </div>

      {!selectedNote ? (
        <div className="panel rounded-[28px] p-6">
          <Loader label="Loading note..." />
        </div>
      ) : (
        <>
          <div className="panel rounded-[28px] p-6">
            <div className="grid gap-4 md:grid-cols-[180px,160px,180px,1fr]">
              <select
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value)}
                className="select-field text-sm"
              >
                <option value="easy">easy</option>
                <option value="medium">medium</option>
                <option value="hard">hard</option>
              </select>
              <input
                type="number"
                min="1"
                max="10"
                value={numQuestions}
                onChange={(event) => setNumQuestions(Number(event.target.value))}
                className="input-field text-sm"
              />
              <select
                value={speechLanguage}
                onChange={(event) => setSpeechLanguage(event.target.value)}
                className="select-field text-sm"
              >
                {languageOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={async () => {
                    try {
                      await generateQuiz(id, {
                        difficulty,
                        num_questions: numQuestions,
                      })
                      toast.success('Quiz generated.')
                    } catch (error) {
                      toast.error(error.message)
                    }
                  }}
                  disabled={loading}
                >
                  Generate quiz
                </Button>
                {quiz && (
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      try {
                        await generateSpeech({
                          quizId: quiz.id,
                          gender: 'female',
                          mood: 'interactive',
                          language: speechLanguage,
                        })
                        toast.success('Quiz audio ready.')
                      } catch (error) {
                        toast.error(error.message)
                      }
                    }}
                  >
                    Speak quiz
                  </Button>
                )}
              </div>
            </div>
          </div>

          {quiz ? (
            <div className="grid gap-4">
              {quiz.questions_json.map((question, index) => (
                <div key={`${question.question}-${index}`} className="rounded-[28px] bg-white p-6 border border-purple-100">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--accent)]">Question {index + 1}</p>
                  <h2 className="mt-2 text-lg font-bold text-main">{question.question}</h2>
                  <div className="mt-4 grid gap-2">
                    {question.options.map((option) => (
                      <div
                        key={option}
                        className={`rounded-2xl px-4 py-3 text-sm ${
                          option === question.answer
                            ? 'border border-emerald-200'
                            : 'border border-transparent'
                        }`}
                        style={
                          option === question.answer
                            ? { background: 'var(--success-soft)', color: 'var(--text-main)' }
                            : { background: 'var(--surface-muted)', color: 'var(--text-soft)' }
                        }
                      >
                        {option}
                      </div>
                    ))}
                  </div>
                  {question.explanation && (
                    <p className="mt-4 text-sm leading-7 text-muted">{question.explanation}</p>
                  )}
                </div>
              ))}

              {audio?.public_url && (
                <div className="panel rounded-[28px] p-6 flex flex-wrap items-center gap-3">
                  <Button onClick={play} disabled={playing}>Play quiz audio</Button>
                  <Button variant="secondary" onClick={pause}>Pause</Button>
                  <a href={audio.public_url} target="_blank" rel="noreferrer" className="rounded-2xl border px-4 py-2.5 text-sm font-semibold text-soft" style={{ borderColor: 'var(--border-soft)', background: 'var(--surface-muted)' }}>
                    Open audio file
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="panel rounded-[28px] p-6 text-sm text-muted">
              Generate a quiz to see questions here.
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default QuizPage
