import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Role from '../models/role.model.js';
import Permission from '../models/permission.model.js';

dotenv.config();

const SOP_ACTIONS = ['read', 'create', 'update', 'delete'];
const ROLES_TO_UPDATE = ['SuperAdmin', 'Admin1', 'Manager'];

const addSopsPermissions = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/soc_dashboard');
    console.log('Connected to MongoDB');

    for (const action of SOP_ACTIONS) {
      const exists = await Permission.findOne({ resource: 'sops', action });
      if (exists) {
        console.log(`Permission sops:${action} already exists, skipping`);
        continue;
      }

      const permission = new Permission({
        permission_name: `sops: ${action}`,
        resource: 'sops',
        action,
        permission_category: 'security',
        description: `${action.charAt(0).toUpperCase() + action.slice(1)} playbooks and SOPs`,
        status: true,
      });
      await permission.save();
      console.log(`Created permission sops:${action}`);
    }

    for (const roleName of ROLES_TO_UPDATE) {
      const role = await Role.findOne({ role_name: roleName });
      if (!role) {
        console.log(`Role ${roleName} not found, skipping`);
        continue;
      }

      if (!role.permissions || typeof role.permissions !== 'object') {
        role.permissions = {};
      }
      if (!role.permissions.sops) {
        role.permissions.sops = {};
      }
      for (const action of SOP_ACTIONS) {
        role.permissions.sops[action] = true;
      }
      role.markModified('permissions');
      await role.save();
      console.log(`Granted sops:* to ${roleName}`);
    }

    console.log('Done');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

addSopsPermissions();
