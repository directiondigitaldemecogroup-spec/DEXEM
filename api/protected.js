import fs from "fs";
import path from "path";

export default function handler(req, res) {
  const auth = req.headers.authorization;
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASS;

  if (!auth) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Protected"');
    res.status(401).end("Auth required");
    return;
  }

  const [scheme, encoded] = auth.split(" ");
  const [u, p] = Buffer.from(encoded, "base64").toString().split(":");

  if (u !== user || p !== pass) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Protected"');
    res.status(401).end("Access denied");
    return;
  }

  // ✅ lire le fichier HTML et le renvoyer
  const filePath = path.join(process.cwd(), "index.html");
  try {
    const html = fs.readFileSync(filePath, "utf8");
    res.setHeader("Content-Type", "text/html");
    res.status(200).send(html);
  } catch (err) {
    console.error("Erreur lecture fichier :", err);
    res.status(500).send("Internal Server Error");
  }
}
