'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TaskCard } from '@/components/tasks/TaskCard'
import { EditTaskDialog } from '@/components/tasks/EditTaskDialog'
import type { Task, Client, Project } from '@/types'

interface EditableTaskCardProps {
  task: Task
  clients: Client[]
  projects: Project[]
}

/**
 * TaskCard + its own edit dialog, usable from Server Components (e.g. the
 * dashboard) that can't hold the client-side dialog state themselves.
 * Delete/toggle keep TaskCard's built-in fallbacks (server action +
 * revalidatePath); after an edit we refresh so the RSC data updates in place.
 */
export function EditableTaskCard({ task, clients, projects }: EditableTaskCardProps) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)

  return (
    <>
      <TaskCard task={task} onEdit={() => setEditOpen(true)} />
      <EditTaskDialog
        task={editOpen ? task : null}
        open={editOpen}
        onOpenChange={setEditOpen}
        clients={clients}
        projects={projects}
        onSuccess={() => router.refresh()}
      />
    </>
  )
}
