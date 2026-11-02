const OpenAI = require("openai");
const formidable = require("formidable");
const fs = require("fs/promises");
const { toFile } = require("openai/uploads");

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "The site owner has not configured the AI API key." });
  }

  let temporaryPath;
  try {
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024,
      maxFiles: 1,
      filter: ({ mimetype }) =>
        ["image/jpeg", "image/png", "image/webp"].includes(mimetype)
    });

    const [fields, files] = await form.parse(req);
    const uploaded = Array.isArray(files.photo) ? files.photo[0] : files.photo;
    if (!uploaded) {
      return res.status(400).json({ error: "Please upload a JPG, PNG or WEBP photo under 10 MB." });
    }
    temporaryPath = uploaded.filepath;

    const buffer = await fs.readFile(temporaryPath);
    const imageFile = await toFile(
      buffer,
      uploaded.originalFilename || "photo.png",
      { type: uploaded.mimetype || "image/png" }
    );

    const result = await client.images.edit({
      model: "gpt-image-2.5-sunburst",
      image: imageFile,
      prompt: "Transform the person in this photo into a photorealistic futuristic humanoid robot. Preserve the person's recognizable facial identity, hairstyle, pose, clothing silhouette, and overall composition. Add elegant metallic and advanced mechanical details, subtle glowing robotic elements, realistic materials, and cinematic lighting. Keep the result tasteful and highly detailed."
    });

    const base64 = result.data && result.data[0] && result.data[0].b64_json;
    if (!base64) throw new Error("The image service returned no image.");
    return res.status(200).json({ imageUrl: "data:image/png;base64," + base64 });
  } catch (error) {
    console.error("ROBOFY transform error:", error);
    const message = error && error.message ? error.message : "Unknown error.";
    return res.status(500).json({ error: "Could not transform the image. " + message });
  } finally {
    if (temporaryPath) {
      try { await fs.unlink(temporaryPath); } catch (_) {}
    }
  }
}

module.exports = handler;
module.exports.config = { api: { bodyParser: false } };
