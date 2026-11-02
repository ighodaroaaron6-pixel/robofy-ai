
const OpenAI = require("openai");
const formidable = require("formidable");
const fs = require("fs/promises");
const { toFile } = require("openai/uploads");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error: "AI API key is not configured."
    });
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

    const photo = Array.isArray(files.photo)
      ? files.photo[0]
      : files.photo;

    if (!photo) {
      return res.status(400).json({
        error: "Please upload a JPG, PNG or WEBP photo."
      });
    }

    temporaryPath = photo.filepath;

    const buffer = await fs.readFile(temporaryPath);

    const image = await toFile(
      buffer,
      photo.originalFilename || "photo.png",
      { type: photo.mimetype || "image/png" }
    );

    const result = await client.images.edit({
      model: "gpt-image-2.5-sunburst",
      image,
      prompt: `
        Transform this person into a realistic futuristic
        humanoid robot. Preserve their recognizable face,
        hairstyle, pose and original composition.

        Give them polished metallic skin, mechanical
        details, futuristic robotic eyes and cinematic
        lighting. Make the result photorealistic.
      `
    });

    const base64 = result.data[0].b64_json;

    return res.status(200).json({
      imageUrl: "data:image/png;base64," + base64
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Could not transform the image. " + error.message
    });

  } finally {
    if (temporaryPath) {
      try {
        await fs.unlink(temporaryPath);
      } catch (_) {}
    }
  }
}

module.exports = handler;

module.exports.config = {
  api: {
    bodyParser: false
  }
};
