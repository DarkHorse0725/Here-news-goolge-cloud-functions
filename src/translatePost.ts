import { HttpFunction } from "@google-cloud/functions-framework";
import { PineconeClient } from "@pinecone-database/pinecone";
import dotenv from "dotenv";
import { translateText } from "./lib/openAIConfig";
import mongoose, { Types } from "mongoose";
import { Post } from "./models";
import { Translation } from "./models";
import { convert } from "html-to-text";
import cors from "cors";
import { LANGUAGES } from "./lib/languages";

dotenv.config();
mongoose.set("strictQuery", false);

const options = {
  wordwrap: 130,
  selectors: [
    { selector: "a", format: "skip" },
    { selector: "img", format: "skip" },
  ],
};

export const translatePost: HttpFunction = async (req, res) => {
  console.log("translatePost");
  const corsMiddleware = cors();
  corsMiddleware(req, res, async () => {
    // Set CORS headers
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    const { post_id, langCode } = req.body;
    try {
      if (!post_id || !langCode) {
        res.status(400).send({ result: [], message: "Incorrect Parameters." });
        return;
      }

      const URL = process.env.MONGO_DB_URL || "";
      await mongoose.connect(URL);

      const translation = await Translation.findOne({
        postId: post_id,
        languageCode: langCode,
      });
      if (translation) {
        return res.status(200).send({
          status: "success",
          result: translation,
        });
      }

      const findPost = await Post.findOne({
        postId: post_id,
      }).populate("preview");

      if (!findPost) {
        return res.status(404).send({
          status: "error",
          message: "No post found!",
        });
      }
      const title = convert((findPost as any).title, options);
      const text = convert((findPost as any).text, options);
      const preTitle = convert((findPost!.preview as any)?.title);
      const preDescription = convert((findPost!.preview as any)?.description);

      const translateObj = {
        title: title ?? "",
        text: text ?? "",
        preTitle: preTitle ?? "",
        preDescription: preDescription ?? "",
      };

      translateText(translateObj, LANGUAGES[langCode]).then(
        async (response: any) => {
          // Regex to extract data from JSON. Extracting data from JSON in this way
          // due to some characters in some languages are not parseable.
          const titleMatch = response.match(/"title"\s*:\s*"([^"]+)"/);
          const textMatch = response.match(
            /"text"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/
          );
          const preTitleMatch = response.match(/"preTitle"\s*:\s*"([^"]+)"/);
          const preDescriptionMatch = response.match(
            /"preDescription"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/
          );

          const extractedTitle = titleMatch ? titleMatch[1] : "";
          const extractedText = textMatch ? textMatch[1] : "";
          const extractedPreTitle = preTitleMatch ? preTitleMatch[1] : "";
          const extractedPreText = preDescriptionMatch
            ? preDescriptionMatch[1]
            : "";

          const translationData = {
            postId: post_id,
            languageCode: langCode,
            title:
              extractedTitle?.length > 0
                ? extractedTitle
                : extractedPreTitle?.length > 0
                ? extractedPreTitle
                : "",
            description:
              extractedText.length > 0
                ? extractedText
                : extractedPreText?.length > 0
                ? extractedPreText
                : "",
            preTitle: extractedPreTitle,
          };

          const newTranslation = new Translation(translationData);
          await newTranslation.save();
          return res
            .status(200)
            .send({ result: translationData, status: "success" });
        }
      );
    } catch (err) {
      console.log("translatePost error -> ", err);
      res.status(500).send({ error: err });
    }
  });
};
