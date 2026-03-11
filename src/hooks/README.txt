HOOKS FOLDER
============

This is where you create hooks to connect pages to Supabase.

Each hook is a messenger — it calls an RPC and returns data.

EXAMPLE:
--------
// hooks/useJobStats.ts

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function useJobStats() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase.rpc('get_job_stats')
      .then(({ data, error }) => {
        if (error) setError(error)
        else setData(data)
        setLoading(false)
      })
  }, [])

  return { data, loading, error }
}

THEN ON THE PAGE:
-----------------
// Replace the DEMO_DATA with:
const { data: stats, loading } = useJobStats()

// And use stats.revenue, stats.active_jobs etc. in the StatCard blocks.

NAMING CONVENTION:
------------------
useContacts.ts      — list of contacts
useContact.ts       — single contact by ID
useJobs.ts          — list of jobs
useJob.ts           — single job by ID
useJobStats.ts      — dashboard stats
useSchedule.ts      — calendar events
useInventory.ts     — stock levels
useQuotes.ts        — list of quotes
useTeam.ts          — staff members
useReports.ts       — financial data
