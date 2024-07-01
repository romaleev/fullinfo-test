import express from 'express'
import mongoose from 'mongoose'
import bodyParser from 'body-parser'
import { scheduleTasks } from '#server/scheduleTasks'
import { setupApiEndpoints } from '#server/serverApi'
import {
	debug,
	mongoUrl,
	storeIntervalMinutes,
	cities,
	pollIntervalSeconds as pollIntervalSecondsDefault,
} from '#root/config.json'
import { BikeDataModel } from '#server/db/storeData'
import { determinePollingIntervalSeconds } from '#server/api/pollingInterval'

const app = express()
const port = process.env.PORT || 4000

app.use(bodyParser.json())

mongoose
	.connect(mongoUrl)
	.then(async () => {
		console.log('Connected successfully to MongoDB')

		if (debug) {
			const data = await BikeDataModel.find()
			console.log(
				'saved data',
				data.map(({ city, timestamp, averageFreeBikes }) => ({
					city,
					timestamp,
					averageFreeBikes,
				})),
			)
		}
	})
	.catch((err) => {
		console.error('Failed to connect to MongoDB', err)
	})

setupApiEndpoints(app)

app.listen(port, () => {
	console.log(`Server running on port ${port}`)
})
;(async () => {
	let pollIntervalSeconds: number
	if (pollIntervalSecondsDefault) {
		pollIntervalSeconds = pollIntervalSecondsDefault
	} else {
		pollIntervalSeconds = await determinePollingIntervalSeconds(cities)
		console.log(`Determined polling interval ${pollIntervalSeconds} sec`)
	}

	const pollingIntervalMinutes = Math.round(pollIntervalSeconds / 60)

	scheduleTasks(pollingIntervalMinutes, storeIntervalMinutes)
	console.log('Scheduled check and store tasks')
})()
