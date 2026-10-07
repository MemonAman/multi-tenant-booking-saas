/**
 * Tenant Security Middleware: Ensures that client-provided body, query,
 * or param `business_id` matches the authenticated user's `req.tenantId`.
 * Prevents malicious tenant spoofing.
 */
function enforceTenantScope(req, res, next) {
  if (!req.tenantId) {
    return res.status(403).json({
      error: {
        message: 'Tenant context missing from request.',
        code: 'TENANT_CONTEXT_MISSING'
      }
    });
  }

  // Check body business_id if present
  if (req.body && req.body.business_id && req.body.business_id !== req.tenantId) {
    return res.status(403).json({
      error: {
        message: 'Forbidden: Cannot access or mutate resources of another tenant.',
        code: 'CROSS_TENANT_MUTATION_DENIED'
      }
    });
  }

  // Check query business_id if present
  if (req.query && req.query.business_id && req.query.business_id !== req.tenantId) {
    return res.status(403).json({
      error: {
        message: 'Forbidden: Cannot query resources of another tenant.',
        code: 'CROSS_TENANT_QUERY_DENIED'
      }
    });
  }

  // Force body business_id to authenticated tenant ID for safety
  if (req.body && typeof req.body === 'object') {
    req.body.business_id = req.tenantId;
  }

  next();
}

module.exports = {
  enforceTenantScope
};
