import { HttpFunction } from "@google-cloud/functions-framework";
import { PineconeClient } from "@pinecone-database/pinecone";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

export const deleteEmbedding: HttpFunction = async (req, res) => {
  const corsMiddleware = cors();
  corsMiddleware(req, res, async () => {
    // Set CORS headers
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    const { postids } = req.body;
    if (!postids) {
      res.send({ status: false });
      return;
    }
    if (postids.length == 0) {
      res.send({ status: false });
      return;
    }
    try {
      const pinecone = new PineconeClient();
      await pinecone.init({
        environment: process.env.PINECONE_ENV || "",
        apiKey: process.env.PINECONE_API_KEY || "",
      });
      const pineindex = pinecone.Index("openai");
      await pineindex.delete1({
        ids: postids,
        namespace: "openai-index",
      });
      res.send({ status: true });
    } catch (error) {
      res.send({ status: false });
    }
  });
};
