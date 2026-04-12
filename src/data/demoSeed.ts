import type { Application, ApplicationType, PromotionType } from '../types'

export interface DemoSeedApplication {
  applicationType: ApplicationType
  promotionType: PromotionType
  status: Application['status']
  department: string
  title: string
  vetPassed: boolean
}

export const DEMO_SEED_APPLICATIONS: DemoSeedApplication[] = [
  {
    applicationType: 'promotion',
    promotionType: 'associate_professor',
    status: 'submitted',
    department: 'Computer Science',
    title: 'AI-driven Assessment in Undergraduate Courses',
    vetPassed: true,
  },
  {
    applicationType: 'contract_renewal',
    promotionType: 'associate_professor',
    status: 'draft',
    department: 'Computer Science',
    title: 'Contract Renewal Report 2026',
    vetPassed: true,
  },
  {
    applicationType: 'self_evaluation',
    promotionType: 'associate_professor',
    status: 'submitted',
    department: 'Computer Science',
    title: 'Annual Self-Evaluation Report 2026',
    vetPassed: true,
  },
]
