// Генерация VAPID-ключей для web-push. Запуск: node scripts/gen-vapid.mjs
// Вставьте вывод в .env.local (приватный — секрет, не коммитить!).
import webpush from "web-push";

const { publicKey, privateKey } = webpush.generateVAPIDKeys();

console.log("\n# ── Web Push (VAPID) — добавьте в .env.local ──");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${privateKey}`);
console.log(`VAPID_SUBJECT=mailto:dios07022004@gmail.com`);
console.log("\n# Публичный ключ виден в браузере (NEXT_PUBLIC) — это нормально.");
console.log("# Приватный ключ — СЕКРЕТ. После изменения: npm run build && pm2 restart kopkop.\n");
