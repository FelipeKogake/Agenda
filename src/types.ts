export const ACTIVITY_TYPES = ['tarefa', 'licao', 'trabalho', 'evento'] as const
export type ActivityType = (typeof ACTIVITY_TYPES)[number]

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  tarefa: 'Tarefa',
  licao: 'Lição',
  trabalho: 'Trabalho',
  evento: 'Evento',
}

export const ACTIVITY_TYPE_COLORS: Record<ActivityType, string> = {
  tarefa: '#1877cc',
  licao: '#1fa971',
  trabalho: '#e08a1f',
  evento: '#b23ec2',
}

export type Activity = {
  id: string
  title: string
  description: string
  type: ActivityType
  date: string // formato YYYY-MM-DD
  time: string | null // formato HH:MM
  turmaId: string
  createdAt?: { toDate: () => Date } | null
  updatedAt?: { toDate: () => Date } | null
}

export type ActivityInput = Omit<Activity, 'id'>

export type AdminRole = 'representante' | 'superadmin'

export type AdminProfile = {
  role: AdminRole
  turmaId?: string
}

export const SUGGESTION_STATUSES = ['pendente', 'aprovada', 'rejeitada'] as const
export type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number]

export const SUGGESTION_STATUS_LABELS: Record<SuggestionStatus, string> = {
  pendente: 'Pendente',
  aprovada: 'Aprovada',
  rejeitada: 'Rejeitada',
}

export type Suggestion = {
  id: string
  title: string
  description: string
  type: ActivityType
  date: string
  time: string | null
  turmaId: string
  status: SuggestionStatus
}

export type SuggestionInput = Omit<Suggestion, 'id' | 'status'>

export type Feedback = {
  id: string
  message: string
  turmaId: string | null
  createdAt: { toDate: () => Date } | null
}
