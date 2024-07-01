import {
	determinePollingIntervalSeconds,
	getStationsIntervalMin,
} from '#server/api/pollingInterval' // Adjust the import path as needed
import {
	cities,
	pollIntervalSecondsInit,
	pollIntervalSecondsMin,
	pollIntervalSecondsMax,
} from '#root/config.json'
import { fetchCityData } from '#server/api/fetchData'
import { sleep } from '#src/util'
import { Station } from '#src/interfaces'

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

const getPollingMock = (timestampDiffSeconds: number = 0): MockStations => ({
	[city1]: [
		{
			id: 'station1',
			free_bikes: 4,
			timestamp: new Date('2023-01-01T00:00:00Z').toISOString(),
		} as Station,
		{
			id: 'station2',
			free_bikes: 2,
			timestamp: new Date(`2023-01-01T00:00:0${timestampDiffSeconds}Z`).toISOString(),
		} as Station,
	],
	[city2]: [
		{
			id: 'station3',
			free_bikes: 1,
			timestamp: new Date(`2023-01-01T00:00:00Z`).toISOString(),
		} as Station,
		{
			id: 'station4',
			free_bikes: 0,
			timestamp: new Date('2023-01-01T00:00:00Z').toISOString(),
		} as Station,
	],
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
