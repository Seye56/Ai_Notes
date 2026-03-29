import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { MoreHorizontal } from 'lucide-react'
import Button from '../components/ui/Button'
import Loader from '../components/ui/Loader'
import Modal from '../components/ui/Modal'
import { useStudyStore } from '../store/studyStore'
import { useUserStore } from '../store/userStore'

const PRESENCE_COLORS = [
  { border: '#7c3aed', bg: 'rgba(124, 58, 237, 0.14)', text: '#6d28d9' },
  { border: '#2563eb', bg: 'rgba(37, 99, 235, 0.14)', text: '#1d4ed8' },
  { border: '#db2777', bg: 'rgba(219, 39, 119, 0.14)', text: '#be185d' },
  { border: '#059669', bg: 'rgba(5, 150, 105, 0.14)', text: '#047857' },
  { border: '#ea580c', bg: 'rgba(234, 88, 12, 0.14)', text: '#c2410c' },
]

const EDITOR_PADDING_X = 18
const EDITOR_PADDING_Y = 16
const LINE_HEIGHT = 24
const CHAR_WIDTH = 9

const getPresenceDisplayName = (presence, members) => {
  const member = members.find((item) => item.user_id === presence.user_id)
  return member?.full_name || member?.email || String(presence.user_id).slice(0, 8)
}

const computeWrappedLineColumn = (text, position, maxCharsPerLine) => {
  let line = 0
  let column = 0
  const safePosition = Math.max(0, Math.min(position ?? 0, text.length))

  for (let index = 0; index < safePosition; index += 1) {
    const character = text[index]
    if (character === '\n') {
      line += 1
      column = 0
      continue
    }

    column += 1
    if (column >= maxCharsPerLine) {
      line += 1
      column = 0
    }
  }

  return { line, column }
}

const buildSelectionBlocks = (text, selectionStart, selectionEnd, maxCharsPerLine) => {
  if (
    selectionStart == null ||
    selectionEnd == null ||
    selectionStart === selectionEnd ||
    selectionStart > selectionEnd
  ) {
    return []
  }

  const blocks = []
  let blockStart = selectionStart

  while (blockStart < selectionEnd) {
    const startPoint = computeWrappedLineColumn(text, blockStart, maxCharsPerLine)
    let blockEnd = blockStart

    while (blockEnd < selectionEnd) {
      const nextPoint = computeWrappedLineColumn(text, blockEnd + 1, maxCharsPerLine)
      if (nextPoint.line !== startPoint.line) {
        break
      }
      blockEnd += 1
    }

    const endPoint = computeWrappedLineColumn(text, blockEnd, maxCharsPerLine)
    const widthChars = Math.max(1, endPoint.column - startPoint.column + 1)

    blocks.push({
      line: startPoint.line,
      column: startPoint.column,
      widthChars,
    })

    blockStart = blockEnd + 1
  }

  return blocks
}

const GroupDetailPage = () => {
  const navigate = useNavigate()
  const { groupId } = useParams()
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
    selectGroup,
    addGroupMember,
    connectGroupSocket,
    disconnectGroupSocket,
    sendSocketEvent,
  } = useStudyStore()

  const [socketLanguage, setSocketLanguage] = useState(profile?.preferred_language ?? 'en')
  const [liveText, setLiveText] = useState('')
  const [cursorPosition, setCursorPosition] = useState(0)
  const [inviteEmail, setInviteEmail] = useState('')
  const [memberActionsOpen, setMemberActionsOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editorMetrics, setEditorMetrics] = useState({ width: 0, maxCharsPerLine: 1 })
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

  useEffect(() => {
    const updateMetrics = () => {
      const width = editorRef.current?.clientWidth ?? 0
      const usableWidth = Math.max(width - EDITOR_PADDING_X * 2, CHAR_WIDTH)
      const maxCharsPerLine = Math.max(1, Math.floor(usableWidth / CHAR_WIDTH))
      setEditorMetrics({ width, maxCharsPerLine })
    }

    updateMetrics()
    window.addEventListener('resize', updateMetrics)
    return () => window.removeEventListener('resize', updateMetrics)
  }, [])

  useEffect(() => {
    const matchedGroup = groups.find((group) => group.id === groupId)
    if (matchedGroup) {
      selectGroup(matchedGroup).catch?.(() => {})
    }
  }, [groupId, groups, selectGroup])

  const currentGroup = activeGroup?.id === groupId ? activeGroup : groups.find((group) => group.id === groupId) ?? null
  const remotePresence = useMemo(
    () => groupPresence.filter((presence) => presence.user_id !== profile?.id),
    [groupPresence, profile?.id]
  )
  const presenceDecorations = useMemo(
    () =>
      remotePresence.map((presence, index) => {
        const color = PRESENCE_COLORS[index % PRESENCE_COLORS.length]
        const point = computeWrappedLineColumn(liveText, presence.cursor_position ?? 0, editorMetrics.maxCharsPerLine)
        const selectionBlocks = buildSelectionBlocks(
          liveText,
          presence.selection_start,
          presence.selection_end,
          editorMetrics.maxCharsPerLine
        )

        return {
          ...presence,
          color,
          name: getPresenceDisplayName(presence, groupMembers),
          point,
          selectionBlocks,
        }
      }),
    [editorMetrics.maxCharsPerLine, groupMembers, liveText, remotePresence]
  )

  if (loading && !currentGroup) {
    return (
      <div className="panel rounded-[28px] p-6">
        <Loader label="Loading group..." />
      </div>
    )
  }

  if (!currentGroup) {
    return (
      <div className="panel rounded-[28px] p-8 text-sm text-muted">
        This group is not available right now. Return to Groups and open a room from there.
      </div>
    )
  }

  const handleInviteMember = async () => {
    try {
      await addGroupMember(currentGroup.id, {
        email: inviteEmail,
        role: 'member',
      })
      setInviteEmail('')
      setInviteOpen(false)
      toast.success('Member added to the group.')
    } catch (error) {
      toast.error(error.message)
    }
  }

  const liveMessageIsBlank = !liveText.trim()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-main">{currentGroup.name}</h1>
          <p className="text-sm text-muted">
            Socket status: {socketStatus} • language {socketLanguage.toUpperCase()}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => {
              connectGroupSocket({
                groupId: currentGroup.id,
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
          <Button variant="secondary" onClick={() => navigate('/groups')}>
            Back to groups
          </Button>
        </div>
      </div>

      <div className="panel rounded-[28px] p-6 space-y-5">
        <div className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
          <div className="panel-soft rounded-3xl p-4">
            <p className="text-sm font-semibold text-soft">Live editor</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {presenceDecorations.length ? (
                presenceDecorations.map((presence) => (
                  <div
                    key={presence.user_id}
                    className="group-presence-pill"
                    style={{
                      borderColor: presence.color.border,
                      background: presence.color.bg,
                      color: presence.color.text,
                    }}
                  >
                    <span
                      className="group-presence-pill-dot"
                      style={{ background: presence.color.border }}
                    />
                    {presence.name}
                    {presence.is_typing ? ' typing' : ` cursor ${presence.cursor_position ?? 0}`}
                  </div>
                ))
              ) : (
                <div className="text-xs text-muted">Connect more members to see live names, cursors, and selections here.</div>
              )}
            </div>
            <div className="group-editor-shell mt-3">
              {presenceDecorations.map((presence) =>
                presence.selectionBlocks.map((block, blockIndex) => (
                  <div
                    key={`${presence.user_id}-selection-${blockIndex}`}
                    className="group-selection-highlight"
                    style={{
                      left: `${EDITOR_PADDING_X + block.column * CHAR_WIDTH}px`,
                      top: `${EDITOR_PADDING_Y + block.line * LINE_HEIGHT}px`,
                      width: `${Math.max(CHAR_WIDTH, block.widthChars * CHAR_WIDTH)}px`,
                      height: `${LINE_HEIGHT}px`,
                      background: presence.color.bg,
                      borderColor: presence.color.border,
                    }}
                  />
                ))
              )}
              {presenceDecorations.map((presence) => (
                <div
                  key={`${presence.user_id}-cursor`}
                  className="group-cursor-marker"
                  style={{
                    left: `${EDITOR_PADDING_X + presence.point.column * CHAR_WIDTH}px`,
                    top: `${EDITOR_PADDING_Y + presence.point.line * LINE_HEIGHT}px`,
                  }}
                >
                  <span
                    className="group-cursor-marker-line"
                    style={{ background: presence.color.border }}
                  />
                  <span
                    className="group-cursor-marker-label"
                    style={{
                      background: presence.color.border,
                      color: '#fff',
                    }}
                  >
                    {presence.name}
                  </span>
                </div>
              ))}
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
                className="textarea-field group-editor-textarea min-h-[240px] w-full rounded-[24px] font-mono"
                placeholder="Type a live group note here, then send it to connected members."
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
              <Button
                onClick={() => {
                  if (liveMessageIsBlank) {
                    toast.error('Type a message before sending it.')
                    return
                  }
                  sendSocketEvent({
                    original_text: liveText,
                    original_language: currentGroup.default_language,
                    event_type: 'live_note',
                  })
                  setLiveText('')
                  toast.success('Live note sent.')
                }}
                disabled={liveMessageIsBlank}
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
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-soft">Members</p>
                <div className="relative">
                  <Button
                    variant="secondary"
                    className="h-10 w-10 rounded-full px-0"
                    onClick={() => setMemberActionsOpen((open) => !open)}
                    aria-label="Member actions"
                  >
                    <MoreHorizontal size={16} />
                  </Button>
                  {memberActionsOpen ? (
                    <div className="panel absolute right-0 top-12 z-20 flex min-w-[12rem] flex-col rounded-2xl p-2">
                      <button
                        type="button"
                        onClick={() => {
                          setMemberActionsOpen(false)
                          setInviteOpen(true)
                        }}
                        className="rounded-xl px-3 py-2 text-left text-sm font-medium text-main transition hover:bg-[var(--accent-soft)]"
                      >
                        Invite by email
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {groupMembers.map((member) => (
                  <div key={member.id} className="rounded-2xl px-4 py-3 text-sm text-soft" style={{ background: 'var(--surface)' }}>
                    {member.full_name || member.email || member.user_id} • {member.role}
                  </div>
                ))}
              </div>
            </div>
            <div className="panel-soft rounded-3xl p-4">
              <p className="text-sm font-semibold text-soft">Live cursors</p>
              <div className="mt-3 space-y-2">
                {presenceDecorations.map((presence) => (
                  <div
                    key={presence.id ?? presence.user_id}
                    className="rounded-2xl border px-4 py-3 text-sm"
                    style={{
                      background: 'var(--surface)',
                      borderColor: presence.color.border,
                      color: 'var(--text-soft)',
                    }}
                  >
                    <span className="font-semibold" style={{ color: presence.color.text }}>
                      {presence.name}
                    </span>
                    {` • cursor ${presence.cursor_position ?? 0}`}
                    {presence.is_typing ? ' • typing' : ''}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal open={inviteOpen} title="Invite by email" onClose={() => setInviteOpen(false)}>
        <div className="space-y-4">
          <input
            type="email"
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
            placeholder="teammate@example.com"
            className="input-field"
          />
          <Button className="w-full" onClick={handleInviteMember}>
            Add member
          </Button>
        </div>
      </Modal>

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
    </div>
  )
}

export default GroupDetailPage
