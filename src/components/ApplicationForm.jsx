import { useState } from 'react'
import { X } from 'lucide-react'
import { statuses } from '../data/defaultData'

export default function ApplicationForm({
  onClose,
  onSave,
  initialData
}) {

  const isEditing = Boolean(initialData)

  const [form, setForm] = useState({
    company: initialData?.company || '',
    position: initialData?.position || '',
    status: initialData?.status || 'Draft',
    location: initialData?.location || '',
    jobType: initialData?.jobType || '',
    salary: initialData?.salary || '',
    appliedDate: initialData?.appliedDate || '',
    url: initialData?.url || '',
    description: initialData?.description || ''
  })

  const set = (key, value) =>
    setForm((prev) => ({
      ...prev,
      [key]: value
    }))

  const submit = (e) => {
    e.preventDefault()

    if (
      !form.company.trim() ||
      !form.position.trim()
    ) {
      return
    }

    onSave(form)
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={onClose}
    >
      <div
        className="modal"
        onMouseDown={(e) => e.stopPropagation()}
      >

        {/* MODAL HEADER */}

        <div className="modal-header">

          <div>

            <h2>
              {isEditing
                ? 'Edit Application'
                : 'Add Application'}
            </h2>

            <p>
              {isEditing
                ? 'Update the details of this job application.'
                : 'Save a new opportunity to your workspace.'}
            </p>

          </div>

          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={19} />
          </button>

        </div>

        {/* APPLICATION FORM */}

        <form
          onSubmit={submit}
          className="application-form"
        >

          <div className="form-grid">

            <label>
              Company Name *

              <input
                value={form.company}
                onChange={(e) =>
                  set('company', e.target.value)
                }
                placeholder="e.g. Google"
                required
              />

            </label>

            <label>
              Job Position *

              <input
                value={form.position}
                onChange={(e) =>
                  set('position', e.target.value)
                }
                placeholder="e.g. Frontend Developer"
                required
              />

            </label>

            <label>
              Status

              <select
                value={form.status}
                onChange={(e) =>
                  set('status', e.target.value)
                }
              >

                {statuses.map((status) => (
                  <option key={status}>
                    {status}
                  </option>
                ))}

              </select>

            </label>

            <label>
              Location

              <input
                value={form.location}
                onChange={(e) =>
                  set('location', e.target.value)
                }
                placeholder="Remote, Manila, etc."
              />

            </label>

           <label>
            Job Type
            <select
              value={['Full-time','Part-time','Contract','Temporary','Internship','Freelance'].includes(form.jobType) ? form.jobType : (form.jobType ? 'Other' : '')}
              onChange={(e) => set('jobType', e.target.value === 'Other' ? '' : e.target.value)}
            >
              <option value="">Select job type</option>
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract</option>
              <option value="Temporary">Temporary</option>
              <option value="Internship">Internship</option>
              <option value="Freelance">Freelance</option>
              <option value="Other">Other</option>
            </select>
            {!['Full-time','Part-time','Contract','Temporary','Internship','Freelance',''].includes(form.jobType) && (
              <input
                value={form.jobType}
                onChange={(e) => set('jobType', e.target.value)}
                placeholder="Enter job type"
                autoFocus
              />
            )}
          </label>

            <label>
              Salary Range

              <input
                value={form.salary}
                onChange={(e) =>
                  set('salary', e.target.value)
                }
                placeholder="Optional"
              />

            </label>

            <label>
              Application Date

              <input
                type="date"
                value={form.appliedDate}
                onChange={(e) =>
                  set('appliedDate', e.target.value)
                }
              />

            </label>

            <label>
              Job Posting URL

              <input
                type="url"
                value={form.url}
                onChange={(e) =>
                  set('url', e.target.value)
                }
                placeholder="https://..."
              />

            </label>

          </div>

          <label>
            Job Description

            <textarea
              rows="4"
              value={form.description}
              onChange={(e) =>
                set('description', e.target.value)
              }
              placeholder="Optional details about the role..."
            />

          </label>

          {/* ACTIONS */}

          <div className="modal-actions">

            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              className="primary-button"
              type="submit"
            >
              {isEditing
                ? 'Save Changes'
                : 'Save Application'}
            </button>

          </div>

        </form>

      </div>
    </div>
  )
}