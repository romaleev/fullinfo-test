import express from 'express'
import mongoose from 'mongoose'
import bodyParser from 'body-parser'
import { scheduleTasks } from '#server/schedule'
import { setupApiEndpoints } from '#server/server.api'
import { mongoUrl, storeIntervalMinutes } from '#src/config.json'
import { BikeDataModel } from '#server/storeData'
import { determinePollingInterval } from '#server/polling'

const app = express()
const port = process.env.PORT || 4000

app.use(bodyParser.json())

mongoose
	.connect(mongoUrl)
	.then(async () => {
		console.log('Connected successfully to MongoDB')

		const data = await BikeDataModel.find()
		console.log('data', data)

		// console.log(0, await mongoose.connection.db.listCollections().toArray())
	})
	.catch((err) => {
		console.error('Failed to connect to MongoDB', err)
	})

// Setup API endpoints
setupApiEndpoints(app)

app.listen(port, () => {
	console.log(`Server running on port ${port}`)
})
;(async () => {
	const pollingIntervalMinutes = await determinePollingInterval()

	console.log('Determined polling interval:', pollingIntervalMinutes)

	// Schedule tasks
	scheduleTasks(pollingIntervalMinutes, storeIntervalMinutes)
	console.log('Scheduled check and store tasks')
})()
