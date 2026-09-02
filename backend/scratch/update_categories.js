import { query, pool } from '../src/config/database.js';

async function updateKbCategories() {
  try {
    await query('TRUNCATE TABLE kb_categories RESTART IDENTITY CASCADE;');
    await query(`
      INSERT INTO kb_categories (key, title, description, icon, is_featured, sort_order, status)
      VALUES 
      ('it-support', 'IT Support', 'Learn the basics of setting up your IT profile, laptop requests, software, and connecting network tools.', 'Laptop', false, 1, 'PUBLISHED'),
      ('hr-people', 'Human Resources (HR)', 'Customize your experience with account settings, Google Workspace, onboarding, 2SV, and permissions.', 'ShieldCheck', true, 2, 'PUBLISHED'),
      ('general-affairs', 'General Affairs (GA)', 'Office facility management, physical asset requests, building maintenance, and operational tools.', 'Building2', false, 3, 'PUBLISHED');
    `);
    console.log('Successfully updated kb_categories DB table to IT, HR, GA!');
  } catch (error) {
    console.error('Failed to update kb_categories:', error);
  } finally {
    await pool.end();
  }
}

updateKbCategories();
