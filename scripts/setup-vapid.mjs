// Генерирует VAPID-ключи и дописывает их в .env.local (если их там ещё нет).
// Запуск на сервере из папки проекта:  node scripts/setup-vapid.mjs
import fs from "node:fs";
import path from "node:path";
import webpush from "web-push";

const file = path.join(process.cwd(), ".env.local");
let env = "";
try {
  env = fs.readFileSync(file, "utf8");
} catch {
  console.error("Не найден .env.local в текущей папке. Выполните из /var/www/kopkop");
  process.exit(1);
}

if (/NEXT_PUBLIC_VAPID_PUBLIC_KEY=\S/.test(env) && /VAPID_PRIVATE_KEY=\S/.test(env)) {
  console.log("VAPID-ключи уже есть в .env.local — ничего не меняю.");
  process.exit(0);
}

const subject = process.env.VAPID_SUBJECT || "mailto:dios07022004@gmail.com";
const { publicKey, privateKey } = webpush.generateVAPIDKeys();
const block = `\nNEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicKey}\nVAPID_PRIVATE_KEY=${privateKey}\nVAPID_SUBJECT=${subject}\n`;
fs.appendFileSync(file, block);
console.log("OK: VAPID-ключи добавлены в .env.local");
console.log("Дальше: npm run build && pm2 restart kopkop kopkop-bot");
