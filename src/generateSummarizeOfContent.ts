import { HttpFunction } from "@google-cloud/functions-framework";
import dotenv from "dotenv";
import { generateSummary } from "./lib/openAIConfig";
import mongoose, { Types } from "mongoose";
import { convert } from "html-to-text";
import cors from "cors";

dotenv.config();
const options = {
  wordwrap: 130,
  selectors: [
    { selector: "a", format: "skip" },
    { selector: "img", format: "skip" },
  ],
};

mongoose.set("strictQuery", false);

export const generateSummarizeOfContent: HttpFunction = async (req, res) => {
  const corsMiddleware = cors();
  corsMiddleware(req, res, async () => {
    // Set CORS headers
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    const { content } = req.body;
    if (!content) {
      return res.send({
        status: false,
        message: "Please input correct content",
      });
    }
    if (content.length == 0) {
      return res.send({
        status: false,
        message: "Please input correct content",
      });
    }
    try {
      const description = convert(content, options);
      const summary = await generateSummary(description);
      res.send({
        status: true,
        result: summary == "=" || summary == "" ? "" : summary,
      });
    } catch (error) {
      console.log(error);
      res.send({ error: error });
    }
  });
};
