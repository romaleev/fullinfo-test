import { storeBikeData } from '#server/db/storeData'
import { pollData } from '#server/scheduleTasks'
import { mongoUrl } from '#root/config.json'
import mongoose from 'mongoose'

export const storeHourlyAverageManual = async (
	city: string,
	hourOffset: number = 1,
	average: number,
): Promise<void> => {
	const timestamp = new Date()
	timestamp.setMinutes(0, 0, 0) // Set minutes, seconds, and milliseconds to zero
	timestamp.setHours(timestamp.getHours() - hourOffset) // Subtract one hour
	await storeBikeData(city, average, timestamp)
}
;(async () => {
	await mongoose.connect(mongoUrl)
	await pollData()

	await Promise.all([
		storeHourlyAverageManual('Paris', 1, 4786),
		storeHourlyAverageManual('Paris', 2, 4456),
		storeHourlyAverageManual('Paris', 3, 3384),
		storeHourlyAverageManual('Paris', 4, 5384),
		storeHourlyAverageManual('Barcelona', 1, 1786),
		storeHourlyAverageManual('Barcelona', 2, 2456),
		storeHourlyAverageManual('Barcelona', 3, 3884),
		storeHourlyAverageManual('Barcelona', 4, 2884),
	])

	process.exit(0)
})()
