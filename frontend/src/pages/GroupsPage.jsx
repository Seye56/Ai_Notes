import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { MoreHorizontal, Plus } from 'lucide-react'
import Button from '../components/ui/Button'
import Loader from '../components/ui/Loader'
import Modal from '../components/ui/Modal'
import { useStudyStore } from '../store/studyStore'
import { useUserStore } from '../store/userStore'

const tileColorMap = {
  blue: 'linear-gradient(135deg, rgba(125, 211, 252, 0.46), rgba(191, 219, 254, 0.28))',
  pink: 'linear-gradient(135deg, rgba(249, 168, 212, 0.42), rgba(251, 207, 232, 0.24))',
  yellow: 'linear-gradient(135deg, rgba(253, 224, 71, 0.42), rgba(254, 240, 138, 0.28))',
  mint: 'linear-gradient(135deg, rgba(134, 239, 172, 0.42), rgba(209, 250, 229, 0.22))',
  purple: 'linear-gradient(135deg, rgba(196, 181, 253, 0.44), rgba(221, 214, 254, 0.26))',
}

const tileColors = ['purple', 'blue', 'pink', 'yellow', 'mint']

const GroupsPage = () => {
  const navigate = useNavigate()
  const { profile } = useUserStore()
  const { groups, loading, fetchGroups, createGroup } = useStudyStore()
  const [createOpen, setCreateOpen] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [groupLanguage, setGroupLanguage] = useState(profile?.preferred_language ?? 'en')

  useEffect(() => {
    fetchGroups().catch(() => {})
  }, [fetchGroups])

  useEffect(() => {
    if (profile?.preferred_language) {
      setGroupLanguage(profile.preferred_language)
    }
  }, [profile?.preferred_language])

  const handleCreateGroup = async () => {
    try {
      const group = await createGroup({
        name: groupName,
        default_language: groupLanguage,
      })
      setGroupName('')
      setCreateOpen(false)
      toast.success('Group created.')
      navigate(`/groups/${group.id}`)
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-main">Groups</h1>
          <p className="text-sm text-muted">Create shared note rooms and open each one as its own live collaboration space.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button className="h-12 w-12 rounded-full px-0" onClick={() => setCreateOpen(true)} aria-label="Create group">
            <Plus size={20} />
          </Button>
          <div className="relative">
            <Button
              variant="secondary"
              className="h-12 w-12 rounded-full px-0"
              onClick={() => setActionsOpen((open) => !open)}
              aria-label="Group actions"
            >
              <MoreHorizontal size={18} />
            </Button>
            {actionsOpen ? (
              <div className="panel absolute right-0 top-14 z-20 flex min-w-[13rem] flex-col rounded-2xl p-2">
                <button
                  type="button"
                  onClick={() => {
                    setActionsOpen(false)
                    navigate('/groups')
                  }}
                  className="rounded-xl px-3 py-2 text-left text-sm font-medium text-main transition hover:bg-[var(--accent-soft)]"
                >
                  Show all groups
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="panel rounded-[28px] p-6">
          <Loader label="Loading groups..." />
        </div>
      ) : (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {groups.length ? (
            groups.map((group, index) => (
              <button
                key={group.id}
                type="button"
                onClick={() => navigate(`/groups/${group.id}`)}
                className="rounded-[28px] border p-5 text-left transition hover:-translate-y-1"
                style={{
                  background: tileColorMap[tileColors[index % tileColors.length]],
                  borderColor: 'var(--border-soft)',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold text-main">{group.name}</p>
                    <p className="mt-1 text-sm text-muted">
                      Open the room to chat, collaborate live, and share translated updates.
                    </p>
                  </div>
                  <div className="glass-chip rounded-full px-3 py-2 text-xs font-semibold text-[var(--accent-strong)]">
                    {group.default_language.toUpperCase()}
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="panel rounded-[28px] p-6 text-sm text-muted">
              No groups yet. Use the plus button to create a shared study room here.
            </div>
          )}
        </section>
      )}

      <Modal open={createOpen} title="Create group" onClose={() => setCreateOpen(false)}>
        <div className="space-y-4">
          <input
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
            placeholder="Group name"
            className="input-field"
          />
          <Button className="w-full" onClick={handleCreateGroup}>
            Create group
          </Button>
        </div>
      </Modal>
    </div>
  )
}

export default GroupsPage
