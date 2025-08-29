// backend/auth/login.js
import supabase from '../config/supabaseclient/supabaseclient.js';

async function loginUser(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('❌ Login failed:', error.message);
    return { success: false, error: error.message };
  } else {
    console.log('✅ Login successful!');
    return { success: true, user: data.user };
  }
}

export default loginUser;
