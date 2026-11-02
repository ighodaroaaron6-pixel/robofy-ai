
const OpenAI = require("openai");
const { formidable } = require("formidable");
const fs = require("fs/promises");
const { toFile } = require("openai/uploads");

// Initialize OpenAI
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Main transformation handler
async function handler(req, res) {

  // Only allow POST requests
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");

    return res.status(405).json({
      error: "Method not allowed."
    });
  }

  // Check API key
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error: "OpenAI API key is missing. Configure OPENAI_API_KEY in Vercel."
    });
  }

  let temporaryPath = null;

  try {

    // Configure image upload
    const form = formidable({
      uploadDir: "/tmp",
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024,
      maxFiles: 1,
      allowEmptyFiles: false,
      filter: ({ mimetype }) => {
        return [
          "image/jpeg",
          "image/png",
          "image/webp"
        ].includes(mimetype);
      }
    });

    // Parse uploaded image
    const [fields, files] = await form.parse(req);

    const uploaded = Array.isArray(files.photo)
      ? files.photo[0]
      : files.photo;

    if (!uploaded) {
      return res.status(400).json({
        error: "Please upload a valid JPG, PNG or WEBP image."
      });
    }

    temporaryPath = uploaded.filepath;

    // Read uploaded image
    const buffer = await fs.readFile(temporaryPath);

    // Convert image for OpenAI
    const imageFile = await toFile(
      buffer,
      uploaded.originalFilename || "photo.png",
      {
        type: uploaded.mimetype || "image/png"
      }
    );

    // Generate robot transformation
    const result = await client.images.edit({

      model: "gpt-image-2.5-sunburst",

      image: imageFile,

      prompt: `
        Transform the person in the uploaded photograph
        into an incredibly realistic futuristic humanoid robot.

        IMPORTANT INSTRUCTIONS:

        1. Preserve the person's recognizable facial identity.
        2. Preserve their hairstyle and general appearance.
        3. Keep the original body pose and positioning.
        4. Transform their skin and body into realistic
           advanced robotic materials.
        5. Add detailed metallic components,
           mechanical joints and futuristic armor.
        6. Add subtle glowing LED lights.
        7. Use realistic reflections and cinematic lighting.
        8. Preserve the original background and composition
           as much as possible.
        9. Make the transformation look professional,
           realistic and visually impressive.
        10. Do not turn the person into a cartoon.

        The final result should look like a real photograph
        of the person transformed into an advanced robot.
      `,

      quality: "high",
      size: "1024x1024",
      output_format: "png"
    });

    // Get generated image
    const generatedImage = result.data?.[0]?.b64_json;

    if (!generatedImage) {
      throw new Error(
        "AI did not return a generated image."
      );
    }

    // Send image to frontend
    return res.status(200).json({
      success: true,
      imageUrl: `data:image/png;base64,${generatedImage}`
    });

  } catch (error) {

    console.error("ROBOFY AI ERROR:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Image transformation failed."
    });

  } finally {

    // Delete temporary uploaded image
    if (temporaryPath) {
      try {
        await fs.unlink(temporaryPath);
      } catch (cleanupError) {
        console.error(
          "Temporary file cleanup failed:",
          cleanupError
        );
      }
    }
  }
}

// Export API handler
module.exports = handler;

// Disable Vercel's default body parser
module.exports.config = {
  api: {
    bodyParser: false
  }
};

