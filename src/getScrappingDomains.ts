import { HttpFunction } from "@google-cloud/functions-framework";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import { Scrapper } from "./models";

dotenv.config();
mongoose.set("strictQuery", false);

export const getScrappingDomains: HttpFunction = async (req, res) => {
  const corsMiddleware = cors();
  corsMiddleware(req, res, async () => {
    // Set CORS headers
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    const MONGO_URL = process.env.MONGO_DB_URL || "";
    await mongoose.connect(MONGO_URL);

    const scrapperDomains = await Scrapper.find({})

    if (!scrapperDomains) 
      return res.status(400).json({
        message: "Domain already existed!",
      });
      
    return res.status(200).json({
      data: scrapperDomains
    })
  })
};
