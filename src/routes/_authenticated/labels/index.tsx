import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Labels } from '@/features/labels'

const labelsSearchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(10),
  // Per-column text filter (example for name)
  name: z.string().optional().catch(''),
})

export const Route = createFileRoute('/_authenticated/labels/')({
  validateSearch: labelsSearchSchema,
  component: Labels,
})