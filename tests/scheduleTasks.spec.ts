import cron from 'node-cron'
import { fetchCityData } from '#server/api/fetchData'
import { storeBikeData } from '#server/db/storeData'
import {
	schedulePollStoreTasks,
	pollData,
	storeHourlyAverage,
	cityData,
} from '#server/scheduleTasks'
import { cities } from '#root/config.json'
import { Station } from '#src/interfaces'
import { PollingInterval } from '#server/api/pollingInterval'

jest.mock('node-cron')
jest.mock('#server/api/pollingInterval')
jest.mock('#server/api/fetchData')
jest.mock('#server/db/storeData')
// jest.mock('#server/scheduleTasks')

describe('pollData', () => {
	it('should fetch and calculate bike data for each city', async () => {
		const mockStations: Station[] = [
			{ id: '1', free_bikes: 5, name: 'Station 1', timestamp: '2024-06-29T15:28:49.555Z' },
			{ id: '2', free_bikes: 3, name: 'Station 2', timestamp: '2024-06-29T15:28:49.555Z' },
		]
		;(fetchCityData as jest.Mock).mockResolvedValue(mockStations)

		const stations = await pollData()

		for (const city of cities) {
			expect(stations[city]).toBe(mockStations)
			expect(fetchCityData).toHaveBeenCalledWith(city)
			expect(cityData.get(city)!.length).toBe(1)
			expect(cityData.get(city)![0]).toBe(8)
		}
	})

	it('should handle errors when fetching data', async () => {
		;(fetchCityData as jest.Mock).mockRejectedValue(new Error('Network Error'))

		console.error = jest.fn()

		await pollData()

		for (const city of cities) {
			expect(fetchCityData).toHaveBeenCalledWith(city)
			expect(console.error).toHaveBeenCalledWith(
				`Error fetching data for ${city}:`,
				expect.any(Error),
			)
		}
	})
})

describe('storeHourlyAverage', () => {
	it('should store the average number of free bikes for each city', async () => {
		cityData.set(cities[0], [5, 10, 15])
		cityData.set(cities[1], [20, 25, 30])

		await storeHourlyAverage()

		expect(storeBikeData).toHaveBeenCalledWith(cities[0], 10, expect.any(Date))
		expect(storeBikeData).toHaveBeenCalledWith(cities[1], 25, expect.any(Date))

		for (const city of cities) {
			expect(cityData.get(city)!.length).toBe(0)
		}
	})
})

describe('scheduleTasks', () => {
	const pollingIntervalSeconds = 600 // 10 minutes
	const storeIntervalSeconds = 3600 // 1 hour

	let mockPollTask: any
	let mockStoreTask: any
	let mockPollingInterval: any

	beforeEach(() => {
		mockPollTask = {
			stop: jest.fn(),
		}
		mockStoreTask = {
			stop: jest.fn(),
		}
		mockPollingInterval = {
			getPollIntervalSecondsMin: jest.fn(),
			pollIntervalMin: pollingIntervalSeconds,
		}
		;(cron.schedule as jest.Mock).mockImplementation((interval: string, func: Function) => {
			if (interval.includes(`*/${pollingIntervalSeconds}`)) {
				return mockPollTask
			} else if (interval.includes(`0 */${storeIntervalSeconds}`)) {
				return mockStoreTask
			}
			return null
		})
		;(PollingInterval as jest.Mock).mockImplementation(() => mockPollingInterval)
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	it('should schedule polling and storing tasks', () => {
		schedulePollStoreTasks(pollingIntervalSeconds, storeIntervalSeconds)

		expect(cron.schedule).toHaveBeenCalledWith(
			`*/${pollingIntervalSeconds} * * * *`,
			expect.any(Function),
		)
		expect(cron.schedule).toHaveBeenCalledWith(
			`0 */${storeIntervalSeconds} * * *`,
			expect.any(Function),
		)
	})

	it.skip('should reschedule polling task with a new interval when poll interval decreases', async () => {
		;(pollData as jest.Mock).mockResolvedValue({
			city1: [{ timestamp: '2021-01-01T00:05:00Z', free_bikes: 3 }],
			city2: [{ timestamp: '2021-01-01T00:05:00Z', free_bikes: 2 }],
		})
		;(storeHourlyAverage as jest.Mock).mockResolvedValueOnce(undefined)
		mockPollingInterval.pollIntervalMin = 300 // 5 minutes

		schedulePollStoreTasks(pollingIntervalSeconds, storeIntervalSeconds)

		// Trigger the store task manually for testing
		const storeTaskFunction = (cron.schedule as jest.Mock).mock.calls.find(
			(call) => call[0] === `0 */${storeIntervalSeconds} * * *`,
		)[1]
		await storeTaskFunction()

		expect(mockPollTask.stop).toHaveBeenCalled()
		expect(cron.schedule).toHaveBeenCalledWith(`*/300 * * * *`, expect.any(Function))
	})

	it.skip('should not reschedule polling task if poll interval does not decrease', async () => {
		;(pollData as jest.Mock).mockResolvedValue({
			city1: [{ timestamp: '2021-01-01T00:05:00Z', free_bikes: 3 }],
			city2: [{ timestamp: '2021-01-01T00:05:00Z', free_bikes: 2 }],
		})
		;(storeHourlyAverage as jest.Mock).mockResolvedValueOnce(undefined)
		mockPollingInterval.pollIntervalMin = pollingIntervalSeconds // Same as initial

		schedulePollStoreTasks(pollingIntervalSeconds, storeIntervalSeconds)

		// Trigger the store task manually for testing
		const storeTaskFunction = (cron.schedule as jest.Mock).mock.calls.find(
			(call) => call[0] === `0 */${storeIntervalSeconds} * * *`,
		)[1]
		await storeTaskFunction()

		expect(mockPollTask.stop).not.toHaveBeenCalled()
		expect(cron.schedule).toHaveBeenCalledTimes(2) // Only initial calls
	})
})
