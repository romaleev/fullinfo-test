import cron from 'node-cron'
import { fetchCityData } from '#server/api/fetchData'
import { storeBikeData } from '#server/db/storeData'
import { scheduleTasks, pollData, storeHourlyAverage, cityData } from '#server/scheduleTasks'
import { cities } from '#root/config.json'
import { Station } from '#src/interfaces'

jest.mock('node-cron', () => ({
	schedule: jest.fn(),
}))

jest.mock('#server/api/fetchData', () => ({
	fetchCityData: jest.fn(),
}))

jest.mock('#server/db/storeData', () => ({
	storeBikeData: jest.fn(),
}))

describe('scheduleTasks', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('should schedule tasks correctly', () => {
		scheduleTasks(5, 60)

		expect(cron.schedule).toHaveBeenCalledWith('*/5 * * * *', expect.any(Function))
		expect(cron.schedule).toHaveBeenCalledWith('0 */60 * * *', expect.any(Function))
	})
})

describe('pollData', () => {
	it('should fetch and calculate bike data for each city', async () => {
		const mockStations: Station[] = [
			{ id: '1', free_bikes: 5, name: 'Station 1', timestamp: '2024-06-29T15:28:49.555Z' },
			{ id: '2', free_bikes: 3, name: 'Station 2', timestamp: '2024-06-29T15:28:49.555Z' },
		]
		;(fetchCityData as jest.Mock).mockResolvedValue(mockStations)

		await pollData()

		for (const city of cities) {
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
