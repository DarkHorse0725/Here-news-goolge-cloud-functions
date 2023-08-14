import { Schema, model } from 'mongoose'

export interface PreviewInterface {
  url: string
  favicon: string
  siteName: string
  image: string
  title: string
  description: string
  youtubeId?: string
  primary: boolean
}

const PreviewSchema = new Schema<PreviewInterface>({
  url: String,
  favicon: String,
  siteName: String,
  image: String,
  title: String,
  description: String,
  youtubeId: String,
})

const Preview = model<PreviewInterface>('Preview', PreviewSchema)

export { Preview }
