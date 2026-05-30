import { createVertex } from "@ai-sdk/google-vertex";

const projectId = process.env.VERTEX_PROJECT_ID;
const location = process.env.VERTEX_LOCATION ?? "us-central1";
const clientEmail = process.env.VERTEX_CLIENT_EMAIL;
const privateKey = process.env.VERTEX_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.warn(
    "[vertex] Missing one of VERTEX_PROJECT_ID, VERTEX_CLIENT_EMAIL, VERTEX_PRIVATE_KEY — chat endpoint will fail until set.",
  );
}

export const vertex = createVertex({
  project: projectId,
  location,
  googleAuthOptions:
    clientEmail && privateKey
      ? {
          credentials: {
            client_email: clientEmail,
            private_key: privateKey,
          },
        }
      : undefined,
});

export const MODEL_ID = process.env.MODEL ?? "gemini-2.5-flash";
export const chatModel = vertex(MODEL_ID);
