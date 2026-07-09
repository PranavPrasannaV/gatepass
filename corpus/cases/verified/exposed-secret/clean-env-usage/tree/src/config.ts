// Secrets are read from the environment, never committed.
export const config = {
  apiBase: process.env.API_BASE ?? "https://api.example.com",
  awsKey: process.env.AWS_ACCESS_KEY_ID,
  anthropicKey: process.env.ANTHROPIC_API_KEY,
};

if (!config.awsKey) {
  throw new Error("AWS_ACCESS_KEY_ID is required");
}
