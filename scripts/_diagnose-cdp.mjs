#!/usr/bin/env node
/**
 * _diagnose-cdp.mjs — Chrome DevTools Protocol N-body diagnostic capture
 *
 * Navigates to the shader playground, switches to a preset, waits for the
 * simulation to evolve, then captures diagnostic readbacks at multiple time points.
 *
 * Zero external dependencies — uses only Node.js built-in modules.
 *
 * Usage: node _diagnose-cdp.mjs <port> <debug-port> <preset> <wait-seconds> <measure-count>
 *
 * Outputs JSON to stdout with diagnostic snapshots at each time point.
 */

import { request as httpRequest } from 'node:http';
import { randomBytes } from 'node:crypto';

const [appPort, debugPort, preset, waitSecsStr, measureCountStr] = process.argv.slice(2);

if (!appPort || !debugPort || !preset) {
  console.error('Usage: node _diagnose-cdp.mjs <app-port> <debug-port> <preset> [wait-secs] [measure-count]');
  process.exit(1);
}

const waitSecs = parseFloat(waitSecsStr || '10');
const measureCount = parseInt(measureCountStr || '3');

// Global timeout
setTimeout(() => {
  console.error('Error: Global timeout (90s). Aborting.');
  process.exit(1);
}, 90_000).unref();

// ─── HTTP helpers ────────────────────────────────────────────────────────────

function httpGet(url) {
  return new Promise((resolve, reject) => {
    httpRequest(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error(`Failed to parse JSON from ${url}`)); }
      });
    }).on('error', reject).end();
  });
}

// ─── Minimal WebSocket client (RFC 6455) ─────────────────────────────────────

function connectWebSocket(wsUrl) {
  return new Promise((resolve, reject) => {
    const url = new URL(wsUrl);
    const key = randomBytes(16).toString('base64');
    const req = httpRequest({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        Connection: 'Upgrade',
        Upgrade: 'websocket',
        'Sec-WebSocket-Key': key,
        'Sec-WebSocket-Version': '13',
      },
    });
    req.on('upgrade', (_res, socket, head) => resolve(new WSConnection(socket, head)));
    req.on('error', reject);
    req.setTimeout(10_000, () => req.destroy(new Error('WebSocket connection timeout')));
    req.end();
  });
}

class WSConnection {
  #socket;
  #buf = Buffer.alloc(0);
  #fragments = [];
  #nextId = 1;
  #pending = new Map();

  constructor(socket, head) {
    this.#socket = socket;
    if (head.length > 0) this.#buf = Buffer.from(head);
    socket.on('data', (chunk) => {
      this.#buf = Buffer.concat([this.#buf, chunk]);
      this.#drain();
    });
    socket.on('error', (err) => console.error(`WS error: ${err.message}`));
  }

  send(method, params = {}) {
    const id = this.#nextId++;
    return new Promise((resolve, reject) => {
      this.#pending.set(id, (msg) => {
        if (msg.error) reject(new Error(`CDP ${method}: ${msg.error.message}`));
        else resolve(msg.result);
      });
      this.#writeFrame(1, Buffer.from(JSON.stringify({ id, method, params })));
    });
  }

  close() {
    try { this.#writeFrame(8, Buffer.alloc(0)); this.#socket.end(); } catch { /* */ }
  }

  #writeFrame(opcode, payload) {
    const mask = randomBytes(4);
    const len = payload.length;
    let header;
    if (len < 126) {
      header = Buffer.alloc(6);
      header[0] = 0x80 | opcode;
      header[1] = 0x80 | len;
      mask.copy(header, 2);
    } else if (len < 65536) {
      header = Buffer.alloc(8);
      header[0] = 0x80 | opcode;
      header[1] = 0x80 | 126;
      header.writeUInt16BE(len, 2);
      mask.copy(header, 4);
    } else {
      header = Buffer.alloc(14);
      header[0] = 0x80 | opcode;
      header[1] = 0x80 | 127;
      header.writeBigUInt64BE(BigInt(len), 2);
      mask.copy(header, 10);
    }
    const masked = Buffer.from(payload);
    for (let i = 0; i < masked.length; i++) masked[i] ^= mask[i % 4];
    this.#socket.write(Buffer.concat([header, masked]));
  }

  #drain() {
    while (this.#buf.length >= 2) {
      const b0 = this.#buf[0];
      const b1 = this.#buf[1];
      const fin = (b0 & 0x80) !== 0;
      const opcode = b0 & 0x0f;
      let payloadLen = b1 & 0x7f;
      let offset = 2;
      if (payloadLen === 126) {
        if (this.#buf.length < 4) return;
        payloadLen = this.#buf.readUInt16BE(2);
        offset = 4;
      } else if (payloadLen === 127) {
        if (this.#buf.length < 10) return;
        payloadLen = Number(this.#buf.readBigUInt64BE(2));
        offset = 10;
      }
      const totalLen = offset + payloadLen;
      if (this.#buf.length < totalLen) return;
      const payload = this.#buf.subarray(offset, totalLen);
      this.#buf = Buffer.from(this.#buf.subarray(totalLen));
      if (opcode === 8) { this.#socket.end(); return; }
      if (opcode === 9) { this.#writeFrame(10, Buffer.from(payload)); continue; }
      if (opcode === 10) continue;
      this.#fragments.push(Buffer.from(payload));
      if (fin) {
        const text = Buffer.concat(this.#fragments).toString('utf8');
        this.#fragments = [];
        this.#onMessage(text);
      }
    }
  }

  #onMessage(text) {
    const msg = JSON.parse(text);
    if (msg.id != null && this.#pending.has(msg.id)) {
      this.#pending.get(msg.id)(msg);
      this.#pending.delete(msg.id);
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) {
    const desc = result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'unknown';
    throw new Error(`JS error: ${desc}`);
  }
  return result.result.value;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Connect to Chrome
  const targets = await httpGet(`http://127.0.0.1:${debugPort}/json/list`);
  const page = targets.find((t) => t.type === 'page');
  if (!page) { console.error('Error: No page target found.'); process.exit(1); }

  const cdp = await connectWebSocket(page.webSocketDebuggerUrl);

  // 2. Set viewport
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 800, height: 600, deviceScaleFactor: 1, mobile: false,
  });

  // 3. Navigate
  await cdp.send('Page.enable');
  const appUrl = `https://localhost:${appPort}`;
  console.error(`Navigating: ${appUrl}`);
  await cdp.send('Page.navigate', { url: appUrl });

  // 4. Wait for canvas + simulation init
  const pollStart = Date.now();
  while (Date.now() - pollStart < 30_000) {
    try {
      const ready = await evaluate(cdp, "typeof window.__simDiagnose === 'function'");
      if (ready) break;
    } catch { /* context may change during load */ }
    await sleep(500);
  }
  console.error('Simulation ready.');

  // 5. Hide error overlay
  await evaluate(cdp, `
    const el = document.getElementById('gpu-error-overlay');
    if (el) el.style.display = 'none';
    'ok';
  `);

  // 6. Switch preset
  console.error(`Switching to preset: ${preset}`);
  const presetResult = await evaluate(cdp, `window.__simPreset(${JSON.stringify(preset)})`);
  if (presetResult !== 'ok') {
    console.error(`Warning: Preset switch returned: ${presetResult}`);
  }

  // 7. Get initial state
  const stateJson = await evaluate(cdp, `JSON.stringify(window.__simState())`);
  const state = JSON.parse(stateJson);
  console.error(`State: ${state.count} particles, G=${state.G}, distribution=${state.distribution}`);

  // 8. Capture diagnostics at multiple time points
  const intervalSecs = waitSecs / Math.max(1, measureCount - 1);
  const snapshots = [];

  for (let m = 0; m < measureCount; m++) {
    if (m === 0) {
      // First measurement after a short init delay
      await sleep(1500);
    } else {
      await sleep(intervalSecs * 1000);
    }

    const wallTime = m === 0 ? 1.5 : 1.5 + m * intervalSecs;

    console.error(`Measuring t=${wallTime.toFixed(1)}s...`);
    const diagJson = await evaluate(cdp, `
      window.__simDiagnose().then(d => JSON.stringify(d))
    `);
    const diag = JSON.parse(diagJson);
    // Also grab virial controller stats if available
    let vStats = {};
    try {
      const statsJson = await evaluate(cdp, `JSON.stringify(window.__simStats())`);
      vStats = JSON.parse(statsJson);
    } catch { /* stats not available on all sims */ }
    snapshots.push({ t: Math.round(wallTime * 10) / 10, ...diag, virial: vStats });
  }

  // 9. Compute summary
  const first = snapshots[0];
  const last = snapshots[snapshots.length - 1];
  const dt = last.t - first.t;

  const summary = {
    preset,
    particles: state.count,
    distribution: state.distribution,
    G: state.G,
    snapshots: snapshots.map(s => ({
      t: s.t,
      rmsRadius: round(s.rmsRadius),
      rmsHeight: round(s.rmsHeight),
      rmsSpeed: round(s.rmsSpeed),
      maxRadius: round(s.maxRadius),
      tangentialFrac: round(s.tangentialFraction),
      armContrast: round(s.armContrast),
      radialProfile: s.radialProfile,
      angularProfile: s.angularProfile,
      ...(s.virial?.virial != null ? {
        virialRatio: round(s.virial.virial),
        ctrlDamping: round(s.virial.damping),
        ctrlTidal: round(s.virial.tidal),
        keGpu: round(s.virial.ke),
        peGpu: round(s.virial.pe),
      } : {}),
    })),
    trend: dt > 0 ? {
      radiusRate: round((last.rmsRadius - first.rmsRadius) / dt),
      speedRate: round((last.rmsSpeed - first.rmsSpeed) / dt),
      heightRate: round((last.rmsHeight - first.rmsHeight) / dt),
      status: classifyStatus(first, last, dt),
    } : null,
  };

  // 10. Output
  console.log(JSON.stringify(summary, null, 2));
  cdp.close();
}

function round(v) { return Math.round(v * 1000) / 1000; }

function classifyStatus(first, last, dt) {
  const radiusRate = (last.rmsRadius - first.rmsRadius) / dt;
  const parts = [];

  if (radiusRate > 0.5) parts.push('EXPANDING');
  else if (radiusRate < -0.3) parts.push('COLLAPSING');
  else parts.push('STABLE');

  if (last.rmsHeight < 0.05) parts.push('FLAT');
  else if (last.rmsHeight < 0.3) parts.push('THIN');
  else parts.push('THICK');

  if (last.maxRadius > 7) parts.push('ESCAPING');
  if (last.tangentialFraction > 0.9) parts.push('CIRCULAR-ORBITS');
  else if (last.tangentialFraction < 0.5) parts.push('CHAOTIC');

  if (last.armContrast > 0.5) parts.push('ARM-STRUCTURE');
  else parts.push('NO-ARMS');

  return parts.join(' | ');
}

main().catch((err) => {
  console.error(`Diagnostic capture failed: ${err.message}`);
  process.exit(1);
});
