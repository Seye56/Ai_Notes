import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { MoreHorizontal } from 'lucide-react'
import Button from '../components/ui/Button'
import Loader from '../components/ui/Loader'
import Modal from '../components/ui/Modal'
import { useStudyStore } from '../store/studyStore'
import { useUserStore } from '../store/userStore'

const getMemberDisplay = (senderId, members) => {
  const member = members.find((item) => item.user_id === senderId)
  return member?.full_name || member?.email || String(senderId).slice(0, 8)
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
    socketStatus,
    loading,
    fetchGroups,
    selectGroup,
    addGroupMember,
    createGroupEvent,
    connectGroupSocket,
    disconnectGroupSocket,
    sendSocketEvent,
  } = useStudyStore()

  const [socketLanguage, setSocketLanguage] = useState(profile?.preferred_language ?? 'en')
  const [liveText, setLiveText] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [memberActionsOpen, setMemberActionsOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const chatEndRef = useRef(null)

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
    const matchedGroup = groups.find((group) => group.id === groupId)
    if (matchedGroup) {
      selectGroup(matchedGroup).catch?.(() => {})
    }
  }, [groupId, groups, selectGroup])

  const currentGroup = activeGroup?.id === groupId ? activeGroup : groups.find((group) => group.id === groupId) ?? null
  const messageLanguage = profile?.preferred_language ?? currentGroup?.default_language ?? 'en'

  useEffect(() => {
    if (!currentGroup?.id || !socketLanguage) {
      return
    }

    connectGroupSocket({
      groupId: currentGroup.id,
      language: socketLanguage,
    })

    return () => {
      disconnectGroupSocket()
    }
  }, [connectGroupSocket, currentGroup?.id, disconnectGroupSocket, socketLanguage])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [groupEvents])

  const renderedEvents = useMemo(
    () =>
      groupEvents.map((event, index) => {
        const senderId = event.sender_id ?? event.recipient_user_id
        const isOwnMessage = senderId === profile?.id
        const senderLabel = getMemberDisplay(senderId, groupMembers)

        return {
          id: event.event_id ?? event.id ?? `${senderId}-${index}`,
          senderId,
          senderLabel,
          isOwnMessage,
          message: event.translated_text ?? event.original_text,
          language: event.translated_language ?? event.original_language,
          createdAt: event.created_at,
        }
      }),
    [groupEvents, groupMembers, profile?.id]
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

  const handleSendMessage = async () => {
    if (liveMessageIsBlank) {
      toast.error('Type a message before sending it.')
      return
    }

    const payload = {
      original_text: liveText,
      original_language: messageLanguage,
      event_type: 'live_note',
    }

    const sentOverSocket = sendSocketEvent(payload)

    if (sentOverSocket) {
      setLiveText('')
      toast.success('Message sent.')
      return
    }

    try {
      await createGroupEvent(currentGroup.id, payload)
      await selectGroup(currentGroup)
      setLiveText('')
      toast.success('Message sent.')
    } catch (error) {
      toast.error(error.message)
    }
  }

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
          <div className="glass-chip rounded-full px-4 py-3 text-sm font-medium text-main">
            Live language {socketLanguage.toUpperCase()}
          </div>
          <Button variant="secondary" onClick={() => navigate('/groups')}>
            Back to groups
          </Button>
        </div>
      </div>

      <div className="panel rounded-[28px] p-6 space-y-5">
        <div className="grid gap-4 lg:grid-cols-[1.65fr,0.85fr]">
          <div className="panel-soft flex min-h-[34rem] flex-col rounded-3xl p-4">
            <div className="border-b pb-3" style={{ borderColor: 'var(--border-soft)' }}>
              <p className="text-sm font-semibold text-soft">Chat history</p>
              <p className="mt-1 text-xs text-muted">Messages appear in your settings language automatically.</p>
            </div>

            <div className="mt-4 flex-1 space-y-4 overflow-y-auto pr-2">
              {renderedEvents.length ? (
                renderedEvents.map((event) => (
                  <div
                    key={event.id}
                    className={`flex items-end gap-3 ${event.isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    {!event.isOwnMessage ? (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-bold text-[var(--accent-strong)]">
                        {event.senderLabel[0]?.toUpperCase() ?? 'G'}
                      </div>
                    ) : null}
                    <div
                      className={`max-w-[78%] rounded-[24px] px-4 py-3 shadow-sm ${event.isOwnMessage ? 'text-white' : 'border text-main'}`}
                      style={
                        event.isOwnMessage
                          ? { background: 'linear-gradient(135deg, var(--accent) 0%, #ec4899 100%)' }
                          : { background: 'var(--surface)', borderColor: 'var(--border-soft)' }
                      }
                    >
                      <div className={`text-xs font-semibold ${event.isOwnMessage ? 'text-white/85' : 'text-[var(--accent-strong)]'}`}>
                        {event.senderLabel}
                      </div>
                      <p className={`mt-1 whitespace-pre-wrap text-sm leading-7 ${event.isOwnMessage ? 'text-white' : 'text-soft'}`}>
                        {event.message}
                      </p>
                      <div className={`mt-2 text-[11px] ${event.isOwnMessage ? 'text-white/70' : 'text-muted'}`}>
                        {event.language?.toUpperCase()} • {new Date(event.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </div>
                    </div>
                    {event.isOwnMessage ? (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-bold text-[var(--accent-strong)]">
                        {(profile?.full_name?.[0] ?? profile?.email?.[0] ?? 'Y').toUpperCase()}
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted">
                  No messages yet. Start the conversation below.
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="mt-4 rounded-[28px] border p-3" style={{ borderColor: 'var(--border-soft)', background: 'var(--surface)' }}>
              <textarea
                value={liveText}
                onChange={(event) => setLiveText(event.target.value)}
                className="textarea-field min-h-[6.5rem] w-full border-0 bg-transparent p-0 shadow-none focus:shadow-none"
                placeholder="Type a message here..."
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xs text-muted">Sending in {messageLanguage.toUpperCase()}</p>
                <Button
                  onClick={handleSendMessage}
                  disabled={liveMessageIsBlank}
                >
                  Send
                </Button>
              </div>
            </div>
          </div>

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
                <div key={member.id} className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-soft" style={{ background: 'var(--surface)' }}>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] font-bold text-[var(--accent-strong)]">
                    {(member.full_name?.[0] ?? member.email?.[0] ?? 'G').toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-main">{member.full_name || member.email || member.user_id}</div>
                    <div className="text-xs text-muted">{member.role}</div>
                  </div>
                </div>
              ))}
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
    </div>
  )
}

export default GroupDetailPage
