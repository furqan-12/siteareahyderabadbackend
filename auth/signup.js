import supabase from '../config/supabaseclient/supabaseclient.js'; // your existing supabase client

async function signupUser(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    console.error('❌ Signup failed:', error.message);
  } else {
    console.log('✅ Signup successful!');
    console.log('User:', data.user);
  }
}

export default signupUser;

// Example call
