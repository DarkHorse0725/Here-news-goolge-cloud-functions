import { HttpFunction } from "@google-cloud/functions-framework";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import { Scrapper } from "./models";

dotenv.config();
mongoose.set("strictQuery", false);

export const setScrappingDomain: HttpFunction = async (req, res) => {
  const corsMiddleware = cors();
  corsMiddleware(req, res, async () => {
    // Set CORS headers
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    const { site_url, is_pay_wall } = req.body;

    const MONGO_URL = process.env.MONGO_DB_URL || "";
    await mongoose.connect(MONGO_URL);

    let domain = new URL(site_url);
    let _domain = domain.hostname.replace("www.", "");

    const scrapperDomain = await Scrapper.findOne({domain: _domain});

    if (scrapperDomain) 
      return res.status(400).json({
        message: "Domain already existed!",
      });
      
    const scrapperData = {
      domain: _domain,
      active: true,
      creationRequired: true,
      halt: false,
      isPayWall: is_pay_wall
    };

    const scrappModel = new Scrapper(scrapperData);
    const newScrapper = await scrappModel.save();

    return res.status(200).json({
      data: newScrapper
    })
  })
};
