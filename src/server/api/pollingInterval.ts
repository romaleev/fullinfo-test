import { fetchCityData } from '#server/api/fetchData'
import { Station, CityStations } from '#src/interfaces'
import dateFormat from 'dateformat'
import {
	debug,
	pollIntervalSecondsInit,
	pollIntervalSecondsMin,
	pollIntervalSecondsMax,
} from '#root/config.json'
import { sleep } from '#src/util'

export const getStationsIntervalMin = (stations1: Station[] = [], stations2: Station[] = []) => {
	let minIntervalSeconds = pollIntervalSecondsMax
	stations1.forEach((station1) => {
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

export class PollingInterval {
	public pollIntervalMin = pollIntervalSecondsMax
	private stationsLast: CityStations = {}
	constructor(readonly cities: string[]) {}
	get isStationsLast() {
		return Object.keys(this.stationsLast).length > 0
	}
	getPollIntervalSecondsMin(stations: CityStations) {
		if (this.isStationsLast) {
			for (const city of this.cities) {
				const minIntervalSeconds = getStationsIntervalMin(this.stationsLast[city], stations[city])
				debug && console.log(`${city} min interval diff ${minIntervalSeconds}`)
				if (minIntervalSeconds !== 0 && this.pollIntervalMin > minIntervalSeconds) {
					debug &&
						console.log(
							`${city}: poll interval reduced from ${this.pollIntervalMin} to ${minIntervalSeconds} sec`,
						)
					this.pollIntervalMin = minIntervalSeconds
				}
			}

			debug &&
				console.log(
					'stationsLast',
					this.cities[0],
					this.stationsLast[this.cities[0]][0].timestamp,
					'>',
					stations[this.cities[0]][0].timestamp,
					this.cities[1],
					this.stationsLast[this.cities[1]][0].timestamp,
					'>',
					stations[this.cities[1]][0].timestamp,
				)
		}

		this.stationsLast = stations

		return this.pollIntervalMin
	}
}

export const determinePollingIntervalSeconds = async (cities: string[]): Promise<number> => {
	const pollingInterval = new PollingInterval(cities)
	const pollEndTime = Date.now() + pollIntervalSecondsMax * 1000

	let pollIntervalSecondsRepeat = pollIntervalSecondsInit
	let pollIntervalSecondsMinResult = pollIntervalSecondsMax

	if (
		pollIntervalSecondsInit <= pollIntervalSecondsMin ||
		pollIntervalSecondsInit >= pollIntervalSecondsMax
	)
		throw new Error(
			'pollIntervalSecondsInit must above pollingIntervalSecondsMin and below pollingIntervalSecondsMax',
		)

	debug &&
		console.log(
			`Detecting poll interval between ${dateFormat(Date.now())} and ${dateFormat(pollEndTime)}`,
		)

	while (Date.now() <= pollEndTime && pollIntervalSecondsRepeat > pollIntervalSecondsMin) {
		debug && console.log('attempt', dateFormat(Date.now()))
		const stations: { [city: string]: Station[] } = {}

		for (const city of cities) {
			stations[city] = await fetchCityData(city)
		}

		pollIntervalSecondsMinResult = pollingInterval.getPollIntervalSecondsMin(stations)

		if (pollIntervalSecondsRepeat > pollIntervalSecondsMinResult)
			pollIntervalSecondsRepeat = pollIntervalSecondsMinResult

		await sleep(pollIntervalSecondsRepeat * 1000)
	}

	return pollIntervalSecondsMinResult
}
