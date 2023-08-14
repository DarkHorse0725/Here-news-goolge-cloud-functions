import mongoose from 'mongoose'

export * from './post.model'
export * from './preview.model'
export * from './translation.model'
export * from './scrapper.model'

export const connectDatabase = () => {
  const URL = process.env.MONGO_DB_URL || ''
  mongoose
    .connect(URL)
    .then(() => {
      return console.log(`DATABASE CONNECTION SUCCESSFUL !`)
    })
    .catch((error: Error) => {
      console.log('Error connecting to database: ', error.message)
      return process.exit(1)
    })
}
