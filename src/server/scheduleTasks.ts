import cron from 'node-cron'
import { fetchCityData } from '#server/api/fetchData'
import { storeBikeData } from '#server/db/storeData'
import { cities, debug } from '#root/config.json'
import { Station, CityStations } from '#src/interfaces'
import { PollingInterval } from '#server/api/pollingInterval'

export const calculateTotalFreeBikes = (stations: Station[]): number => {
	const totalFreeBikes = stations.reduce((sum, station) => sum + (station.free_bikes || 0), 0)
	return totalFreeBikes
}

export const cityData = new Map<string, number[]>()

export const pollData = async (): Promise<CityStations> => {
	const stations: { [city: string]: Station[] } = {}

	for (const city of cities) {
		try {
			stations[city] = await fetchCityData(city)
			const totalFreeBikes = calculateTotalFreeBikes(stations[city])

			if (!cityData.has(city)) {
				cityData.set(city, [])
			}

			cityData.get(city)!.push(totalFreeBikes)
		} catch (error) {
			console.error(`Error fetching data for ${city}:`, error)
		}
	}

	return stations
}

export const storeHourlyAverage = async (): Promise<void> => {
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

export const schedulePollStoreTasks = (
	pollingIntervalSeconds: number,
	storeIntervalSeconds: number,
): void => {
	let pollingIntervalSecondsCurrent = pollingIntervalSeconds
	const pollingInterval = new PollingInterval(cities)

	let pollTaskFunc = async () => {
		const stations = await pollData()
		pollingInterval.getPollIntervalSecondsMin(stations)
	}

	// Poll every specified number of minutes
	let pollTask = cron.schedule(`*/${pollingIntervalSecondsCurrent} * * * *`, pollTaskFunc)

	const reschedulePollTask = () => {
		debug && console.log('Rescheduled with the new polling interval', pollingIntervalSecondsCurrent)
		pollTask.stop()
		pollTask = cron.schedule(`*/${pollingIntervalSecondsCurrent} * * * *`, pollTaskFunc)
	}

	// Calculate and store every specified number of minutes
	const storeTask = cron.schedule(`0 */${storeIntervalSeconds} * * *`, async () => {
		await storeHourlyAverage()
		if (pollingInterval.pollIntervalMin < pollingIntervalSecondsCurrent) {
			pollingIntervalSecondsCurrent = pollingInterval.pollIntervalMin
			reschedulePollTask()
		}
	})
}
