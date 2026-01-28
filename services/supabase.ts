import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hhefihqmsbylvplzkqrd.supabase.co';
const supabaseAnonKey = 'sb_publishable_PoIDnRCawZlUjCBQIW7Ahw_ahmd9bts';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);