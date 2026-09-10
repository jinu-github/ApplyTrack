export const defaultApplications = [
  { id: '1', company: 'Flink', position: 'Frontend Engineer', status: 'Draft', location: 'Remote', appliedDate: '', updatedAt: '2026-09-01', notes: [], timeline: [{ text: 'Application created', date: '2026-09-01' }] },
  { id: '2', company: 'Atolls', position: 'Senior Frontend Engineer', status: 'Applied', location: 'Remote', appliedDate: '2026-08-28', updatedAt: '2026-08-28', notes: [], timeline: [{ text: 'Application submitted', date: '2026-08-28' }] },
  { id: '3', company: 'Redcare Pharmacy', position: 'Senior Fullstack Engineer', status: 'Screening', location: 'Remote', appliedDate: '2026-08-26', updatedAt: '2026-08-30', notes: [], timeline: [{ text: 'Moved to Screening', date: '2026-08-30' }] },
  { id: '4', company: 'Stripe', position: 'Product Engineer', status: 'Interview', location: 'Remote', appliedDate: '2026-08-24', updatedAt: '2026-08-31', notes: ['Prepare for the technical interview.', 'Review React performance concepts.'], timeline: [{ text: 'Technical interview scheduled', date: '2026-09-05' }] }
]

export const statuses = ['Draft', 'Applied', 'Screening', 'Interview', 'Offer', 'Rejected', 'Withdrawn']
