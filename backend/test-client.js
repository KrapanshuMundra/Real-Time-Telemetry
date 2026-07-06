// Native fetch is supported globally in Node.js 18+

const API_URL = 'http://127.0.0.1:5000/api';

async function runTests() {
  console.log('==================================================');
  console.log('   STARTING TELEMETRY ENGINE VERIFICATION TESTS   ');
  console.log('==================================================\n');

  try {
    // 1. Authenticate Admin
    console.log('[Step 1] Logging in as Admin...');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    if (!loginRes.ok) {
      throw new Error(`Login failed with status ${loginRes.status}`);
    }
    
    const { token } = await loginRes.json();
    console.log('✔ Admin authenticated successfully.\n');

    // Fetch initial device to get its deviceId
    console.log('[Step 2] Retrieving available devices...');
    const devicesRes = await fetch(`${API_URL}/devices`);
    const devices = await devicesRes.json();
    if (devices.length === 0) {
      throw new Error('No devices found in database to test.');
    }
    const testDevice = devices[0];
    const deviceId = testDevice.deviceId;
    console.log(`✔ Found device to test: ${testDevice.name} (${deviceId})\n`);

    // 2. Validate Bad Request on Missing Idempotency Key
    console.log('[Step 3] Verifying status toggle fails when X-Idempotency-Key is missing...');
    const failRes = await fetch(`${API_URL}/devices/${deviceId}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: 'maintenance' })
    });

    const failBody = await failRes.json();
    if (failRes.status === 400) {
      console.log('✔ Success: Server rejected request with status 400.');
      console.log(`Response message: "${failBody.message}"\n`);
    } else {
      throw new Error(`Expected status 400 on missing key, got ${failRes.status}`);
    }

    // 3. Validate Idempotent Status Updates
    console.log('[Step 4] Verifying Idempotent State Management...');
    const idempotencyKey = `verification-key-${Date.now()}`;
    console.log(`Generated Idempotency Key: ${idempotencyKey}`);

    console.log('Sending first status change request (Online -> Maintenance)...');
    const req1Promise = fetch(`${API_URL}/devices/${deviceId}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify({ status: 'maintenance' })
    });

    console.log('Sending duplicate status change request with identical key immediately...');
    const req2Promise = fetch(`${API_URL}/devices/${deviceId}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify({ status: 'maintenance' })
    });

    const [res1, res2] = await Promise.all([req1Promise, req2Promise]);
    const body1 = await res1.json();
    const body2 = await res2.json();

    console.log(`Response 1: Status Code = ${res1.status}`);
    console.log(`Response 2 (Duplicate): Status Code = ${res2.status}`);

    if (res1.ok && res2.ok) {
      console.log('✔ Success: Both requests completed with 200 OK.');
      console.log(`Response 1 Audit Log ID: ${body1.auditLogId}`);
      console.log(`Response 2 Audit Log ID: ${body2.auditLogId}`);
      if (body1.auditLogId === body2.auditLogId) {
        console.log('✔ Verify: Response 2 matches Response 1 audit record exactly (Idempotent cache hit).\n');
      } else {
        throw new Error('Audit Log IDs differ! The second request executed redundantly.');
      }
    } else {
      throw new Error(`One or both status updates failed. Req1: ${res1.status}, Req2: ${res2.status}`);
    }

    // 4. Validate Zone Reassignment
    console.log('[Step 5] Verifying Zone Reassignment transaction flow...');
    const zonesRes = await fetch(`${API_URL}/zones`);
    const zones = await zonesRes.json();
    if (zones.length < 2) {
      throw new Error('Need at least 2 zones to verify relocation.');
    }

    const currentZone = testDevice.zone;
    // Find target zone different from current zone
    const targetZone = zones.find(z => currentZone && z._id !== currentZone._id || z._id !== currentZone);
    
    if (!targetZone) {
      throw new Error('Could not resolve suitable target zone for reassignment.');
    }

    console.log(`Relocating device ${deviceId} to Zone: ${targetZone.name} (${targetZone._id})`);
    
    const reassignRes = await fetch(`${API_URL}/zones/reassign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ deviceId, newZoneId: targetZone._id })
    });

    const reassignBody = await reassignRes.json();
    if (reassignRes.ok) {
      console.log('✔ Success: Zone reassigned.');
      console.log(`Transaction Mode: ${reassignBody.transactionMode}`);
      console.log(`Updated Device Zone Ref: ${reassignBody.device.zone.name || reassignBody.device.zone}\n`);
    } else {
      throw new Error(`Zone reassignment failed with status ${reassignRes.status}: ${reassignBody.error}`);
    }

    console.log('==================================================');
    console.log('   ALL INTEGRITY VERIFICATION TESTS PASSED       ');
    console.log('==================================================');

  } catch (err) {
    console.error('\n❌ Verification Test Failed:');
    console.error(err.message);
    process.exit(1);
  }
}

// Check if running directly
runTests();
