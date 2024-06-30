import cron from 'node-cron'
import { fetchCityData } from '#server/fetchData'
import { storeBikeData } from '#server/storeData'
import { cities } from '#src/config.json'
import { Station } from '#src/interfaces'

const calculateTotalFreeBikes = (stations: Station[]): number => {
	const totalFreeBikes = stations.reduce((sum, station) => sum + (station.free_bikes || 0), 0)
	return totalFreeBikes
}

const cityData = new Map<string, number[]>()

const pollData = async (): Promise<void> => {
	for (const city of cities) {
		try {
			const stations = await fetchCityData(city)
			const totalFreeBikes = calculateTotalFreeBikes(stations)

			if (!cityData.has(city)) {
				cityData.set(city, [])
			}

			cityData.get(city)!.push(totalFreeBikes)
		} catch (error) {
			console.error(`Error fetching data for ${city}:`, error)
		}
	}
}

const storeHourlyAverage = async (): Promise<void> => {
	for (const city of cities) {
		const data = cityData.get(city) || []
		const total = data.reduce((sum, value) => sum + value, 0)
		const averageFreeBikes = data.length ? total / data.length : 0
		const timestamp = new Date()
		timestamp.setMinutes(0, 0, 0) // Set minutes, seconds, and milliseconds to zero
		timestamp.setHours(timestamp.getHours() - 1) // Subtract one hour
		await storeBikeData(city, averageFreeBikes, timestamp)

		cityData.set(city, []) // Reset the data for the next hour
	}
}

export const scheduleTasks = (
	pollingIntervalMinutes: number,
	storeIntervalMinutes: number,
): void => {
	// Poll every specified number of minutes
	cron.schedule(`*/${pollingIntervalMinutes} * * * *`, async () => {
		await pollData()
	})

	// Calculate and store every specified number of minutes
	cron.schedule(`0 */${storeIntervalMinutes} * * *`, async () => {
		await storeHourlyAverage()
	})
}
// ;(async () => {
// 	await pollData()
// 	console.log(0, cityData)
// 	await storeHourlyAverage()
// })()
