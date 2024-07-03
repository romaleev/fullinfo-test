import {
	determinePollingIntervalSeconds,
	getStationsIntervalMin,
	PollingInterval,
} from '#server/api/pollingInterval'
import {
	cities,
	pollIntervalSecondsInit,
	pollIntervalSecondsMin,
	pollIntervalSecondsMax,
} from '#root/config.json'
import { fetchCityData } from '#server/api/fetchData'
import { sleep } from '#src/util'
import { Station, CityStations } from '#src/interfaces'

jest.mock('#root/config.json', () => ({
	pollIntervalSecondsInit: 2,
	pollIntervalSecondsMin: 1,
	pollIntervalSecondsMax: 5,
	cities: ['city1', 'city2'],
	debug: false,
}))

jest.mock('#server/api/fetchData')
jest.mock('#src/util')

const [city1, city2] = cities
const pollingTimeout = (pollIntervalSecondsInit + pollIntervalSecondsMax + 1) * 1000
const attemptsFetchCityDataAll = Math.ceil(pollIntervalSecondsMax / pollIntervalSecondsInit)
const attemptsFetchCityDataMin = 2 // Should be called only twice because it reaches the minimum

interface MockStations {
	[city: string]: Station[]
}

const getStationMock = (
	idName: string,
	free_bikes: number,
	timestampDiffSeconds: number = 0,
): Station => ({
	id: idName,
	name: idName,
	free_bikes,
	timestamp: new Date(`2023-01-01T00:00:0${timestampDiffSeconds}Z`).toISOString(),
})

const getPollingMock = (timestampDiffSeconds: number = 0): MockStations => ({
	[city1]: [getStationMock('station1', 4, 0), getStationMock('station2', 2, timestampDiffSeconds)],
	[city2]: [getStationMock('station3', 1, 0), getStationMock('station4', 0, 0)],
})

const mockStations = getPollingMock(0)
const mockStationsInit = getPollingMock(pollIntervalSecondsInit)
const mockStationsMin = getPollingMock(pollIntervalSecondsMin)
const mockStationsMax = getPollingMock(pollIntervalSecondsMax)

const mockPollingFunc = (mockStations: MockStations, mockStationsUpdated: MockStations) => {
	let callCount = 0
	;(fetchCityData as jest.Mock).mockImplementation((city: string) => {
		if (!cities.includes(city)) throw new Error(`No network found for city: ${city}`)
		if (callCount === 0) {
			return mockStations[city]
		} else {
			return mockStationsUpdated[city]
		}
	})
	;(sleep as jest.Mock).mockImplementation(async (ms: number) => {
		callCount++
		return new Promise((resolve) => setTimeout(resolve, ms))
	})
}

describe('determinePollingInterval', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	it(
		'should calculate polling interval correctly: pollIntervalSecondsInit',
		async () => {
			mockPollingFunc(mockStations, mockStationsInit)

			const pollIntervalMin = await determinePollingIntervalSeconds(cities)

			expect(fetchCityData).toHaveBeenCalledTimes(cities.length * attemptsFetchCityDataAll)
			expect(sleep).toHaveBeenCalled()
			expect(pollIntervalMin).toBe(pollIntervalSecondsInit)
		},
		pollingTimeout,
	)

	it(
		'should calculate polling interval correctly: pollIntervalSecondsMin',
		async () => {
			mockPollingFunc(mockStations, mockStationsMin)

			const pollIntervalMin = await determinePollingIntervalSeconds(cities)

			expect(fetchCityData).toHaveBeenCalledTimes(cities.length * attemptsFetchCityDataMin)
			expect(sleep).toHaveBeenCalled()
			expect(pollIntervalMin).toBe(pollIntervalSecondsMin)
		},
		pollingTimeout,
	)

	it(
		'should calculate polling interval correctly: pollIntervalSecondsMax',
		async () => {
			mockPollingFunc(mockStations, mockStationsMax)

			const pollIntervalMin = await determinePollingIntervalSeconds(cities)

			expect(fetchCityData).toHaveBeenCalledTimes(cities.length * attemptsFetchCityDataAll)
			expect(sleep).toHaveBeenCalled()
			expect(pollIntervalMin).toBe(pollIntervalSecondsMax)
		},
		pollingTimeout,
	)

	it(
		'should handle fetch errors gracefully',
		async () => {
			mockPollingFunc(mockStations, mockStations)

			const unknownCity = 'unknown city'

			await expect(determinePollingIntervalSeconds([...cities, unknownCity])).rejects.toThrow(
				`No network found for city: ${unknownCity}`,
			)

			expect(fetchCityData).toHaveBeenCalledTimes(3)
			expect(sleep).toHaveBeenCalledTimes(0)
		},
		pollingTimeout,
	)
})

describe('getStationsIntervalMin', () => {
	it('should calculate the minimum interval between station timestamps', () => {
		const stations1 = getPollingMock(0)[city1]
		const stations2 = getPollingMock(pollIntervalSecondsInit)[city1]
		const minInterval = getStationsIntervalMin(stations1, stations2)

		expect(minInterval).toBe(pollIntervalSecondsInit)
	})
})

describe('PollingInterval', () => {
	let pollingInterval: PollingInterval
	const cities = ['city1', 'city2']

	beforeEach(() => {
		pollingInterval = new PollingInterval(cities)
	})

	it('should initialize with empty stationsLast and max poll interval', () => {
		expect(pollingInterval['stationsLast']).toEqual({})
		expect(pollingInterval['pollIntervalMin']).toBe(pollIntervalSecondsMax)
	})

	it('should return false for isStationsLast when stationsLast is empty', () => {
		expect(pollingInterval.isStationsLast).toBe(false)
	})

	it('should return true for isStationsLast when stationsLast is not empty', () => {
		pollingInterval['stationsLast'] = {
			city1: [getStationMock('station1', 5, 0)],
			city2: [getStationMock('station2', 5, 0)],
		}
		expect(pollingInterval.isStationsLast).toBe(true)
	})

	it('should calculate the minimum poll interval based on station changes', () => {
		const initialStations: CityStations = {
			city1: [getStationMock('station1', 5, 0)],
			city2: [getStationMock('station2', 5, 0)],
		}
		const newStations: CityStations = {
			city1: [getStationMock('station1', 3, pollIntervalSecondsMin)],
			city2: [getStationMock('station2', 2, 0)],
		}

		pollingInterval.getPollIntervalSecondsMin(initialStations)
		const pollInterval = pollingInterval.getPollIntervalSecondsMin(newStations)

		expect(pollInterval).toBe(pollIntervalSecondsMin)
	})

	it('should retain the max poll interval if no changes are detected', () => {
		const initialStations: CityStations = {
			city1: [getStationMock('station1', 5, 0)],
			city2: [getStationMock('station2', 5, 0)],
		}

		pollingInterval['stationsLast'] = initialStations
		const pollInterval = pollingInterval.getPollIntervalSecondsMin(initialStations)

		expect(pollInterval).toBe(pollIntervalSecondsMax)
		expect(pollingInterval['pollIntervalMin']).toBe(pollIntervalSecondsMax)
		expect(pollingInterval['stationsLast']).toBe(initialStations)
	})
})
