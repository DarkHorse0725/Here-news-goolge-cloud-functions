import { HttpFunction } from "@google-cloud/functions-framework";
import dotenv from "dotenv";
import { generateUserAvatar } from "./lib/openAIConfig";

dotenv.config();

export const generateAvatar: HttpFunction = async (req, res) => {
  try {
    const avatars = await generateUserAvatar();
    res.send({ avatars });
  } catch (error) {
    console.log(error);
    res.send({ error: error });
  }
};
