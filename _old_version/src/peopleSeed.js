// Sample talent for the Problem2Solution directory.
// Fictional people with focused, realistic skill sets across tech, design, marketing and business.
// Used to (re)seed the Supabase "profiles" table and as the offline fallback.

const P = (name, role, skills, city, years, availability, about) => ({
  name,
  role,
  skills,
  initials: name.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase(),
  match: Math.min(95, 78 + years * 2),
  bio: `${city} · ${years} yr${years > 1 ? 's' : ''} experience · ${availability}. ${about}`
});

export const PEOPLE = [
  // ---- Web & software ----
  P('Ananya Rao', 'Frontend Developer', ['React', 'JavaScript', 'HTML/CSS', 'Tailwind CSS', 'Next.js', 'UI/UX'], 'Bengaluru', 3, 'Available part-time', 'Builds fast, mobile-friendly websites and dashboards.'),
  P('Arjun Singh', 'Backend Developer', ['Node.js', 'Express', 'Supabase', 'PostgreSQL', 'REST APIs'], 'Chennai', 3, 'Available', 'Designs APIs, databases and authentication for web apps.'),
  P('Neha Shah', 'Full-Stack Developer', ['React', 'Node.js', 'Express', 'MongoDB', 'TypeScript', 'Supabase'], 'Mumbai', 4, 'Available for freelance', 'Ships complete web apps from idea to deployment.'),
  P('Rohan Mehta', 'Full-Stack Developer', ['Next.js', 'React', 'Node.js', 'PostgreSQL', 'Razorpay', 'Ecommerce'], 'Pune', 5, 'Available', 'Has built three online stores with order tracking and payments.'),
  P('Kavya Nair', 'E-commerce Developer', ['Shopify', 'WooCommerce', 'WordPress', 'Razorpay', 'PHP', 'Ecommerce'], 'Kochi', 4, 'Available for freelance', 'Sets up online shops for small businesses quickly and affordably.'),
  P('Siddharth Rao', 'Payment Integration Specialist', ['Razorpay', 'Stripe', 'Payment Integration', 'Node.js', 'REST APIs'], 'Bengaluru', 4, 'Available weekends', 'Integrates UPI, cards and wallets into websites and apps.'),
  P('Harsha Vardhan', 'WordPress Developer', ['WordPress', 'PHP', 'MySQL', 'Elementor', 'SEO'], 'Warangal', 3, 'Available', 'Creates business websites that owners can update themselves.'),
  P('Abhishek Yadav', 'Python Developer', ['Python', 'Django', 'FastAPI', 'PostgreSQL', 'REST APIs'], 'Patna', 3, 'Available part-time', 'Builds backends, admin panels and automation scripts.'),
  P('Mohammed Faizal', 'Java Spring Boot Developer', ['Java', 'Spring Boot', 'MySQL', 'REST APIs', 'Microservices'], 'Hyderabad', 4, 'Available', 'Works on reliable backend systems for booking and billing.'),
  P('Rakesh Nayak', 'ERP & Inventory Developer', ['ERPNext', 'Odoo', 'Python', 'Inventory Management', 'POS Systems'], 'Bhubaneswar', 5, 'Available for freelance', 'Sets up stock, billing and POS systems for retail shops.'),
  P('Varun Joshi', 'QA / Test Engineer', ['Manual Testing', 'Selenium', 'Cypress', 'Postman', 'Test Automation'], 'Indore', 3, 'Available', 'Finds bugs before your customers do.'),

  // ---- Mobile ----
  P('Lavanya Rao', 'Mobile App Developer', ['Flutter', 'Dart', 'Firebase', 'Android', 'iOS'], 'Vijayawada', 3, 'Available', 'Builds one app that runs on both Android and iPhone.'),
  P('Fatima Khan', 'Android Developer', ['Kotlin', 'Android', 'Firebase', 'Jetpack Compose'], 'Lucknow', 3, 'Available part-time', 'Native Android apps with offline support.'),
  P('Aryan Malhotra', 'iOS Developer', ['Swift', 'SwiftUI', 'iOS', 'Firebase'], 'Delhi', 2, 'Available weekends', 'Polished iPhone apps and App Store publishing.'),
  P('Bhavana Rao', 'Healthcare App Developer', ['React Native', 'Firebase', 'Telemedicine', 'Node.js'], 'Hyderabad', 4, 'Available', 'Builds appointment and teleconsultation apps for clinics.'),

  // ---- Design & media ----
  P('Sneha Iyer', 'UI/UX Designer', ['Figma', 'UI/UX', 'Wireframing', 'Prototyping', 'User Research'], 'Chennai', 3, 'Available', 'Designs simple, easy-to-use screens before any code is written.'),
  P('Pooja Reddy', 'Graphic Designer', ['Graphic Design', 'Adobe Photoshop', 'Adobe Illustrator', 'Branding', 'Logo Design', 'Canva'], 'Hyderabad', 4, 'Available for freelance', 'Logos, posters, banners and full brand identities.'),
  P('Imran Sheikh', 'Photographer & Videographer', ['Product Photography', 'Video Editing', 'Adobe Premiere Pro', 'Drone Shooting'], 'Hyderabad', 5, 'Available', 'Shoots product catalogues and shop promo videos.'),
  P('Anjali Verma', 'Video Editor & Motion Designer', ['Video Editing', 'After Effects', 'Adobe Premiere Pro', 'Motion Graphics'], 'Bhopal', 3, 'Available part-time', 'Edits reels, ads and explainer videos.'),
  P('Ritika Sen', '3D Artist & Animator', ['Blender', '3D Modeling', 'Animation', '3D Printing', 'Product Rendering'], 'Bengaluru', 3, 'Available', '3D product renders, figures and animations.'),
  P('Akash Patil', 'Interior Designer', ['Interior Design', 'AutoCAD', 'SketchUp', '3D Rendering', 'Site Supervision'], 'Nashik', 6, 'Available', 'Plans home interiors and paint schemes with 3D previews.'),

  // ---- Marketing, content & business ----
  P('Tara Bose', 'Digital Marketer', ['Digital Marketing', 'Social Media Marketing', 'Google Ads', 'Meta Ads', 'SEO', 'Canva'], 'Kolkata', 4, 'Available', 'Brings local customers through Google and Instagram ads.'),
  P('Ishita Das', 'Social Media Manager', ['Social Media Marketing', 'Instagram Marketing', 'Content Creation', 'Reels', 'Community Management'], 'Guwahati', 2, 'Available part-time', 'Runs Instagram and WhatsApp pages for small brands.'),
  P('Esha Banerjee', 'Content Writer & SEO', ['Content Writing', 'SEO', 'Copywriting', 'Blogging', 'WordPress'], 'Kolkata', 3, 'Available', 'Writes website copy and blogs that rank on Google.'),
  P('Tanvi Agarwal', 'Copywriter & Content Strategist', ['Copywriting', 'Content Strategy', 'Technical Writing', 'Email Marketing'], 'Jaipur', 4, 'Available for freelance', 'Clear product descriptions, emails and brochures.'),
  P('Sanjana Pillai', 'Product Manager', ['Product Management', 'Agile', 'Jira', 'User Research', 'Roadmapping'], 'Bengaluru', 5, 'Available weekends', 'Turns rough ideas into clear plans and keeps teams on track.'),
  P('Rajesh Gowda', 'Business Analyst', ['Business Analysis', 'Requirements Gathering', 'Excel', 'SQL', 'Power BI'], 'Mysuru', 4, 'Available', 'Maps business needs to features and measures results.'),
  P('Deepika Menon', 'Accountant & GST Consultant', ['Accounting', 'GST', 'Tally', 'Bookkeeping', 'Excel'], 'Chennai', 7, 'Available part-time', 'Handles GST filing, invoices and books for small businesses.'),
  P('Suresh Babu', 'Logistics & Delivery Consultant', ['Delivery Operations', 'Supply Chain', 'Inventory Management', 'Excel'], 'Visakhapatnam', 6, 'Available', 'Sets up local delivery routes and stock planning.'),
  P('Zoya Mirza', 'Customer Support & CRM Specialist', ['CRM', 'Zoho CRM', 'WhatsApp Business API', 'Customer Support'], 'Hyderabad', 3, 'Available', 'Sets up WhatsApp ordering, CRM and customer follow-ups.'),

  // ---- Data, AI & security ----
  P('Meera Patel', 'Data Analyst', ['Python', 'SQL', 'Power BI', 'Data Analytics', 'Excel'], 'Ahmedabad', 3, 'Available', 'Builds sales dashboards and business reports.'),
  P('Shreya Ghosh', 'Data Scientist', ['Python', 'Pandas', 'Scikit-learn', 'Machine Learning', 'Data Visualization'], 'Kolkata', 4, 'Available part-time', 'Forecasting, recommendations and customer insights.'),
  P('Diya Gupta', 'Machine Learning Engineer', ['Python', 'TensorFlow', 'Machine Learning', 'Natural Language Processing', 'Computer Vision'], 'Pune', 3, 'Available', 'Trains and deploys ML models for real products.'),
  P('Nandini Kulkarni', 'AI & Chatbot Developer', ['LLMs', 'Google AI API', 'OpenAI API', 'LangChain', 'Python', 'Chatbots'], 'Pune', 2, 'Available', 'Builds AI assistants and WhatsApp chatbots.'),
  P('Gautam Sinha', 'Data Engineer', ['Python', 'Apache Spark', 'ETL', 'SQL', 'AWS'], 'Bengaluru', 5, 'Available weekends', 'Moves and cleans large data for analytics.'),
  P('Priya Kapoor', 'Cybersecurity Specialist', ['Ethical Hacking', 'Network Security', 'Penetration Testing', 'OWASP', 'Linux'], 'Delhi', 4, 'Available', 'Security audits for websites and apps.'),
  P('Yash Thakur', 'Blockchain Developer', ['Solidity', 'Smart Contracts', 'Web3.js', 'Ethereum', 'Node.js'], 'Chandigarh', 2, 'Available part-time', 'Smart contracts and Web3 apps.'),

  // ---- Cloud & IT ----
  P('Karthik Reddy', 'DevOps Engineer', ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Linux', 'Nginx'], 'Hyderabad', 4, 'Available', 'Deploys and scales apps so they stay online.'),
  P('Vikram Sharma', 'Cloud Architect', ['AWS', 'Azure', 'Serverless', 'Terraform', 'Docker'], 'Gurugram', 6, 'Available weekends', 'Designs cloud setups that stay cheap as you grow.'),
  P('Kiran Kumar', 'Network & IT Support Engineer', ['Networking', 'CCTV Installation', 'Hardware Support', 'Linux', 'Windows Server'], 'Hyderabad', 5, 'Available', 'Sets up shop networks, CCTV and computers.'),

  // ---- Hardware, IoT & engineering ----
  P('Rahul Kumar', 'IoT Developer', ['ESP32', 'Arduino', 'Embedded C', 'IoT', 'Sensors', 'MQTT'], 'Hyderabad', 3, 'Available', 'Builds connected devices and sensor dashboards.'),
  P('Nikhil Verma', 'Electronics & Hardware Engineer', ['PCB Design', 'Arduino', 'Raspberry Pi', 'Sensors', 'Embedded C'], 'Nagpur', 4, 'Available part-time', 'Designs circuits and prototypes hardware products.'),
  P('Pranav Iyer', 'Robotics Engineer', ['Robotics', 'ROS', 'Python', 'Computer Vision', 'Raspberry Pi'], 'Chennai', 3, 'Available', 'Robots, drones and automation rigs.'),
  P('Lakshmi Prasad', 'Solar & Electrical Engineer', ['Solar Systems', 'Electrical Wiring', 'Energy Monitoring', 'IoT'], 'Karimnagar', 6, 'Available', 'Solar installs and smart energy monitoring.'),
  P('Gopal Krishna', 'Agritech Specialist', ['Agriculture', 'Drip Irrigation', 'Soil Sensors', 'IoT', 'Field Testing'], 'Siddipet', 7, 'Available', 'Tests farm technology with real farmers in the field.'),

  // ---- Games & AR/VR ----
  P('Aditya Menon', 'AR/VR Developer', ['Unity', 'C#', 'AR/VR', 'Blender', '3D Modeling'], 'Kochi', 3, 'Available', 'AR product previews and VR walkthroughs.'),
  P('Manav Jain', 'Game Developer', ['Unity', 'C#', 'Game Design', 'Blender'], 'Jaipur', 2, 'Available part-time', 'Casual mobile games and gamified apps.')
];
