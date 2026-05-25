import { createServer } from "http";
import { WebSocket } from "ws";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const WS_PORT = parseInt(process.env.EUFY_WS_PORT || "3000", 10);
const HTTP_PORT = parseInt(process.env.TFA_HTTP_PORT || "3001", 10);
const WS_HOST = process.env.EUFY_WS_HOST || "127.0.0.1";

let tfaPending = false;
let captchaPending = false;
let captchaId = null;
let captchaImage = null;
let wsConnected = false;
let ws = null;
let messageId = 0;
let pendingResolves = new Map();

const indexHtml = readFileSync(join(__dirname, "index.html"), "utf-8");

function connectWebSocket() {
  const url = `ws://${WS_HOST}:${WS_PORT}`;
  console.log(`[2fa-helper] Connecting to eufy-security-ws at ${url}`);

  ws = new WebSocket(url);

  ws.on("open", () => {
    wsConnected = true;
    console.log("[2fa-helper] Connected to eufy-security-ws");
    sendWsMessage({
      command: "set_api_schema",
      messageId: `helper-schema-${messageId++}`,
      schemaVersion: 21,
    });
    setTimeout(() => {
      sendWsMessage({
        command: "start_listening",
        messageId: `helper-listen-${messageId++}`,
      });
    }, 500);
  });

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === "event" && msg.event?.event === "verify code") {
        tfaPending = true;
        captchaPending = false;
        console.log("[2fa-helper] 2FA verification code requested");
      }

      if (msg.type === "event" && msg.event?.event === "captcha request") {
        captchaPending = true;
        tfaPending = false;
        captchaId = msg.event.captchaId;
        captchaImage = msg.event.captcha;
        console.log(`[2fa-helper] Captcha requested (id: ${captchaId})`);
      }

      if (msg.type === "event" && msg.event?.event === "connected") {
        tfaPending = false;
        captchaPending = false;
        captchaId = null;
        captchaImage = null;
        console.log("[2fa-helper] Driver connected successfully");
      }

      if (msg.type === "result" && msg.messageId) {
        const resolve = pendingResolves.get(msg.messageId);
        if (resolve) {
          pendingResolves.delete(msg.messageId);
          resolve(msg);
        }
      }
    } catch (e) {
      // ignore parse errors
    }
  });

  ws.on("close", () => {
    wsConnected = false;
    console.log("[2fa-helper] Disconnected from eufy-security-ws, reconnecting in 5s...");
    setTimeout(connectWebSocket, 5000);
  });

  ws.on("error", (err) => {
    console.error("[2fa-helper] WebSocket error:", err.message);
  });
}

function sendWsMessage(msg) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function sendCommand(command, extraFields) {
  return new Promise((resolve, reject) => {
    if (!wsConnected) {
      reject(new Error("Not connected to eufy-security-ws"));
      return;
    }

    const msgId = `helper-cmd-${messageId++}`;
    const timeout = setTimeout(() => {
      pendingResolves.delete(msgId);
      reject(new Error("Timeout waiting for response"));
    }, 30000);

    pendingResolves.set(msgId, (result) => {
      clearTimeout(timeout);
      resolve(result);
    });

    sendWsMessage({ command, messageId: msgId, ...extraFields });
  });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "GET" && (req.url === "/" || req.url === "/index.html")) {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(indexHtml);
    return;
  }

  if (req.method === "GET" && req.url === "/status") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      tfaPending,
      captchaPending,
      captchaImage: captchaPending ? captchaImage : null,
      wsConnected,
    }));
    return;
  }

  if (req.method === "POST" && req.url === "/verify") {
    try {
      const body = await parseBody(req);
      const code = body.code;

      if (!code || !/^\d{4,6}$/.test(code)) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: "Invalid code. Must be 4-6 digits." }));
        return;
      }

      if (!wsConnected) {
        res.writeHead(503, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: "Not connected to eufy-security-ws. Please wait." }));
        return;
      }

      const result = await sendCommand("driver.set_verify_code", { verifyCode: code });
      tfaPending = false;

      if (result.success) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, message: "Verification code accepted." }));
      } else {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: "Verification code rejected." }));
      }
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  if (req.method === "POST" && req.url === "/captcha") {
    try {
      const body = await parseBody(req);
      const code = body.code;

      if (!code || code.trim().length === 0) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: "Captcha answer is required." }));
        return;
      }

      if (!wsConnected) {
        res.writeHead(503, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: "Not connected to eufy-security-ws. Please wait." }));
        return;
      }

      const result = await sendCommand("driver.set_captcha", {
        captchaId: captchaId,
        captcha: code.trim(),
      });

      captchaPending = false;
      captchaId = null;
      captchaImage = null;

      if (result.success) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, message: "Captcha accepted." }));
      } else {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: "Captcha rejected. A new one may be requested." }));
      }
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(HTTP_PORT, "0.0.0.0", () => {
  console.log(`[2fa-helper] HTTP server listening on port ${HTTP_PORT}`);
  console.log(`[2fa-helper] Open http://<your-ha-ip>:${HTTP_PORT} to enter 2FA code or captcha`);
  connectWebSocket();
});
