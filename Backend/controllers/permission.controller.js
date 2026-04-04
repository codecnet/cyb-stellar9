import Permission from "../models/permission.model.js";

// Create Permission Controller
// export const createPermission = async (req, res) => {
//   try {
//     const { name } = req.body;

//     // Basic input validation
//     if (!name || typeof name !== 'string') {
//       return res.status(400).json({
//         message: "Permission name is required and must be a string",
//         success: false,
//       });
//     }

//     // Check for existing permission
//     const existing = await Permission.findOne({ name });
//     if (existing) {
//       return res.status(409).json({
//         message: "Permission with this name already exists",
//         success: false,
//       });
//     }

//     const permission = await Permission.create({ name });

//     return res.status(201).json({
//       message: "Permission created successfully",
//       permission,
//       success: true,
//     });
//   } catch (error) {
//     console.error("Create Permission Error:", error);
//     return res.status(500).json({
//       message: "Internal Server Error",
//       error: error.message,
//       success: false,
//     });
//   }
// };
export const createPermission = async (req, res) => {
  try {
    const {
      permission_name,
      resource,
      action,
      description,
      permission_category,
      scope,
    } = req.body;

    // --- Start of Corrected Code ---

    // Updated validation to check for the required fields from the model
    if (!permission_name || typeof permission_name !== "string") {
      return res.status(400).json({
        message:
          "Permission name (permission_name) is required and must be a string",
        success: false,
      });
    }
    if (!resource || typeof resource !== "string") {
      return res.status(400).json({
        message: "Resource is required and must be a string",
        success: false,
      });
    }
    if (!action || typeof action !== "string") {
      return res.status(400).json({
        message: "Action is required and must be a string",
        success: false,
      });
    }

    // Check for existing permission using the correct field
    const existing = await Permission.findOne({ permission_name });
    if (existing) {
      return res.status(409).json({
        message: "Permission with this name already exists",
        success: false,
      });
    }

    // Create the permission with all the correct fields
    const permission = await Permission.create({
      permission_name,
      resource,
      action,
      description,
      permission_category,
      scope,
    });

    // --- End of Corrected Code ---

    return res.status(201).json({
      message: "Permission created successfully",
      permission,
      success: true,
    });
  } catch (error) {
    console.error("Create Permission Error:", error);
    // Add more specific error handling for validation errors
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Validation Error",
        error: error.message,
        success: false,
      });
    }
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
      success: false,
    });
  }
};

export const updatePermission = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    // Validate input
    if (!name || typeof name !== "string") {
      return res.status(400).json({
        message: "Permission name is required and must be a string",
        success: false,
      });
    }

    // Check if permission exists
    const permission = await Permission.findById(id);
    if (!permission) {
      return res.status(404).json({
        message: "Permission not found",
        success: false,
      });
    }

    // Check for duplicate name (if changed)
    const existing = await Permission.findOne({ name });
    if (existing && existing._id.toString() !== id) {
      return res.status(409).json({
        message: "Another permission with this name already exists",
        success: false,
      });
    }

    // Update and save
    permission.name = name;
    await permission.save();

    return res.status(200).json({
      message: "Permission updated successfully",
      permission,
      success: true,
    });
  } catch (error) {
    console.error("Update Permission Error:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
      success: false,
    });
  }
};

export const getAllPermissions = async (req, res) => {
  try {
    const permissions = await Permission.find();

    if (!permissions || permissions.length === 0) {
      return res.status(404).json({
        message: "No permissions found",
        data: [],
        success: false,
      });
    }

    return res.status(200).json({
      message: "Permissions fetched successfully",
      data: permissions,
      success: true,
    });
  } catch (error) {
    console.error("Get All Permissions Error:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
      success: false,
    });
  }
};

// Default permissions that should always exist in the system
const DEFAULT_PERMISSIONS = [
  // Events Ingested
  { permission_name: 'events-ingested: read',   resource: 'events-ingested',     action: 'read',   permission_category: 'security', description: 'View event ingestion data and statistics' },
  { permission_name: 'events-ingested: access', resource: 'events-ingested',     action: 'access', permission_category: 'security', description: 'Access the Events Ingested page' },
  // Log Source Coverage
  { permission_name: 'log-source-coverage: read',   resource: 'log-source-coverage', action: 'read',   permission_category: 'security', description: 'View log source coverage and agent log statistics' },
  { permission_name: 'log-source-coverage: access', resource: 'log-source-coverage', action: 'access', permission_category: 'security', description: 'Access the Log Source Coverage page' },
  // Rules Management
  { permission_name: 'rules: read',   resource: 'rules', action: 'read',   permission_category: 'security', description: 'View security detection rules' },
  { permission_name: 'rules: create', resource: 'rules', action: 'create', permission_category: 'security', description: 'Create new security detection rules' },
  { permission_name: 'rules: update', resource: 'rules', action: 'update', permission_category: 'security', description: 'Update existing security detection rules' },
  { permission_name: 'rules: delete', resource: 'rules', action: 'delete', permission_category: 'security', description: 'Delete security detection rules' },
  { permission_name: 'rules: manage', resource: 'rules', action: 'manage', permission_category: 'security', description: 'Full management of security detection rules' },
  // IOC List Management
  { permission_name: 'ioc-list: read',   resource: 'ioc-list', action: 'read',   permission_category: 'security', description: 'View IOC (Indicator of Compromise) lists' },
  { permission_name: 'ioc-list: create', resource: 'ioc-list', action: 'create', permission_category: 'security', description: 'Create new IOC list entries' },
  { permission_name: 'ioc-list: update', resource: 'ioc-list', action: 'update', permission_category: 'security', description: 'Update existing IOC list entries' },
  { permission_name: 'ioc-list: delete', resource: 'ioc-list', action: 'delete', permission_category: 'security', description: 'Delete IOC list entries' },
  { permission_name: 'ioc-list: manage', resource: 'ioc-list', action: 'manage', permission_category: 'security', description: 'Full management of IOC lists including import/export' },
];

export const syncDefaultPermissions = async (req, res) => {
  try {
    const created = [];
    const skipped = [];

    for (const perm of DEFAULT_PERMISSIONS) {
      const existing = await Permission.findOne({ permission_name: perm.permission_name });
      if (existing) {
        skipped.push(perm.permission_name);
      } else {
        await Permission.create(perm);
        created.push(perm.permission_name);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Sync complete. Created: ${created.length}, Already existed: ${skipped.length}`,
      created,
      skipped,
    });
  } catch (error) {
    console.error("Sync Default Permissions Error:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
      success: false,
    });
  }
};

export const deletePermission = async (req, res) => {
  try {
    const { id } = req.params;

    const permission = await Permission.findById(id);
    if (!permission) {
      return res.status(404).json({
        message: "Permission not found",
        success: false,
      });
    }

    await permission.deleteOne();

    return res.status(200).json({
      message: "Permission deleted successfully",
      success: true,
    });
  } catch (error) {
    console.error("Delete Permission Error:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
      success: false,
    });
  }
};
