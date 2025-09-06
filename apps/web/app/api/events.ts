import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { event, meta } = req.body ?? {};
  const r = await fetch(`${process.env.PROFILE_AGENT_URL}/profile/${process.env.SEED_USER_ID}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, meta }),
  });
  const txt = await r.text();
  res.status(r.status).setHeader("Content-Type", "application/json").send(txt);
}
