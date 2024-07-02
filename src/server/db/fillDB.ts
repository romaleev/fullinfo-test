import { pollData } from '#server/scheduleTasks'
import { mongoUrl } from '#root/config.json'
import mongoose from 'mongoose'
import { storeDummyData } from '#server/db/storeDummyData'
;(async () => {
	await mongoose.connect(mongoUrl)
	await pollData()

	await storeDummyData()

	process.exit(0)
})()
