export type TaskStatus = 'pending' | 'in_progress' | 'completed'
export type TaskPriority = 'low' | 'medium' | 'high'
export type ProjectStatus = 'planning' | 'in_progress' | 'waiting_client' | 'completed' | 'paused'
export type FinancialType = 'income' | 'expense'
export type FinancialStatus = 'pending' | 'paid' | 'received' | 'overdue'

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  user_id: string
  name: string
  company: string | null
  email: string | null
  phone: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  user_id: string
  client_id: string | null
  name: string
  description: string | null
  status: ProjectStatus
  deadline: string | null
  created_at: string
  updated_at: string
  client?: Client | null
}

export interface Task {
  id: string
  user_id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  due_time: string | null
  project_id: string | null
  client_id: string | null
  created_at: string
  updated_at: string
  project?: Project | null
  client?: Client | null
}

export interface FinancialEntry {
  id: string
  user_id: string
  type: FinancialType
  title: string
  description: string | null
  amount: number
  category: string
  status: FinancialStatus
  due_date: string
  paid_at: string | null
  client_id: string | null
  project_id: string | null
  created_at: string
  updated_at: string
  client?: Client | null
  project?: Project | null
}

export interface QuickNote {
  id: string
  user_id: string
  title: string
  content: string | null
  is_pinned: boolean
  client_id: string | null
  project_id: string | null
  created_at: string
  updated_at: string
  client?: Client | null
  project?: Project | null
}

export interface DashboardData {
  todayTasks: Task[]
  overdueTasks: Task[]
  activeProjects: Project[]
  financialSummary: {
    income: number
    expenses: number
    balance: number
    pending: number
  }
  recentNotes: QuickNote[]
}
