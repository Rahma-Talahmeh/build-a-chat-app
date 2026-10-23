import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3001;

// 1. إنشاء سيرفر HTTP يقرأ ملف index.html
const server = http.createServer((req, res) => {
  const filePath = path.join(__dirname, 'public', 'index.html');
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Server Error');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(data);
  });
});

// 2. إنشاء WebSocketServer وتمرير الخيار { server }
const wss = new WebSocketServer({ server });

// دالة مسبقة للـ Broadcast لتسهيل إرسال الرسائل لجميع العملاء المتصلين
function broadcast(data) {
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// 3. تسجيل مستمع 'connection' على wss
wss.on('connection', (socket, req) => {
  // 4 & 5. استخراج اسم المستخدم من الـ Query String
  const username = new URL(req.url, "http://localhost").searchParams.get("username") || "Anonymous";

  // 7 & 8. إرسال رسالة نظام للجميع بعد انضمام المستخدم
  broadcast({
    type: 'system',
    text: `${username} joined`
  });

  // 9. تسجيل مستمع 'message' لإرسال رسائل الدردشة للجميع
  socket.on('message', (messageBuffer) => {
    try {
      const parsedData = JSON.parse(messageBuffer.toString());
      broadcast({
        type: 'chat',
        username: parsedData.username,
        text: parsedData.text
      });
    } catch (err) {
      console.error('Error parsing JSON message:', err);
    }
  });

  // 10. تسجيل مستمع 'close' عند مغادرة المستخدم
  socket.on('close', () => {
    broadcast({
      type: 'system',
      text: `${username} left`
    });
  });
});

// 11. تشغيل السيرفر وطباعة الرسالة المطلوبة
server.listen(PORT, () => {
  console.log(`Chat server running at http://localhost:${PORT}`);
});