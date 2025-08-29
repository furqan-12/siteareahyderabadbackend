import 'dotenv/config'; // ✅ This line loads your .env file
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://uxrfnwbdzrvbqfnjmgpp.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4cmZud2JkenJ2YnFmbmptZ3BwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTAyMTUsImV4cCI6MjA2OTA4NjIxNX0.-AxJUh0WJjdnn09ui2CH0SEpy0Vp19TullfVa8PT8NQ";

const supabase = createClient(supabaseUrl, supabaseKey);
export default supabase;
