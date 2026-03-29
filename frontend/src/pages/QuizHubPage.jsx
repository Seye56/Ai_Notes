import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { FolderOpen, MoreHorizontal, Plus, Trash2, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'
import Loader from '../components/ui/Loader'
import Modal from '../components/ui/Modal'
import { useNoteStore } from '../store/noteStore'
import { useStudyStore } from '../store/studyStore'
import { useUserStore } from '../store/userStore'
import { languageOptions } from '../utils/languageMap'

const tileColorMap = {
  blue: 'linear-gradient(135deg, rgba(125, 211, 252, 0.46), rgba(191, 219, 254, 0.28))',
  pink: 'linear-gradient(135deg, rgba(249, 168, 212, 0.42), rgba(251, 207, 232, 0.24))',
  yellow: 'linear-gradient(135deg, rgba(253, 224, 71, 0.42), rgba(254, 240, 138, 0.28))',
  mint: 'linear-gradient(135deg, rgba(134, 239, 172, 0.42), rgba(209, 250, 229, 0.22))',
  purple: 'linear-gradient(135deg, rgba(196, 181, 253, 0.44), rgba(221, 214, 254, 0.26))',
}

const tileColors = ['purple', 'blue', 'pink', 'yellow', 'mint']

const QuizHubPage = () => {
  const navigate = useNavigate()
  const { profile } = useUserStore()
  const { notes, folders, loading: notesLoading, fetchNotes, hydrateFolders } = useNoteStore()
  const {
    quizzes,
    quizFolders,
    loading,
    hydrateQuizzes,
    hydrateQuizFolders,
    generateAndStoreQuiz,
    createQuizFolder,
    moveQuizzesToFolder,
    deleteQuizFolder,
  } = useStudyStore()
  const [createOpen, setCreateOpen] = useState(false)
  const [foldersOpen, setFoldersOpen] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false)
  const [selectedFolderId, setSelectedFolderId] = useState(null)
  const [pickerFolderId, setPickerFolderId] = useState(null)
  const [difficulty, setDifficulty] = useState('medium')
  const [numQuestions, setNumQuestions] = useState(5)
  const [speechLanguage, setSpeechLanguage] = useState(profile?.preferred_language || 'en')
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedQuizzes, setSelectedQuizzes] = useState([])
  const [folderName, setFolderName] = useState('')

  useEffect(() => {
    fetchNotes().catch((error) => toast.error(error.message))
  }, [fetchNotes])

  useEffect(() => {
    if (profile?.id) {
      hydrateFolders(profile.id)
      hydrateQuizzes(profile.id)
      hydrateQuizFolders(profile.id)
      setSpeechLanguage(profile.preferred_language || 'en')
    }
  }, [hydrateFolders, hydrateQuizzes, hydrateQuizFolders, profile?.id, profile?.preferred_language])

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
    if (pickerFolderId === 'my-notes') {
      return notes.filter((note) => !folders.some((folder) => folder.noteIds.includes(note.id)))
    }

    if (pickerFolderId) {
      const folder = folders.find((item) => item.id === pickerFolderId)
      return notes.filter((note) => folder?.noteIds.includes(note.id))
    }

    return notes
  }, [folders, notes, pickerFolderId])

  const folderNameByQuizId = useMemo(() => {
    const map = new Map()
    quizFolders.forEach((folder) => {
      folder.itemIds.forEach((quizId) => {
        map.set(quizId, folder.name)
      })
    })
    return map
  }, [quizFolders])

  const quizzesInSelectedFolder = useMemo(() => {
    if (selectedFolderId) {
      const folder = quizFolders.find((item) => item.id === selectedFolderId)
      return quizzes.filter((quiz) => folder?.itemIds.includes(quiz.id))
    }

    return quizzes.filter((quiz) => !quizFolders.some((folder) => folder.itemIds.includes(quiz.id)))
  }, [quizzes, quizFolders, selectedFolderId])

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
      setCreateOpen(false)
      toast.success(`${note.title} quiz generated.`)
      navigate(`/quiz/${entry.id}`)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const toggleSelection = (quizId) => {
    setSelectedQuizzes((current) =>
      current.includes(quizId) ? current.filter((id) => id !== quizId) : [...current, quizId]
    )
  }

  const handleOpenSelectionMode = () => {
    setActionsOpen(false)
    setSelectionMode(true)
  }

  const handleOpenFolders = () => {
    setActionsOpen(false)
    setFoldersOpen(true)
  }

  const handleExitSelectionMode = () => {
    setSelectionMode(false)
    setSelectedQuizzes([])
  }

  const handleCreateFolder = () => {
    try {
      const folder = createQuizFolder(profile?.id, folderName)
      setFolderName('')
      toast.success(`${folder.name} created.`)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleMoveSelectedToFolder = (folderId) => {
    try {
      moveQuizzesToFolder(profile?.id, selectedQuizzes, folderId)
      toast.success(folderId ? 'Quizzes moved to folder.' : 'Quizzes moved back to Quiz.')
      handleExitSelectionMode()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleDeleteFolder = (folder) => {
    const moveToQuiz = window.confirm(
      `Delete "${folder.name}"?\n\nPress OK to move its quizzes back to Quiz.\nPress Cancel if you want to choose the delete-everything option next.`
    )

    if (moveToQuiz) {
      try {
        deleteQuizFolder(profile?.id, folder.id, 'move')
        if (selectedFolderId === folder.id) {
          setSelectedFolderId(null)
        }
        toast.success('Folder deleted. Quizzes moved back to Quiz.')
      } catch (error) {
        toast.error(error.message)
      }
      return
    }

    const deleteEverything = window.confirm(
      `Delete "${folder.name}" and every quiz inside it? This cannot be undone.`
    )

    if (!deleteEverything) {
      return
    }

    try {
      deleteQuizFolder(profile?.id, folder.id, 'delete')
      if (selectedFolderId === folder.id) {
        setSelectedFolderId(null)
      }
      toast.success('Folder and its quizzes deleted.')
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-main">Quiz</h1>
          <p className="text-sm text-muted">
            {selectedFolderId
              ? `Viewing ${quizFolders.find((folder) => folder.id === selectedFolderId)?.name}. Move quizzes in and out whenever you need.`
              : 'Generate and revisit quizzes from your notes in one focused workspace.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selectionMode ? (
            <>
              <div className="glass-chip rounded-full px-4 py-2 text-sm font-medium text-main">
                {selectedQuizzes.length} selected
              </div>
              {quizFolders.length ? (
                <select
                  className="select-field w-auto min-w-[12rem]"
                  defaultValue=""
                  onChange={(event) => {
                    if (event.target.value) {
                      handleMoveSelectedToFolder(event.target.value)
                      event.target.value = ''
                    }
                  }}
                >
                  <option value="" disabled>Move to folder</option>
                  {quizFolders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              ) : null}
              <Button variant="secondary" onClick={() => handleMoveSelectedToFolder(null)} disabled={!selectedQuizzes.length}>
                Move to Quiz
              </Button>
              <Button variant="secondary" onClick={handleExitSelectionMode}>
                <X size={16} />
                Done
              </Button>
            </>
          ) : (
            <>
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
                        setSelectedFolderId(null)
                      }}
                      className="rounded-xl px-3 py-2 text-left text-sm font-medium text-main transition hover:bg-[var(--accent-soft)]"
                    >
                      Show all quizzes
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenSelectionMode}
                      className="rounded-xl px-3 py-2 text-left text-sm font-medium text-main transition hover:bg-[var(--accent-soft)]"
                    >
                      Select quizzes
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenFolders}
                      className="rounded-xl px-3 py-2 text-left text-sm font-medium text-main transition hover:bg-[var(--accent-soft)]"
                    >
                      Folders
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setSelectedFolderId(null)}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${selectedFolderId === null ? 'bg-[var(--accent)] text-white' : 'glass-chip'}`}
        >
          Quiz
        </button>
        {quizFolders.map((folder) => (
          <button
            key={folder.id}
            type="button"
            onClick={() => setSelectedFolderId(folder.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${selectedFolderId === folder.id ? 'bg-[var(--accent)] text-white' : 'glass-chip'}`}
          >
            {folder.name} ({folder.itemIds.length})
          </button>
        ))}
      </div>

      {notesLoading ? (
        <div className="panel rounded-[28px] p-6">
          <Loader label="Loading notes..." />
        </div>
      ) : (
        <div className="space-y-6">
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {quizzesInSelectedFolder.length ? (
              quizzesInSelectedFolder.map((quiz, index) => (
                <button
                  key={quiz.id}
                  type="button"
                  onClick={() => selectionMode ? toggleSelection(quiz.id) : navigate(`/quiz/${quiz.id}`)}
                  className="rounded-[28px] border p-5 text-left transition hover:-translate-y-1"
                  style={{
                    background: tileColorMap[tileColors[index % tileColors.length]],
                    borderColor: selectedQuizzes.includes(quiz.id) ? 'var(--accent)' : 'var(--border-soft)',
                    boxShadow: 'var(--shadow-card)',
                  }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold text-main">{quiz.note_title}</p>
                      <p className="mt-1 text-sm text-muted">
                        Quiz from {folderNameByQuizId.get(quiz.id) || quiz.folder_name || 'Quiz'} • {quiz.questions_json.length} questions
                      </p>
                    </div>
                    <div className="glass-chip rounded-full px-3 py-2 text-xs font-semibold text-[var(--accent-strong)]">
                      {quiz.difficulty}
                    </div>
                  </div>
                  {selectionMode && selectedQuizzes.includes(quiz.id) ? (
                    <div className="mt-4 inline-flex rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]">
                      Selected
                    </div>
                  ) : null}
                </button>
              ))
            ) : (
              <div className="panel rounded-[28px] p-6 text-sm text-muted">
                No quizzes yet. Use the plus button to choose a note and generate one here.
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
              onClick={() => setPickerFolderId(null)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${pickerFolderId === null ? 'bg-[var(--accent)] text-white' : 'glass-chip'}`}
            >
              All notes
            </button>
            <button
              type="button"
              onClick={() => setPickerFolderId('my-notes')}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${pickerFolderId === 'my-notes' ? 'bg-[var(--accent)] text-white' : 'glass-chip'}`}
            >
              My Notes
            </button>
            {folders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => setPickerFolderId(folder.id)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${pickerFolderId === folder.id ? 'bg-[var(--accent)] text-white' : 'glass-chip'}`}
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

      <Modal open={foldersOpen} title="Quiz folders" onClose={() => setFoldersOpen(false)}>
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={folderName}
              onChange={(event) => setFolderName(event.target.value)}
              placeholder="Create a quiz folder"
              className="input-field flex-1"
            />
            <Button onClick={handleCreateFolder}>
              <FolderOpen size={16} />
              Create
            </Button>
          </div>

          <div className="space-y-3">
            {quizFolders.length ? (
              quizFolders.map((folder) => (
                <div key={folder.id} className="panel-soft flex items-center justify-between rounded-2xl p-4">
                  <div>
                    <p className="font-semibold text-main">{folder.name}</p>
                    <p className="text-sm text-muted">{folder.itemIds.length} quizzes</p>
                  </div>
                  <Button variant="danger" onClick={() => handleDeleteFolder(folder)}>
                    <Trash2 size={16} />
                    Delete
                  </Button>
                </div>
              ))
            ) : (
              <div className="panel-soft rounded-2xl p-4 text-sm text-muted">
                No quiz folders yet.
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default QuizHubPage
