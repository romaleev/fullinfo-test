import { storeBikeData } from '#server/db/storeData'

export const storeHourlyAverageManual = async (
	city: string,
	hourOffset: number = 1,
	average: number,
): Promise<void> => {
	const timestamp = new Date()
	timestamp.setMinutes(0, 0, 0)
	timestamp.setHours(timestamp.getHours() - hourOffset)
	await storeBikeData(city, average, timestamp)
}

export const storeDummyData = async () => {
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
}
