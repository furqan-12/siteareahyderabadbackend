import 'dotenv/config'; // ✅ This line loads your .env file
import { createClient } from '@supabase/supabase-js';
import dotenv from "dotenv"
dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY

const supabase = createClient(supabaseUrl, supabaseKey);
export default supabase;
