const assert = require('assert');
const test = require('node:test');
const { enforceTenantScope } = require('../src/middleware/tenant');

test('Tenant Isolation Middleware - Block Cross-Tenant Body Manipulation', (t) => {
  const req = {
    tenantId: '11111111-1111-1111-1111-111111111111', // Business A
    body: {
      business_id: '22222222-2222-2222-2222-222222222222', // Business B (Attacker attempt)
      name: 'Malicious Service Modification'
    }
  };

  let statusCode = 200;
  let responseData = null;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    }
  };

  let nextCalled = false;
  const next = () => { nextCalled = true; };

  enforceTenantScope(req, res, next);

  assert.strictEqual(nextCalled, false, 'Next should not be called when cross-tenant ID is provided');
  assert.strictEqual(statusCode, 403, 'Should respond with 403 Forbidden');
  assert.strictEqual(responseData.error.code, 'CROSS_TENANT_MUTATION_DENIED', 'Should output CROSS_TENANT_MUTATION_DENIED error code');
});

test('Tenant Isolation Middleware - Allow Matching Tenant Request', (t) => {
  const req = {
    tenantId: '11111111-1111-1111-1111-111111111111',
    body: {
      name: 'Valid Service'
    }
  };

  let nextCalled = false;
  const next = () => { nextCalled = true; };

  enforceTenantScope(req, {}, next);

  assert.strictEqual(nextCalled, true, 'Next should be called for matching tenant request');
  assert.strictEqual(req.body.business_id, '11111111-1111-1111-1111-111111111111', 'Body business_id should be assigned to authenticated tenant ID');
});
