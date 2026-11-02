# ROBOFY AI

A small Vercel website that lets a user upload a photo and request an AI robot transformation.

## Files
- `index.html` — website interface
- `api/transform.js` — secure server endpoint; the API key stays on Vercel
- `package.json` — server dependencies

## Deploy
1. Create a GitHub repository named `robofy-ai`.
2. Upload all files while preserving the `api` folder.
3. In Vercel, import that GitHub repository and deploy.
4. In Vercel → Project → Settings → Environment Variables, add:
   - Name: `OPENAI_API_KEY`
   - Value: your secret OpenAI API key
   Select Production, Preview and Development if offered, then save.
5. Redeploy the project.
6. Open the Vercel website URL and test with a photo.

Never put your API key in `index.html`, GitHub, or a message to anyone. ChatGPT subscription and API billing are separate. Check API billing and usage limits before testing.

## Important
The image model name in `api/transform.js` must be available to your OpenAI API account. If the API returns a model-access error, check the current Images API model list and replace the `model` value with a model your API account can use.
