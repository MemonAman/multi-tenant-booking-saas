const { supabaseAdmin, createScopedClient } = require('../config/supabase');

/**
 * Express Middleware: Verifies Supabase Auth JWT token, extracts user,
 * resolves tenant membership from `business_members`, and attaches `req.user`,
 * `req.tenantId`, and `req.tenantRole`.
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: {
          message: 'Missing or invalid Authorization header. Bearer token required.',
          code: 'UNAUTHORIZED'
        }
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Validate JWT token with Supabase Auth
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({
        error: {
          message: 'Invalid or expired authentication token.',
          code: 'UNAUTHORIZED'
        }
      });
    }

    // Resolve tenant (business) membership for this user
    const { data: member, error: memberError } = await supabaseAdmin
      .from('business_members')
      .select('business_id, role, businesses(name, slug, status)')
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      return res.status(403).json({
        error: {
          message: 'Authenticated user is not assigned to any business tenant.',
          code: 'NO_TENANT_MEMBERSHIP'
        }
      });
    }

    if (member.businesses && member.businesses.status !== 'active') {
      return res.status(403).json({
        error: {
          message: `Business account is currently ${member.businesses.status}.`,
          code: 'TENANT_INACTIVE'
        }
      });
    }

    // Attach verified user and tenant context to request
    req.user = user;
    req.tenantId = member.business_id;
    req.tenantRole = member.role;
    req.tenantBusiness = member.businesses;
    req.accessToken = token;
    req.db = createScopedClient(token); // Scoped Supabase client enforcing RLS

    next();
  } catch (err) {
    console.error('Error in requireAuth middleware:', err);
    return res.status(500).json({
      error: {
        message: 'Internal server error during authentication.',
        code: 'AUTH_SERVER_ERROR'
      }
    });
  }
}

/**
 * Middleware to restrict route to specific tenant roles (e.g. 'owner', 'admin')
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.tenantRole || !allowedRoles.includes(req.tenantRole)) {
      return res.status(403).json({
        error: {
          message: `Forbidden. Action requires one of roles: [${allowedRoles.join(', ')}]`,
          code: 'INSUFFICIENT_PERMISSIONS'
        }
      });
    }
    next();
  };
}

module.exports = {
  requireAuth,
  requireRole
};
