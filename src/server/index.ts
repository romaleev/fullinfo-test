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
import { MongoMemoryServer } from 'mongodb-memory-server'
import nodeCleanup from 'node-cleanup'
import { storeDummyData } from '#server/db/storeDummyData'

process.title = 'fullinfo-test-server'
;(async () => {
	const app = express()
	const port = process.env.PORT || 4000
	const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development'
	console.log(`Mode: ${mode}`)

	app.use(bodyParser.json())

	let mongoUrlActual = mongoUrl

	if (mode === 'development') {
		const mongod = await MongoMemoryServer.create()
		mongoUrlActual = mongod.getUri()

		console.log('Started in-memory MongoDB, url:', mongoUrlActual)

		nodeCleanup(() => {
			mongod.stop()
		})
	}

	try {
		await mongoose.connect(mongoUrlActual)

		console.log('Connected successfully to MongoDB')

		if (mode === 'development') {
			await storeDummyData()
		}

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
	} catch (error) {
		console.error('Failed to connect to MongoDB', error)
	}

	setupApiEndpoints(app)

	app.listen(port, () => {
		console.log(`Server running on port ${port}`)
	})

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
