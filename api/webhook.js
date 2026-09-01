import crypto from "node:crypto";

const LINE_REPLY_ENDPOINT = "https://api.line.me/v2/bot/message/reply";
const LIFF_URL = "https://liff.line.me/2011368877-0bOXvh1g";

async function readRawBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function isValidSignature(rawBody, signature) {
  if (!signature || !process.env.LINE_CHANNEL_SECRET) return false;
  const expected = crypto
    .createHmac("sha256", process.env.LINE_CHANNEL_SECRET)
    .update(rawBody)
    .digest("base64");
  const received = Buffer.from(signature);
  const calculated = Buffer.from(expected);
  return received.length === calculated.length && crypto.timingSafeEqual(received, calculated);
}

function weddingGuideMessage() {
  return {
    type: "flex",
    altText: "🕊️WEDDING GUIDEを受け取る📨",
    contents: {
      type: "bubble",
      size: "kilo",
      styles: {
        header: { backgroundColor: "#173A30" },
        body: { backgroundColor: "#FFFDF8" },
        footer: { backgroundColor: "#FFFDF8" }
      },
      header: {
        type: "box",
        layout: "vertical",
        paddingAll: "24px",
        contents: [
          { type: "text", text: "HAYA & HAZUKI", color: "#D8C697", size: "xs", weight: "bold", align: "center" },
          { type: "text", text: "WEDDING GUIDE", color: "#FFFFFF", size: "xl", weight: "bold", align: "center", margin: "md" },
          { type: "text", text: "03 OCTOBER 2026 · MADAME TŌKI", color: "#EEE7DC", size: "xxs", align: "center", margin: "sm" }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "20px",
        contents: [
          { type: "text", text: "当日のご案内です", color: "#20352D", size: "md", weight: "bold", wrap: true },
          { type: "text", text: "当日の予定や会場案内、あなたとの思い出の写真、タイムカプセルをまとめています♩", color: "#65716B", size: "sm", wrap: true, margin: "md" }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "20px",
        paddingTop: "0px",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#173A30",
            height: "sm",
            action: { type: "uri", label: "🕊️WEDDING GUIDEを受け取る📨", uri: LIFF_URL }
          }
        ]
      }
    }
  };
}

async function replyToFollowEvent(event) {
  const response = await fetch(LINE_REPLY_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
    },
    body: JSON.stringify({ replyToken: event.replyToken, messages: [weddingGuideMessage()] })
  });
  if (!response.ok) throw new Error(`LINE reply failed: ${response.status}`);
}

export default async function handler(request, response) {
  if (request.method === "GET") return response.status(200).json({ status: "ok" });
  if (request.method !== "POST") return response.status(405).end();

  const rawBody = await readRawBody(request);
  if (!isValidSignature(rawBody, request.headers["x-line-signature"])) {
    return response.status(401).json({ error: "invalid signature" });
  }

  try {
    const payload = JSON.parse(rawBody.toString("utf8"));
    const followEvents = payload.events.filter((event) => event.type === "follow");
    await Promise.all(followEvents.map(replyToFollowEvent));
    return response.status(200).json({ status: "ok" });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: "webhook failed" });
  }
}
