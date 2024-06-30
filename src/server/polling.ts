import { fetchCityData } from '#server/fetchData'
import { cities } from '#src/config.json'
import { Station } from '#src/interfaces'
import dateFormat from 'dateformat'
import {
	debug,
	pollIntervalSeconds,
	pollIntervalSecondsMin,
	pollIntervalSecondsMax,
} from '#src/config.json'
import { sleep } from '#src/util'

const getStationsIntervalMin = (stations1: Station[], stations2: Station[]) => {
	let minIntervalSeconds = pollIntervalSecondsMax
	stations1.forEach((station1) => {
		// debug && console.log(`station ${station1.id} ${station1.timestamp}`)
		const station2 = stations2.find((station2) => station1.id === station2.id) || station1
		const date1 = new Date(station1.timestamp)
		const date2 = new Date(station2.timestamp)
		const minIntervalStationSeconds = parseInt(
			(Math.abs(date2.getTime() - date1.getTime()) / 1000).toFixed(3),
		)
		if (minIntervalStationSeconds !== 0 && minIntervalSeconds > minIntervalStationSeconds) {
			debug &&
				console.log(
					`station ${station1.id} interval reduced from ${minIntervalSeconds} to ${minIntervalStationSeconds}`,
				)
			minIntervalSeconds = minIntervalStationSeconds
		}
	})
	return minIntervalSeconds
}

export const determinePollingInterval = async (): Promise<number> => {
	const pollEndTime = Date.now() + pollIntervalSecondsMax * 1000
	const minIntervals: { [city: string]: number } = {}

	cities.forEach((city) => {
		minIntervals[city] = pollIntervalSecondsMax
	})

	let stationsLast: { [city: string]: Station[] } = {}
	let pollInterval = pollIntervalSeconds
	let pollIntervalMin = pollIntervalSecondsMax

	console.log(
		`Detecting poll interval between ${dateFormat(Date.now())} and ${dateFormat(pollEndTime)}`,
	)

	while (Date.now() <= pollEndTime && pollInterval > pollIntervalSecondsMin) {
		debug && console.log('attempt', dateFormat(Date.now()))
		const stations: { [city: string]: Station[] } = {}

		for (const city of cities) {
			stations[city] = await fetchCityData(city)
		}

		const isStationsLast = Object.keys(stationsLast).length > 0

		if (isStationsLast) {
			for (const city of cities) {
				const minIntervalSeconds = getStationsIntervalMin(stationsLast[city], stations[city])
				debug && console.log(`${city} min interval diff ${minIntervalSeconds}`)
				if (minIntervalSeconds !== 0 && pollIntervalMin > minIntervalSeconds) {
					debug &&
						console.log(
							`${city}: poll interval reduced from ${pollIntervalMin} to ${minIntervalSeconds} sec`,
						)
					pollIntervalMin = minIntervalSeconds
					if (pollInterval > pollIntervalMin) pollInterval = pollIntervalMin
				}
			}

			debug &&
				console.log(
					'stationsLast',
					cities[0],
					stationsLast[cities[0]][0].timestamp,
					'>',
					stations[cities[0]][0].timestamp,
					cities[1],
					stationsLast[cities[1]][0].timestamp,
					'>',
					stations[cities[1]][0].timestamp,
				)
		}

		stationsLast = stations

		await sleep(pollInterval * 1000)
	}

	return pollIntervalMin
}
