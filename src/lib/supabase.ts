/*
  ============================================================
  SUPABASE CONNECTION — Same setup every project
  ============================================================

  HOW TO USE:
  1. Create a .env.local file with:
     NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

  2. Import in your hooks:
     import { supabase } from '@/lib/supabase'
     const { data } = await supabase.rpc('your_rpc_name', { params })
  ============================================================
*/

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)
