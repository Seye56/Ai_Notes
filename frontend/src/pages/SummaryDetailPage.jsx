import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { MoreHorizontal } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../components/ui/Button'
import Loader from '../components/ui/Loader'
import Modal from '../components/ui/Modal'
import { useStudyStore } from '../store/studyStore'
import { useUserStore } from '../store/userStore'
import { getLanguageLabel, languageOptions } from '../utils/languageMap'

const SummaryDetailPage = () => {
  const navigate = useNavigate()
  const { summaryId } = useParams()
  const { profile } = useUserStore()
  const { summaries, summaryFolders, hydrateSummaries, hydrateSummaryFolders, translateSummaryDocument, loading } = useStudyStore()
  const [actionsOpen, setActionsOpen] = useState(false)
  const [translateOpen, setTranslateOpen] = useState(false)
  const [targetLanguage, setTargetLanguage] = useState(profile?.preferred_language || 'fr')

  useEffect(() => {
    if (profile?.id) {
      hydrateSummaries(profile.id)
      hydrateSummaryFolders(profile.id)
    }
  }, [hydrateSummaries, hydrateSummaryFolders, profile?.id])

  const summary = useMemo(
    () => summaries.find((item) => item.id === summaryId) ?? null,
    [summaries, summaryId]
  )
  const folderName = useMemo(
    () => summaryFolders.find((folder) => folder.itemIds.includes(summaryId))?.name ?? summary?.folder_name ?? 'Summary',
    [summary?.folder_name, summaryFolders, summaryId]
  )

  const handleTranslate = async () => {
    if (!summary) {
      return
    }

    try {
      const translated = await translateSummaryDocument({
        userId: profile?.id,
        summary,
        targetLanguage: getLanguageLabel(targetLanguage),
        folderName,
      })
      setTranslateOpen(false)
      toast.success(`${summary.note_title} translated.`)
      navigate(`/summary/${translated.id}`)
    } catch (error) {
      toast.error(error.message)
    }
  }

  if (!profile) {
    return (
      <div className="panel rounded-[28px] p-6">
        <Loader label="Loading summary..." />
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="panel rounded-[28px] p-6 text-sm text-muted">
        This summary is not available in your summary library yet. Return to Summary and open or create it there.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-main">{summary.note_title}</h1>
          <p className="text-sm text-muted">Summarized from {folderName}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="glass-chip rounded-full px-3 py-2 text-xs font-semibold text-[var(--accent-strong)]">
            {new Date(summary.created_at).toLocaleDateString()}
          </div>
          <div className="relative">
            <Button
              variant="secondary"
              className="h-12 w-12 rounded-full px-0"
              onClick={() => setActionsOpen((open) => !open)}
              aria-label="Summary document actions"
            >
              <MoreHorizontal size={18} />
            </Button>
            {actionsOpen ? (
              <div className="panel absolute right-0 top-14 z-20 flex min-w-[13rem] flex-col rounded-2xl p-2">
                <button
                  type="button"
                  onClick={() => {
                    setActionsOpen(false)
                    navigate(`/note/${summary.note_id}`)
                  }}
                  className="rounded-xl px-3 py-2 text-left text-sm font-medium text-main transition hover:bg-[var(--accent-soft)]"
                >
                  Open source note
                </button>
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
          <Button variant="secondary" onClick={() => navigate('/summary')}>
            Back to summaries
          </Button>
        </div>
      </div>

      <section className="panel rounded-[32px] p-6">
        <div className="panel-soft rounded-[28px] p-5 text-sm leading-8 text-soft whitespace-pre-wrap">
          {summary.summary_text}
        </div>
      </section>

      <Modal open={translateOpen} title="Translate summary" onClose={() => setTranslateOpen(false)}>
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
            Create translated summary
          </Button>
        </div>
      </Modal>
    </div>
  )
}

export default SummaryDetailPage
