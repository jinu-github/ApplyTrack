import { useMemo, useState } from 'react'
import {
  Plus,
  Search,
  X,
  ArrowDownUp
} from 'lucide-react'

import ApplicationCard from '../components/ApplicationCard'
import { statuses } from '../data/defaultData'

export default function Applications({
  applications,
  onAdd,
  onOpen,
  onEdit
}) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [sortBy, setSortBy] = useState('newest')

  const filteredApplications = useMemo(() => {
    let results = [...applications]

    // SEARCH
    if (search.trim()) {
      const query = search.toLowerCase().trim()

      results = results.filter((application) =>
        application.company?.toLowerCase().includes(query) ||
        application.position?.toLowerCase().includes(query) ||
        application.location?.toLowerCase().includes(query)
      )
    }

    // STATUS FILTER
    if (statusFilter !== 'All') {
      results = results.filter(
        (application) =>
          application.status === statusFilter
      )
    }

    // SORTING
    results.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.appliedDate) - new Date(b.appliedDate)

        case 'company':
          return a.company.localeCompare(b.company)

        case 'position':
          return a.position.localeCompare(b.position)

        case 'newest':
        default:
          return new Date(b.appliedDate) - new Date(a.appliedDate)
      }
    })

    return results
  }, [
    applications,
    search,
    statusFilter,
    sortBy
  ])

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('All')
    setSortBy('newest')
  }

  const hasFilters =
    search ||
    statusFilter !== 'All' ||
    sortBy !== 'newest'

  return (
    <>
      {/* PAGE HEADER */}
      <section className="page-heading">

        <div>
          <p className="eyebrow">
            JOB APPLICATIONS
          </p>

          <h1>
            Applications
          </h1>

          <p>
            Manage and track every opportunity.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={onAdd}
        >
          <Plus size={18} />
          Add Application
        </button>

      </section>

      {/* SEARCH & FILTER BAR */}
      <section className="application-filters">

        <div className="application-search">

          <Search size={18} />

          <input
            type="text"
            placeholder="Search company, position, or location..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />

          {search && (
            <button
              className="clear-search-button"
              onClick={() =>
                setSearch('')
              }
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}

        </div>

        <div className="filter-controls">

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
          >
            <option value="All">
              All Statuses
            </option>

            {statuses.map((status) => (
              <option
                key={status}
                value={status}
              >
                {status}
              </option>
            ))}

          </select>

          <div className="sort-select">

            <ArrowDownUp size={16} />

            <select
              value={sortBy}
              onChange={(event) =>
                setSortBy(event.target.value)
              }
            >
              <option value="newest">
                Newest First
              </option>

              <option value="oldest">
                Oldest First
              </option>

              <option value="company">
                Company A–Z
              </option>

              <option value="position">
                Position A–Z
              </option>

            </select>

          </div>

          {hasFilters && (

            <button
              className="clear-filters-button"
              onClick={clearFilters}
            >
              <X size={16} />
              Clear
            </button>

          )}

        </div>

      </section>

      {/* RESULTS COUNT */}
      <div className="application-results-info">

        <span>
          Showing{' '}
          <strong>
            {filteredApplications.length}
          </strong>{' '}
          of{' '}
          <strong>
            {applications.length}
          </strong>{' '}
          applications
        </span>

      </div>

      {/* APPLICATION LIST */}
      {filteredApplications.length > 0 ? (

        <div className="applications-list">

          {filteredApplications.map(
            (application) => (

              <ApplicationCard
                key={application.id}
                application={application}
                onClick={() =>
                  onOpen(application.id)
                }
              />

            )
          )}

        </div>

      ) : (

        <div className="empty-state no-results">

          <Search size={38} />

          <h2>
            No applications found
          </h2>

          <p>
            Try changing your search or filters.
          </p>

          {hasFilters && (

            <button
              className="secondary-button"
              onClick={clearFilters}
            >
              Clear Filters
            </button>

          )}

        </div>

      )}

    </>
  )
}