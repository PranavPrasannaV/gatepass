import express from "express";
import cors from "cors";
const app = express();

app.use(cors({ origin: "https://app.acme.com", credentials: true }));

export default app;
