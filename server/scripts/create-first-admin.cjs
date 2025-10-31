/**
 * Script to create the first admin user
 * Run this once to set up initial admin access
 */

const adminService = require('../services/adminService.cjs');

async function createFirstAdmin() {
  try {
    console.log('Creating first admin user...');
    
    const admin = await adminService.createAdmin({
      email: 'admin@riderlabs.io',
      password: 'ChangeThisPassword123!',
      name: 'Super Admin',
      isSuperAdmin: true
    });
    
    console.log('✅ First admin user created successfully!');
    console.log('');
    console.log('Login credentials:');
    console.log('  Email:', admin.email);
    console.log('  Password: ChangeThisPassword123!');
    console.log('');
    console.log('⚠️  IMPORTANT: Change this password immediately after first login!');
    console.log('');
    console.log('You can now login at: http://localhost:3000/admin/login');
    
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Admin user already exists');
      console.log('   Email: admin@riderlabs.io');
    } else {
      console.error('❌ Error creating admin user:', error.message);
    }
  }
  
  process.exit(0);
}

createFirstAdmin();
