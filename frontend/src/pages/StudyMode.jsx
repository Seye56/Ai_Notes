import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import Button from '../components/ui/Button'
import Loader from '../components/ui/Loader'
import { useAudio } from '../hooks/useAudio'
import { useNoteStore } from '../store/noteStore'
import { useStudyStore } from '../store/studyStore'
import { languageOptions } from '../utils/languageMap'

const StudyMode = () => {
  const { id } = useParams()
  const { selectedNote, fetchNote } = useNoteStore()
  const {
    summary,
    translation,
    audio,
    voices,
    moods,
    loading,
    initializeSpeechOptions,
    summarizeNote,
    translateNote,
    generateSpeech,
  } = useStudyStore()

  const [targetLanguage, setTargetLanguage] = useState('es')
  const [speechForm, setSpeechForm] = useState({
    source_type: 'note',
    gender: 'female',
    mood: 'normal',
    language: 'en',
    voice_id: '',
  })

  const audioSrc = audio?.public_url
  const { play, pause, playing } = useAudio(audioSrc)

  useEffect(() => {
    fetchNote(id).catch((error) => toast.error(error.message))
    initializeSpeechOptions()
  }, [fetchNote, id, initializeSpeechOptions])

  useEffect(() => {
    if (selectedNote?.source_language) {
      setSpeechForm((current) => ({
        ...current,
        language: selectedNote.source_language,
      }))
    }
  }, [selectedNote?.source_language])

  const availableVoices = useMemo(() => voices ?? [], [voices])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-main">Study Mode</h1>
        <p className="text-sm text-muted">Generate summaries, translations, and audio playback from your note.</p>
      </div>

      {!selectedNote ? (
        <div className="panel rounded-[28px] p-6">
          <Loader label="Loading note..." />
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-6">
            <section className="panel rounded-[28px] p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-main">Summary</h2>
                  <p className="text-sm text-muted">Generate a study-ready summary from the note.</p>
                </div>
                <Button
                  onClick={async () => {
                    try {
                      await summarizeNote(id, {})
                      toast.success('Summary generated.')
                    } catch (error) {
                      toast.error(error.message)
                    }
                  }}
                  disabled={loading}
                >
                  Generate
                </Button>
              </div>
              <div className="panel-soft mt-5 rounded-3xl p-5 text-sm leading-7 text-soft whitespace-pre-wrap">
                {summary?.summary_text || 'No summary yet. Generate one from this note.'}
              </div>
            </section>

            <section className="panel rounded-[28px] p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-main">Translation</h2>
                  <p className="text-sm text-muted">Translate the note into another language.</p>
                </div>
                <div className="flex gap-2">
                  <select
                    value={targetLanguage}
                    onChange={(event) => setTargetLanguage(event.target.value)}
                    className="select-field !w-auto !px-3 !py-2 text-sm"
                  >
                    {languageOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <Button
                    onClick={async () => {
                      try {
                        await translateNote(id, { target_language: targetLanguage, translation_type: 'text' })
                        toast.success('Translation ready.')
                      } catch (error) {
                        toast.error(error.message)
                      }
                    }}
                    disabled={loading}
                  >
                    Translate
                  </Button>
                </div>
              </div>
              <div className="panel-soft mt-5 rounded-3xl p-5 text-sm leading-7 text-soft whitespace-pre-wrap">
                {translation?.translated_content || 'No translation yet.'}
              </div>
            </section>
          </div>

          <section className="panel rounded-[28px] p-6 h-fit">
            <h2 className="text-xl font-bold text-main">Speech playback</h2>
            <p className="mt-1 text-sm text-muted">Generate audio for the note using your selected mood and voice.</p>

            <div className="mt-5 space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <select
                  value={speechForm.gender}
                  onChange={(event) => setSpeechForm((current) => ({ ...current, gender: event.target.value }))}
                  className="select-field text-sm"
                >
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </select>
                <select
                  value={speechForm.mood}
                  onChange={(event) => setSpeechForm((current) => ({ ...current, mood: event.target.value }))}
                  className="select-field text-sm"
                >
                  {moods.map((mood) => (
                    <option key={mood.id} value={mood.id}>
                      {mood.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <select
                  value={speechForm.language}
                  onChange={(event) => setSpeechForm((current) => ({ ...current, language: event.target.value }))}
                  className="select-field text-sm"
                >
                  {languageOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  value={speechForm.voice_id}
                  onChange={(event) => setSpeechForm((current) => ({ ...current, voice_id: event.target.value }))}
                  className="select-field text-sm"
                >
                  <option value="">Default voice</option>
                  {availableVoices.map((voice) => (
                    <option key={voice.id} value={voice.id}>
                      {voice.label}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                className="w-full"
                onClick={async () => {
                  try {
                    await generateSpeech({
                      source_type: 'note',
                      source_id: id,
                      gender: speechForm.gender,
                      mood: speechForm.mood,
                      language: speechForm.language,
                      voice_id: speechForm.voice_id || undefined,
                    })
                    toast.success('Audio generated.')
                  } catch (error) {
                    toast.error(error.message)
                  }
                }}
              >
                Generate note audio
              </Button>

              {audioSrc && (
                <div className="panel-soft rounded-3xl p-4 space-y-3">
                  <p className="text-sm text-soft">Audio ready to play.</p>
                  <div className="flex gap-3">
                    <Button onClick={play} disabled={playing}>Play</Button>
                    <Button variant="secondary" onClick={pause}>Pause</Button>
                    <a href={audioSrc} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-2xl border px-4 py-2.5 text-sm font-semibold text-soft" style={{ borderColor: 'var(--border-soft)', background: 'var(--surface)' }}>
                      Open audio
                    </a>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

export default StudyMode
