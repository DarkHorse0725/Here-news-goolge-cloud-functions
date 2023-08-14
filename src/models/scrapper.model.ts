import { Schema, model } from "mongoose";

export interface ScrapperInterface {
  domain: string;
  active: boolean;
  creationRequired: boolean;
  halt: boolean;
  isPayWall: boolean,
  createdAt: Date;
  updatedAt: Date;
}

const ScrapperSchema = new Schema<ScrapperInterface>({
  domain: String,
  active: Boolean,
  creationRequired: Boolean,
  halt: Boolean,
  isPayWall: Boolean,
  createdAt: { type: Date, default: Date.now() },
  updatedAt: { type: Date, default: Date.now() },
});

const Scrapper = model<ScrapperInterface>("Scrapper", ScrapperSchema);

export { Scrapper };
