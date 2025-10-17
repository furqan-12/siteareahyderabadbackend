// server.js
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import supabase from './config/supabaseclient/supabaseclient.js';
import nodemailer from 'nodemailer';
import dotenv from "dotenv"
dotenv.config()

const PORT = process.env.PORT || 3000

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const allowedOrigins = [
  "http://127.0.0.1:5500",
  "http://127.0.0.1:5501",
  "https://siteareahyderabadfrontend.vercel.app",
  "https://hyderabadsiteassociationtradeandindustry.com"
];



app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (like mobile apps or curl)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

console.log("Supabase URL:", process.env.SUPABASE_URL);
console.log("Supabase Key (first 10 chars):", process.env.SUPABASE_KEY?.slice(0,10));


// login api start from here
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;  // ab error nahi aayega
    console.log("Login attempt:", email);

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(401).json({ message: error.message });
    } else {
      return res.status(200).json({ message: 'Login successful', user: data.user });
    }
  } catch (err) {
    console.error("Login API Error:", err.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});


// members apis start from here
app.post('/add-member', async (req, res) => {
  const { name, designation, email, phone, company_address, image } = req.body;

  if (!name || !designation || !email || !phone || !company_address) {
    return res.status(400).json({ message: "All fields except image are required." });
  }

  let image_url = '';
  if (image) {
    try {
      const match = image.match(/^data:image\/(png|jpg|jpeg);base64,/);
      let ext = '.jpg';
      let contentType = 'image/jpeg';
      if (match) {
        if (match[1] === 'png') {
          ext = '.png';
          contentType = 'image/png';
        }
      }
      const base64Data = image.replace(/^data:image\/(png|jpg|jpeg);base64,/, "");
      const buffer = Buffer.from(base64Data, 'base64');
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2,8)}${ext}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('executive-members-committee')
        .upload(fileName, buffer, { contentType });
      if (uploadError) {
        return res.status(500).json({ message: 'Image upload failed: ' + uploadError.message });
      }
      const { data: publicUrlData } = supabase.storage
        .from('executive-members-committee')
        .getPublicUrl(fileName);
      image_url = publicUrlData.publicUrl;
    } catch (err) {
      return res.status(500).json({ message: 'Image upload error: ' + err.message });
    }
  }

  try {
    const { data, error } = await supabase.from('members').insert([
      { name, designation, email, phone, company_address, active: true, image_url }
    ]);
    if (error) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(201).json({ message: 'Member added successfully', member: data && data[0] });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error." });
  }
});

app.get('/getmembers', async (req, res) => {
  try {
    const { data, error } = await supabase.from('members').select('*');

    if (error) {
      console.error("Supabase Error:", error);
      return res.status(500).json({ message: error.message });
    }

    return res.status(200).json({ members: data });
  } catch (err) {
    console.error("Server Error:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
});

app.get('/getfrontendmembers', async (req, res) => {
  try {
    const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('active', true);

    if (error) {
      console.error("Supabase Error:", error);
      return res.status(500).json({ message: error.message });
    }

    return res.status(200).json({ members: data });
  } catch (err) {
    console.error("Server Error:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
});
 



// toggle member active status
app.put('/toggle-member-active/:id', async (req, res) => {
  const memberId = req.params.id;
  const { active } = req.body;

  if (typeof active !== 'boolean') {
    return res.status(400).json({ message: 'active must be a boolean' });
  }

  try {
    const { error } = await supabase
      .from('members')
      .update({ active })
      .eq('id', memberId);

    if (error) {
      console.error('Supabase Error:', error);
      return res.status(500).json({ message: 'Error toggling active: ' + error.message });
    }

    res.status(200).json({ message: 'Member status updated' });
  } catch (err) {
    console.error('Server Error:', err);
    res.status(500).json({ message: 'Server error while toggling active' });
  }
});

// In your Node.js backend (e.g., routes or app.js)
app.delete('/delete-member/:id', async (req, res) => {
  const memberId = req.params.id;

  try {
    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', memberId);

    if (error) {
      console.error('Supabase Error:', error);
      return res.status(500).json({ message: 'Error deleting member: ' + error.message });
    }

    res.status(200).json({ message: 'Member deleted successfully' });
  } catch (err) {
    console.error('Server Error:', err);
    res.status(500).json({ message: 'Server error while deleting member' });
  }
});

app.put('/update-member/:id', async (req, res) => {
  const memberId = req.params.id;
  const { name, designation, email, phone, company_address, image, image_url } = req.body;
  // Preserve existing image if frontend doesn't send a new image or an image_url
  let updated_image_url = image_url; // undefined if not sent

  // If neither a new base64 `image` nor an `image_url` was provided, fetch existing image_url
  if (!image && !image_url) {
    try {
      const { data: existingMember, error: fetchError } = await supabase
        .from('members')
        .select('image_url')
        .eq('id', memberId)
        .single();
      if (!fetchError && existingMember) {
        updated_image_url = existingMember.image_url || '';
      } else {
        // on fetch error, default to empty string to avoid undefined later
        updated_image_url = '';
      }
    } catch (err) {
      console.error('Error fetching existing member image_url:', err.message);
      updated_image_url = '';
    }
  }

  if (image && image.startsWith('data:image')) {
    try {
      const match = image.match(/^data:image\/(png|jpg|jpeg);base64,/);
      let ext = '.jpg';
      let contentType = 'image/jpeg';
      if (match) {
        if (match[1] === 'png') {
          ext = '.png';
          contentType = 'image/png';
        }
      }
      const base64Data = image.replace(/^data:image\/(png|jpg|jpeg);base64,/, "");
      const buffer = Buffer.from(base64Data, 'base64');
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2,8)}${ext}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('executive-members-committee')
        .upload(fileName, buffer, { contentType });
      if (uploadError) {
        return res.status(500).json({ message: 'Image upload failed: ' + uploadError.message });
      }
      const { data: publicUrlData } = supabase.storage
        .from('executive-members-committee')
        .getPublicUrl(fileName);
      updated_image_url = publicUrlData.publicUrl;
    } catch (err) {
      return res.status(500).json({ message: 'Image upload error: ' + err.message });
    }
  }

  try {
    const { error } = await supabase
      .from('members')
      .update({ name, designation, email, phone, company_address, image_url: updated_image_url })
      .eq('id', memberId);
    if (error) {
      return res.status(500).json({ message: 'Error updating member: ' + error.message });
    }
    res.status(200).json({ message: 'Member updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error while updating member' });
  }
});
// members apis end here


// events  apies start from here
app.post('/add-event', async (req, res) => {
  const { title, eventdate, image } = req.body;

  // ✅ Validate required fields
  if (!title || !eventdate) {
    return res.status(400).json({ message: "All fields except image are required." });
  }

  let image_url = '';
  if (image) {
    try {
      const base64Data = image.replace(/^data:image\/(png|jpg|jpeg);base64,/, "");
      const buffer = Buffer.from(base64Data, 'base64');
      const ext = '.jpg';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2,8)}${ext}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('events-images')
        .upload(fileName, buffer, {
          contentType: 'image/jpeg'
        });
      if (uploadError) {
        return res.status(500).json({ message: 'Image upload failed: ' + uploadError.message });
      }
      const { data: publicUrlData } = supabase.storage
        .from('events-images')
        .getPublicUrl(fileName);
      image_url = publicUrlData.publicUrl;
    } catch (err) {
      return res.status(500).json({ message: 'Image upload error: ' + err.message });
    }
  }

  try {
    const { data, error } = await supabase.from('events').insert([
      { title, eventdate, image_url }
    ]);
    if (error) {
      console.error("Supabase Error:", error);
      return res.status(500).json({ message: error.message });
    }
    return res.status(201).json({ message: 'event added successfully', event: data && data[0] });
  } catch (err) {
    console.error("Server Error:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
});

app.get('/getevents', async (req, res) => {
  try {
    const { data, error } = await supabase.from('events').select('*');

    if (error) {
      console.error("Supabase Error:", error);
      return res.status(500).json({ message: error.message });
    }

    return res.status(200).json({ members: data });
  } catch (err) {
    console.error("Server Error:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
});

// In your Node.js backend (e.g., routes or app.js)
app.delete('/delete-event/:id', async (req, res) => {
  const eventId = req.params.id;

  try {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId);

    if (error) {
      console.error('Supabase Error:', error);
      return res.status(500).json({ message: 'Error deleting member: ' + error.message });
    }

    res.status(200).json({ message: 'event deleted successfully' });
  } catch (err) {
    console.error('Server Error:', err);
    res.status(500).json({ message: 'Server error while deleting member' });
  }
});

app.put('/update-event/:id', async (req, res) => {
  const eventId = req.params.id;
  const { title, eventdate, image, image_url } = req.body;

  let updated_image_url = image_url || '';
  if (image) {
    try {
      const base64Data = image.replace(/^data:image\/(png|jpg|jpeg);base64,/, "");
      const buffer = Buffer.from(base64Data, 'base64');
      const ext = '.jpg';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2,8)}${ext}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('events-images')
        .upload(fileName, buffer, {
          contentType: 'image/jpeg'
        });
      if (uploadError) {
        return res.status(500).json({ message: 'Image upload failed: ' + uploadError.message });
      }
      const { data: publicUrlData } = supabase.storage
        .from('events-images')
        .getPublicUrl(fileName);
      updated_image_url = publicUrlData.publicUrl;
    } catch (err) {
      return res.status(500).json({ message: 'Image upload error: ' + err.message });
    }
  }

  try {
    const { error } = await supabase
      .from('events')
      .update({ title, eventdate, image_url: updated_image_url })
      .eq('id', eventId);
    if (error) {
      console.error('Supabase Error:', error);
      return res.status(500).json({ message: 'Error updating member: ' + error.message });
    }
    res.status(200).json({ message: 'event updated successfully' });
  } catch (err) {
    console.error('Server Error:', err);
    res.status(500).json({ message: 'Server error while updating member' });
  }
});
// event apis end here


// circular apis start from here
app.post('/add-circular', async (req, res) => {
  const { circularno, circularname, circulardate, circularimage } = req.body;

  if (!circularno || !circularname || !circulardate) {
    return res.status(400).json({ message: "Circular number, name, and date are required." });
  }

  let image_url = '';
  if (circularimage) {
    try {
      // Detect extension and content type from base64 header
      const match = circularimage.match(/^data:image\/(png|jpg|jpeg);base64,/);
      let ext = '.jpg';
      let contentType = 'image/jpeg';
      if (match) {
        if (match[1] === 'png') {
          ext = '.png';
          contentType = 'image/png';
        } else if (match[1] === 'jpeg' || match[1] === 'jpg') {
          ext = '.jpg';
          contentType = 'image/jpeg';
        }
      }
      const base64Data = circularimage.replace(/^data:image\/(png|jpg|jpeg);base64,/, "");
      const buffer = Buffer.from(base64Data, 'base64');
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2,8)}${ext}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('circular-images')
        .upload(fileName, buffer, {
          contentType
        });
      if (uploadError) {
        return res.status(500).json({ message: 'Image upload failed: ' + uploadError.message });
      }
      const { data: publicUrlData } = supabase.storage
        .from('circular-images')
        .getPublicUrl(fileName);
      image_url = publicUrlData.publicUrl;
    } catch (err) {
      return res.status(500).json({ message: 'Image upload error: ' + err.message });
    }
  }

  try {
    const { data, error } = await supabase.from('circulars').insert([
      { circularno, circularname, circulardate, circularimage: image_url }
    ]);
    if (error) {
      console.error("Supabase Error:", error);
      return res.status(500).json({ message: error.message });
    }
    return res.status(201).json({ message: 'Circular added successfully', circular: data && data[0] });
  } catch (err) {
    console.error("Server Error:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
});
// jjjjjjjjjjjjjjjj

app.get('/getcirculars', async (req, res) => {
  try {
    const { data, error } = await supabase.from('circulars').select('*');

    if (error) {
      console.error("Supabase Error:", error);
      return res.status(500).json({ message: error.message });
    }

    return res.status(200).json({ circulars: data });
  } catch (err) {
    console.error("Server Error:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
});


app.delete('/delete-circular/:id', async (req, res) => {
  const circularId = req.params.id;

  try {
    const { error } = await supabase
      .from('circulars')
      .delete()
      .eq('id', circularId);

    if (error) {
      console.error('Supabase Error:', error);
      return res.status(500).json({ message: 'Error deleting circular: ' + error.message });
    }

    res.status(200).json({ message: 'Circular deleted successfully' });
  } catch (err) {
    console.error('Server Error:', err);
    res.status(500).json({ message: 'Server error while deleting circular' });
  }
});


app.put('/update-circular/:id', async (req, res) => {
  const circularId = req.params.id;
  const { circularno, circularname, circulardate, circularimage } = req.body;

  let updated_image_url = circularimage || '';
  if (circularimage && circularimage.startsWith('data:image')) {
    try {
      // Detect extension and content type from base64 header
      const match = circularimage.match(/^data:image\/(png|jpg|jpeg);base64,/);
      let ext = '.jpg';
      let contentType = 'image/jpeg';
      if (match) {
        if (match[1] === 'png') {
          ext = '.png';
          contentType = 'image/png';
        } else if (match[1] === 'jpeg' || match[1] === 'jpg') {
          ext = '.jpg';
          contentType = 'image/jpeg';
        }
      }
      const base64Data = circularimage.replace(/^data:image\/(png|jpg|jpeg);base64,/, "");
      const buffer = Buffer.from(base64Data, 'base64');
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2,8)}${ext}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('circular-images')
        .upload(fileName, buffer, {
          contentType
        });
      if (uploadError) {
        return res.status(500).json({ message: 'Image upload failed: ' + uploadError.message });
      }
      const { data: publicUrlData } = supabase.storage
        .from('circular-images')
        .getPublicUrl(fileName);
      updated_image_url = publicUrlData.publicUrl;
    } catch (err) {
      return res.status(500).json({ message: 'Image upload error: ' + err.message });
    }
  }

  try {
    const { error } = await supabase
      .from('circulars')
      .update({ circularno, circularname, circulardate, circularimage: updated_image_url })
      .eq('id', circularId);
    if (error) {
      console.error('Supabase Error:', error);
      return res.status(500).json({ message: 'Error updating circular: ' + error.message });
    }
    res.status(200).json({ message: 'Circular updated successfully' });
  } catch (err) {
    console.error('Server Error:', err);
    res.status(500).json({ message: 'Server error while updating circular' });
  }
});
// circular apis end here


// All add member apis start from here
app.post('/add-all-members', async (req, res) => {
  const {
    member_code,
    company,
    first_name,
    last_name,
    office_address,
    office_address_doc,
    nature_of_business,
    phoneno,
    company_ntn,
    sales_tax_reg,
    fax_no,
    email,
    website,
    join_date,
    active,
    name,
    designation,
    companyaddress,
    image // base64 string
  } = req.body;

  let file_url = req.body.file_url || '';
  // If image base64 string is sent, upload to Supabase
  if (image) {
    try {
      // Remove base64 header if present
      const base64Data = image.replace(/^data:image\/(png|jpg|jpeg);base64,/, "");
      const buffer = Buffer.from(base64Data, 'base64');
      const ext = '.jpg'; // You can detect extension from base64 header if needed
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2,8)}${ext}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('members-images')
        .upload(fileName, buffer, {
          contentType: 'image/jpeg'
        });
      if (uploadError) {
        return res.status(500).json({ message: 'Image upload failed: ' + uploadError.message });
      }
      const { data: publicUrlData } = supabase.storage
        .from('members-images')
        .getPublicUrl(fileName);
      file_url = publicUrlData.publicUrl;
    } catch (err) {
      return res.status(500).json({ message: 'Image upload error: ' + err.message });
    }
  }

  try {
    const { data, error } = await supabase
      .from('allmembers')
      .insert([{
        member_code,
        company,
        first_name,
        last_name,
        office_address,
        office_address_doc,
        nature_of_business,
        phoneno,
        company_ntn,
        sales_tax_reg,
        fax_no,
        email,
        website,
        join_date,
        active,
        file_url,
        name,
        designation,
        companyaddress
      }]);

    if (error) {
      console.error("Supabase error", error);
      return res.status(500).json({ message: error.message });
    }

    res.status(200).json({
      message: "Member added successfully",
      member: data && data[0]
    });

  } catch (err) {
    console.error("Server error", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get('/get-all-members',async(req,res)=>{
  try {
    const {data , error} = await supabase.from('allmembers').select('*'); 
    if (error){
      console.error("supabse error",error)
      res.status(500).json({
        message : error.message
      });
    }
    res.status(200).json({
      message: data
    })
  } catch (err) {
    console.error("server error",err);
    return res.status(500).json({
      message:"Internal server Error."
    })
  }
})

app.put('/update-all-members/:id', async (req, res) => {
  const { id } = req.params;
  const {
    member_code,
    company,
    first_name,
    last_name,
    office_address,
    office_address_doc,
    nature_of_business,
    phoneno,
    company_ntn,
    sales_tax_reg,
    fax_no,
    email,
    website,
    join_date,
    active,
    file_url,
    name,
    designation,
    companyaddress,
    image // base64 string
  } = req.body;

  let updated_file_url = file_url || '';
  // If image base64 string is sent, upload to Supabase
  if (image) {
    try {
      const base64Data = image.replace(/^data:image\/(png|jpg|jpeg);base64,/, "");
      const buffer = Buffer.from(base64Data, 'base64');
      const ext = '.jpg';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2,8)}${ext}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('members-images')
        .upload(fileName, buffer, {
          contentType: 'image/jpeg'
        });
      if (uploadError) {
        return res.status(500).json({ message: 'Image upload failed: ' + uploadError.message });
      }
      const { data: publicUrlData } = supabase.storage
        .from('members-images')
        .getPublicUrl(fileName);
      updated_file_url = publicUrlData.publicUrl;
    } catch (err) {
      return res.status(500).json({ message: 'Image upload error: ' + err.message });
    }
  }

  try {
    const { data, error } = await supabase
      .from('allmembers')
      .update({
        member_code,
        company,
        first_name,
        last_name,
        office_address,
        office_address_doc,
        nature_of_business,
        phoneno,
        company_ntn,
        sales_tax_reg,
        fax_no,
        email,
        website,
        join_date,
        active,
        file_url: updated_file_url,
        name,
        designation,
        companyaddress
      })
      .eq('id', parseInt(id)); // Ensure ID is a number

    if (error) {
      console.error("Supabase error:", error);
      return res.status(500).json({ message: error.message });
    }

    res.status(200).json({
      message: "Member updated successfully",
      member: data && data[0] ? data[0] : null
    });

  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.delete('/delete-all-members/:id',async(req,res)=>{

  const memberId = req.params.id;
  try {
    const {error} = await supabase.from('allmembers').delete().eq('id',memberId);
    if (error) {
      console.error('Supabase Error:', error);
      return res.status(500).json({ message: 'Error deleting member: ' + error.message });
    }
    res.status(200).json({
      message:"Member Successfully Deleted",
    });
  } catch (error) {
    console.error("Internal server error",error)
    res.status(500).json({
      message:"internal server error", error,
    })
  }
})

// All member apis end here


// Clean & Green apis start from here
app.post('/add-clean', async (req, res) => {
  const { title, image } = req.body;
  let image_url = '';
  if (image) {
    try {
      const match = image.match(/^data:image\/(png|jpg|jpeg);base64,/);
      let ext = '.jpg';
      let contentType = 'image/jpeg';
      if (match) {
        if (match[1] === 'png') {
          ext = '.png';
          contentType = 'image/png';
        }
      }
      const base64Data = image.replace(/^data:image\/(png|jpg|jpeg);base64,/, "");
      const buffer = Buffer.from(base64Data, 'base64');
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2,8)}${ext}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('clean-green-images')
        .upload(fileName, buffer, { contentType });
      if (uploadError) {
        return res.status(500).json({ message: 'Image upload failed: ' + uploadError.message });
      }
      const { data: publicUrlData } = supabase.storage
        .from('clean-green-images')
        .getPublicUrl(fileName);
      image_url = publicUrlData.publicUrl;
    } catch (err) {
      return res.status(500).json({ message: 'Image upload error: ' + err.message });
    }
  }
  try {
    const { data, error } = await supabase.from('clean_green_cards').insert([
      { title, cleanimage : image_url }
    ]);
    if (error) {
      return res.status(400).json({ message: error.message });
    }
    res.status(200).json({ message: "Successfully added data", member: data && data[0] });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get('/get-clean',async(req,res)=>{
  try {
    const {data ,error} = await supabase.from('clean_green_cards').select('*');
    if(error) {
      console.error("supabse error",error);
      res.status(400).json({
        message:"internal server error"
      });
    }
    res.status(200).json({
      mesage: data
    })
  } catch (error) {
    console.error("server error",error);
    res.status(500).json({
      message:"internal server error"
    })
  }
})

app.delete('/delete-clean/:id',async(req,res)=>{
  const cleanid = req.params.id
  try {
    const {error} = await supabase.from('clean_green_cards').delete().eq('id',cleanid);
    if(error){
      console.error('supabase error',error);
      res.status(400).json({
        message:"error deleting data" + error.message
      });
    }
    res.status(200).json({
      message:"cleaning data successfully deleted"
    })
  } catch (error) {
    console.error("internal server",error)
    res.status(500).json({
      message : "internal server error"
    })
  }
})

app.put('/update-clean/:id', async (req, res) => {
  const updatedcleanid = req.params.id;
  const { title, image, image_url } = req.body;
  let updated_image_url = image_url || '';
  if (image && image.startsWith('data:image')) {
    try {
      const match = image.match(/^data:image\/(png|jpg|jpeg);base64,/);
      let ext = '.jpg';
      let contentType = 'image/jpeg';
      if (match) {
        if (match[1] === 'png') {
          ext = '.png';
          contentType = 'image/png';
        }
      }
      const base64Data = image.replace(/^data:image\/(png|jpg|jpeg);base64,/, "");
      const buffer = Buffer.from(base64Data, 'base64');
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2,8)}${ext}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('clean-green-images')
        .upload(fileName, buffer, { contentType });
      if (uploadError) {
        return res.status(500).json({ message: 'Image upload failed: ' + uploadError.message });
      }
      const { data: publicUrlData } = supabase.storage
        .from('clean-green-images')
        .getPublicUrl(fileName);
      updated_image_url = publicUrlData.publicUrl;
    } catch (err) {
      return res.status(500).json({ message: 'Image upload error: ' + err.message });
    }
  }
  try {
    const { data, error } = await supabase.from('clean_green_cards').update({
      title,
      cleanimage: updated_image_url
    }).eq('id', updatedcleanid);
    if (error) {
      return res.status(400).json({ message: error.message });
    }
    res.status(200).json({ message: "Successfully updated cleaning data", member: data && data[0] });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});


app.get('/members-categories', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*');

    if (error) {
      console.error("Supabase error", error);
      return res.status(400).json({
        message: "Supabase error",
        error
      });
    }

    res.status(200).json({
      message: "Successfully fetched categories",
      data
    });
  } catch (error) {
    console.error("Internal server error", error);
    res.status(500).json({
      message: "Internal server error"
    });
  }
});


app.post('/add-categories', async(req,res)=>{
  const {name} = req.body;
  try {
    const {data,error} = await supabase.from('categories').insert([{name}]);
    if(error){
      console.error("supabase error",error)
      res.status(400).json({
        message:"supabse error ",error
      })
    }
    res.status(200).json({
      mesage:"successfully add categories",data
    })
  } catch (error) {
    console.error("internal server error",error)
    res.status(500).json({
      message:"internal server error",error
    })
  }
});


app.post('/send-contact-email', async (req, res) => {
  const { name, email, message } = req.body;
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'your-email@gmail.com',
        pass: 'your-app-password'
      }
    });

    const mailOptions = {
      from: email,
      to: 'your-email@gmail.com',
      subject: `Contact Form Submission from ${name}`,
      text: message
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Email sent successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to send email.' });
  }
});

app.listen(PORT, () => {
  console.log('🚀 Server running on http://localhost:3000');
});
