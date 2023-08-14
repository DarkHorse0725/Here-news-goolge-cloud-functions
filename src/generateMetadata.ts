import { HttpFunction } from "@google-cloud/functions-framework";
import dotenv from "dotenv";
import { detectLanguageCodes } from "./lib/openAIConfig";
import mongoose from "mongoose";
import { convert } from "html-to-text";
import { Post } from "./models";
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

export const generateMetadata: HttpFunction = async (req, res) => {
  const corsMiddleware = cors();
  corsMiddleware(req, res, async () => {
    // Set CORS headers
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    const { post_id } = req.body;
    if (!post_id) {
      return res
        .status(400)
        .send({ status: false, message: "Please input correct id" });
    }
    if (post_id.length == 0) {
      return res
        .status(400)
        .send({ status: false, message: "Please input correct id" });
    }
    try {
      const URL = process.env.MONGO_DB_URL || "";
      await mongoose.connect(URL);
      const post = await Post.findById(post_id)
        .select("text meta preview")
        .populate("preview");
      if (!post) {
        return res
          .status(404)
          .send({ status: false, message: "Post not found!" });
      }

      let description = convert(post!.text!, options);
      if (post?.preview && (post?.preview as any).title) {
        description += (post?.preview as any).title;
      }
      if (post?.preview && (post?.preview as any).description) {
        description += (post?.preview as any).description;
      }

      // don't need tags right now, will uncomment when we need them.
      // const tags = await generateTags(description);
      const languageCodes = await detectLanguageCodes(description);
      res.status(200).send({ languageCodes });
    } catch (error) {
      console.log(error);
      res.status(500).send({ error: error });
    }
  });
};
