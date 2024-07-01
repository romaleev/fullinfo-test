import ky from 'ky'
import { BikeData } from '#src/interfaces'

export const fetchStoredData = async (
	city: string,
	start: string,
	end: string,
): Promise<BikeData[]> => {
	const response = (await ky
		.get(`/api/bikedata?city=${city}&start=${start}&end=${end}`)
		.json()) as BikeData[]
	return response
}
