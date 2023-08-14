import { Schema, model } from "mongoose";

export interface TranslationInterface {
  postId: string;
  languageCode: string;
  title: string;
  description: string;
  preTitle: string;
  primary: boolean;
}

const TranslationSchema = new Schema<TranslationInterface>({
  postId: String,
  languageCode: String,
  title: String,
  description: String,
  preTitle: String,
});

const Translation = model<TranslationInterface>(
  "Translation",
  TranslationSchema
);

export { Translation };
