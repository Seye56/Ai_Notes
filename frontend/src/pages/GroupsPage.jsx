import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import Button from '../components/ui/Button'
import Loader from '../components/ui/Loader'
import { useStudyStore } from '../store/studyStore'
import { useUserStore } from '../store/userStore'
import { languageOptions } from '../utils/languageMap'

const GroupsPage = () => {
  const { profile } = useUserStore()
  const {
    groups,
    activeGroup,
    groupMembers,
    groupEvents,
    groupPresence,
    socketStatus,
    loading,
    fetchGroups,
    createGroup,
    selectGroup,
    connectGroupSocket,
    disconnectGroupSocket,
    sendSocketEvent,
  } = useStudyStore()

  const [groupName, setGroupName] = useState('')
  const [groupLanguage, setGroupLanguage] = useState('en')
  const [socketLanguage, setSocketLanguage] = useState(profile?.preferred_language ?? 'en')
  const [liveText, setLiveText] = useState('')
  const [cursorPosition, setCursorPosition] = useState(0)
  const editorRef = useRef(null)

  useEffect(() => {
    fetchGroups().catch(() => {})
  }, [fetchGroups])

  useEffect(() => {
    if (profile?.preferred_language) {
      setSocketLanguage(profile.preferred_language)
    }
  }, [profile?.preferred_language])

  useEffect(() => {
    return () => disconnectGroupSocket()
  }, [disconnectGroupSocket])

  return (
    <div className="grid gap-6 xl:grid-cols-[340px,1fr]">
      <aside className="space-y-6">
        <div className="panel rounded-[28px] p-6">
          <h1 className="text-2xl font-bold text-main">Groups</h1>
          <p className="mt-1 text-sm text-muted">Create shared note rooms and collaborate live.</p>
          <div className="mt-5 space-y-3">
            <input
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              placeholder="Group name"
              className="input-field"
            />
            <select
              value={groupLanguage}
              onChange={(event) => setGroupLanguage(event.target.value)}
              className="select-field"
            >
              {languageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Button
              className="w-full"
              onClick={async () => {
                try {
                  const group = await createGroup({
                    name: groupName,
                    default_language: groupLanguage,
                  })
                  setGroupName('')
                  await selectGroup(group)
                  toast.success('Group created.')
                } catch (error) {
                  toast.error(error.message)
                }
              }}
            >
              Create group
            </Button>
          </div>
        </div>

        <div className="panel rounded-[28px] p-4 space-y-3">
          {loading ? (
            <Loader label="Loading groups..." />
          ) : (
            groups.map((group) => (
              <button
                key={group.id}
                onClick={() => selectGroup(group)}
                className={`w-full rounded-2xl px-4 py-4 text-left transition ${
                  activeGroup?.id === group.id
                    ? 'text-[var(--accent-strong)]'
                    : 'text-soft'
                }`}
                style={{
                  background: activeGroup?.id === group.id ? 'var(--accent-soft)' : 'var(--surface-muted)',
                }}
              >
                <p className="font-semibold">{group.name}</p>
                <p className="text-xs opacity-70">{group.default_language.toUpperCase()}</p>
              </button>
            ))
          )}
        </div>
      </aside>

      <section className="space-y-6">
        {!activeGroup ? (
          <div className="panel rounded-[28px] p-8 text-sm text-muted">
            Pick a group to view members, events, and the live collaboration socket.
          </div>
        ) : (
          <>
            <div className="panel rounded-[28px] p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-main">{activeGroup.name}</h2>
                  <p className="text-sm text-muted">Socket status: {socketStatus}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <select
                    value={socketLanguage}
                    onChange={(event) => setSocketLanguage(event.target.value)}
                    className="select-field"
                  >
                    {languageOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <Button
                    onClick={() => {
                      connectGroupSocket({
                        groupId: activeGroup.id,
                        language: socketLanguage,
                      })
                      toast.success('Socket connected.')
                    }}
                  >
                    Connect socket
                  </Button>
                  <Button variant="secondary" onClick={disconnectGroupSocket}>
                    Disconnect
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
                <div className="panel-soft rounded-3xl p-4">
                  <p className="text-sm font-semibold text-soft">Live editor</p>
                  <textarea
                    ref={editorRef}
                    value={liveText}
                    onChange={(event) => {
                      const value = event.target.value
                      setLiveText(value)
                      const nextCursor = event.target.selectionStart ?? value.length
                      setCursorPosition(nextCursor)
                      sendSocketEvent({
                        type: 'presence_update',
                        cursor_position: nextCursor,
                        selection_start: event.target.selectionStart,
                        selection_end: event.target.selectionEnd,
                        is_typing: true,
                      })
                    }}
                    onSelect={(event) => {
                      sendSocketEvent({
                        type: 'presence_update',
                        cursor_position: event.target.selectionStart,
                        selection_start: event.target.selectionStart,
                        selection_end: event.target.selectionEnd,
                        is_typing: false,
                      })
                    }}
                    className="textarea-field mt-3 min-h-[240px] w-full rounded-[24px]"
                    placeholder="Type a live group note here, then send it to connected members."
                  />
                  <div className="mt-3 flex flex-wrap gap-3">
                    <Button
                      onClick={() => {
                        sendSocketEvent({
                          original_text: liveText,
                          original_language: activeGroup.default_language,
                          event_type: 'live_note',
                        })
                        setLiveText('')
                        toast.success('Live note sent.')
                      }}
                    >
                      Send live note
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        sendSocketEvent({
                          type: 'presence_update',
                          cursor_position: cursorPosition,
                          selection_start: cursorPosition,
                          selection_end: cursorPosition,
                          is_typing: false,
                        })
                      }
                    >
                      Sync cursor
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-3xl bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-soft">Members</p>
                    <div className="mt-3 space-y-2">
                      {groupMembers.map((member) => (
                        <div key={member.id} className="rounded-2xl px-4 py-3 text-sm text-soft" style={{ background: 'var(--surface)' }}>
                          {member.user_id} • {member.role}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="panel-soft rounded-3xl p-4">
                    <p className="text-sm font-semibold text-soft">Live cursors</p>
                    <div className="mt-3 space-y-2">
                      {groupPresence.map((presence) => (
                        <div key={presence.id ?? presence.user_id} className="rounded-2xl px-4 py-3 text-sm text-soft" style={{ background: 'var(--surface)' }}>
                          {presence.user_id} • cursor {presence.cursor_position ?? 0}
                          {presence.is_typing ? ' • typing' : ''}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="panel rounded-[28px] p-6">
              <h3 className="text-lg font-bold text-main">Live event feed</h3>
              <div className="mt-4 space-y-3">
                {groupEvents.map((event, index) => (
                  <div key={event.event_id ?? event.id ?? index} className="panel-soft rounded-2xl px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--accent)]">{event.translated_language ?? event.original_language}</p>
                    <p className="mt-2 text-sm leading-7 text-soft whitespace-pre-wrap">
                      {event.translated_text ?? event.original_text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

export default GroupsPage
