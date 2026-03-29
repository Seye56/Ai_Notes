import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { MoreHorizontal, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'
import Loader from '../components/ui/Loader'
import Modal from '../components/ui/Modal'
import { useAudio } from '../hooks/useAudio'
import { useNoteStore } from '../store/noteStore'
import { useStudyStore } from '../store/studyStore'
import { useUserStore } from '../store/userStore'
import { languageOptions } from '../utils/languageMap'

const QuizHubPage = () => {
  const navigate = useNavigate()
  const { profile } = useUserStore()
  const { notes, folders, loading: notesLoading, fetchNotes, hydrateFolders } = useNoteStore()
  const { quizzes, loading, audio, hydrateQuizzes, generateAndStoreQuiz, generateSpeech } = useStudyStore()
  const [createOpen, setCreateOpen] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false)
  const [selectedFolderId, setSelectedFolderId] = useState(null)
  const [activeQuizId, setActiveQuizId] = useState(null)
  const [difficulty, setDifficulty] = useState('medium')
  const [numQuestions, setNumQuestions] = useState(5)
  const [speechLanguage, setSpeechLanguage] = useState(profile?.preferred_language || 'en')
  const { play, pause, playing } = useAudio(audio?.public_url)

  useEffect(() => {
    fetchNotes().catch((error) => toast.error(error.message))
  }, [fetchNotes])

  useEffect(() => {
    if (profile?.id) {
      hydrateFolders(profile.id)
      const loaded = hydrateQuizzes(profile.id)
      if (loaded[0]?.id) {
        setActiveQuizId(loaded[0].id)
      }
      setSpeechLanguage(profile.preferred_language || 'en')
    }
  }, [hydrateFolders, hydrateQuizzes, profile?.id, profile?.preferred_language])

  const folderNameByNoteId = useMemo(() => {
    const map = new Map()
    folders.forEach((folder) => {
      folder.noteIds.forEach((noteId) => {
        map.set(noteId, folder.name)
      })
    })
    return map
  }, [folders])

  const pickerNotes = useMemo(() => {
    if (selectedFolderId === 'my-notes') {
      return notes.filter((note) => !folders.some((folder) => folder.noteIds.includes(note.id)))
    }

    if (selectedFolderId) {
      const folder = folders.find((item) => item.id === selectedFolderId)
      return notes.filter((note) => folder?.noteIds.includes(note.id))
    }

    return notes
  }, [folders, notes, selectedFolderId])

  const activeQuiz = quizzes.find((quiz) => quiz.id === activeQuizId) ?? quizzes[0] ?? null

  const handleGenerateQuizForNote = async (note) => {
    try {
      const entry = await generateAndStoreQuiz({
        userId: profile?.id,
        note,
        folderName: folderNameByNoteId.get(note.id) ?? null,
        payload: {
          difficulty,
          num_questions: numQuestions,
        },
      })
      setActiveQuizId(entry.id)
      setCreateOpen(false)
      toast.success(`${note.title} quiz generated.`)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleSpeakActiveQuiz = async () => {
    if (!activeQuiz) {
      toast.error('Choose a quiz first.')
      return
    }

    try {
      await generateSpeech({
        quizId: activeQuiz.id,
        gender: 'female',
        mood: 'interactive',
        language: speechLanguage,
      })
      toast.success('Quiz audio ready.')
      setActionsOpen(false)
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-main">Quiz</h1>
          <p className="text-sm text-muted">Generate and revisit quizzes from your notes in one focused workspace.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button className="h-12 w-12 rounded-full px-0" onClick={() => setCreateOpen(true)} aria-label="Generate a quiz">
            <Plus size={20} />
          </Button>
          <div className="relative">
            <Button
              variant="secondary"
              className="h-12 w-12 rounded-full px-0"
              onClick={() => setActionsOpen((open) => !open)}
              aria-label="Quiz actions"
            >
              <MoreHorizontal size={18} />
            </Button>
            {actionsOpen ? (
              <div className="panel absolute right-0 top-14 z-20 flex min-w-[13rem] flex-col rounded-2xl p-2">
                <button
                  type="button"
                  onClick={() => {
                    setActionsOpen(false)
                    setActiveQuizId(null)
                  }}
                  className="rounded-xl px-3 py-2 text-left text-sm font-medium text-main transition hover:bg-[var(--accent-soft)]"
                >
                  Show all quizzes
                </button>
                {activeQuiz ? (
                  <>
                    <button
                      type="button"
                      onClick={handleSpeakActiveQuiz}
                      className="rounded-xl px-3 py-2 text-left text-sm font-medium text-main transition hover:bg-[var(--accent-soft)]"
                    >
                      Speak quiz
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActionsOpen(false)
                        navigate(`/note/${activeQuiz.note_id}`)
                      }}
                      className="rounded-xl px-3 py-2 text-left text-sm font-medium text-main transition hover:bg-[var(--accent-soft)]"
                    >
                      Open source note
                    </button>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {notesLoading ? (
        <div className="panel rounded-[28px] p-6">
          <Loader label="Loading notes..." />
        </div>
      ) : (
        <div className="space-y-6">
          <section className="space-y-4">
            {quizzes.length ? (
              <div className="space-y-4">
                {quizzes.map((quiz) => (
                  <button
                    key={quiz.id}
                    type="button"
                    onClick={() => setActiveQuizId(quiz.id)}
                    className={`panel w-full text-left rounded-[28px] p-5 transition hover:-translate-y-1 ${activeQuiz?.id === quiz.id ? 'ring-2 ring-[var(--accent)]' : ''}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-lg font-bold text-main">{quiz.note_title}</p>
                        <p className="mt-1 text-sm text-muted">
                          Quiz from {quiz.folder_name || 'My Notes'} • {quiz.questions_json.length} questions
                        </p>
                      </div>
                      <div className="glass-chip rounded-full px-3 py-2 text-xs font-semibold text-[var(--accent-strong)]">
                        {quiz.difficulty}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="panel rounded-[28px] p-6 text-sm text-muted">
                No quizzes yet. Use the plus button to choose a note and generate one here.
              </div>
            )}
          </section>

          <section className="panel rounded-[32px] p-6">
            {activeQuiz ? (
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-main">{activeQuiz.note_title}</h2>
                    <p className="mt-1 text-sm text-muted">Quiz from {activeQuiz.folder_name || 'My Notes'}</p>
                  </div>
                  <div className="glass-chip rounded-full px-3 py-2 text-xs font-semibold text-[var(--accent-strong)]">
                    {new Date(activeQuiz.created_at).toLocaleDateString()}
                  </div>
                </div>

                {activeQuiz.questions_json.map((question, index) => (
                  <div key={`${question.question}-${index}`} className="panel-soft rounded-[24px] p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--accent)]">Question {index + 1}</p>
                    <h3 className="mt-2 text-lg font-bold text-main">{question.question}</h3>
                    <div className="mt-4 grid gap-2">
                      {question.options.map((option) => (
                        <div
                          key={option}
                          className={`rounded-2xl px-4 py-3 text-sm ${
                            option === question.answer ? 'border border-emerald-200' : 'border border-transparent'
                          }`}
                          style={
                            option === question.answer
                              ? { background: 'var(--success-soft)', color: 'var(--text-main)' }
                              : { background: 'var(--surface)', color: 'var(--text-soft)' }
                          }
                        >
                          {option}
                        </div>
                      ))}
                    </div>
                    {question.explanation ? (
                      <p className="mt-4 text-sm leading-7 text-muted">{question.explanation}</p>
                    ) : null}
                  </div>
                ))}

                {audio?.public_url ? (
                  <div className="panel-soft rounded-[24px] p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <Button onClick={play} disabled={playing}>Play quiz audio</Button>
                      <Button variant="secondary" onClick={pause}>Pause</Button>
                      <a
                        href={audio.public_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-2xl border px-4 py-2.5 text-sm font-semibold text-soft"
                        style={{ borderColor: 'var(--border-soft)', background: 'var(--surface)' }}
                      >
                        Open audio
                      </a>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex min-h-[320px] items-center justify-center text-center text-sm text-muted">
                Pick or create a quiz to see the full set of questions here.
              </div>
            )}
          </section>
        </div>
      )}

      <Modal open={createOpen} title="Generate a quiz" onClose={() => setCreateOpen(false)}>
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)} className="select-field text-sm">
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
            <select value={speechLanguage} onChange={(event) => setSpeechLanguage(event.target.value)} className="select-field text-sm">
              {languageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedFolderId(null)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${selectedFolderId === null ? 'bg-[var(--accent)] text-white' : 'glass-chip'}`}
            >
              All notes
            </button>
            <button
              type="button"
              onClick={() => setSelectedFolderId('my-notes')}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${selectedFolderId === 'my-notes' ? 'bg-[var(--accent)] text-white' : 'glass-chip'}`}
            >
              My Notes
            </button>
            {folders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => setSelectedFolderId(folder.id)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${selectedFolderId === folder.id ? 'bg-[var(--accent)] text-white' : 'glass-chip'}`}
              >
                {folder.name}
              </button>
            ))}
          </div>

          <div className="max-h-[22rem] space-y-3 overflow-y-auto pr-1">
            {pickerNotes.map((note) => (
              <div key={note.id} className="panel-soft rounded-2xl p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-main">{note.title}</p>
                    <p className="mt-1 text-sm text-muted">{folderNameByNoteId.get(note.id) || 'My Notes'}</p>
                  </div>
                  <Button onClick={() => handleGenerateQuizForNote(note)} disabled={loading}>
                    Generate quiz
                  </Button>
                </div>
              </div>
            ))}
            {!pickerNotes.length ? (
              <div className="panel-soft rounded-2xl p-4 text-sm text-muted">
                No notes found in this section yet.
              </div>
            ) : null}
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default QuizHubPage
