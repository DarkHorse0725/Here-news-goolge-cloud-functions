import { HttpFunction } from "@google-cloud/functions-framework";
import dotenv from "dotenv";
import { createEmbedding, generateTitle } from "./lib/openAIConfig";
import { convert } from "html-to-text";
import cors from "cors";

dotenv.config();

export const generateTitleForPost: HttpFunction = async (req, res) => {
  const corsMiddleware = cors();
  corsMiddleware(req, res, async () => {
    // Set CORS headers
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    const { content } = req.body;
    if (!content) {
      return res.send({ status: false, message: "Please input the content" });
    }
    if (content.length == 0) {
      return res.send({ status: false, message: "Please input the content" });
    }
    try {
      const description = convert(content);
      const title = await generateTitle(description);
      res.send({
        status: true,
        title: title,
      });
    } catch (error) {
      console.log(error);
      res.send({ status: false, error: error, title: "" });
    }
  });
};
