  import supabase from './config/supabaseclient.js';

  const memberForm = document.getElementById('memberForm');

  memberForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const inputs = memberForm.querySelectorAll('input');
    const name = inputs[0].value;
    const designation = inputs[1].value;
    const email = inputs[2].value;
    const phone = inputs[3].value;
    const companyAddress = inputs[4].value;
    const imageUrl = inputs[5].value;

    const { data, error } = await supabase.from('members').insert([
      {
        name,
        designation,
        email,
        phone,
        company_address: companyAddress,
        image_url: imageUrl
      }
    ]);

    if (error) {
      alert('❌ Error: ' + error.message);
    } else {
      alert('✅ Member added successfully!');
      location.reload();
    }
  });
