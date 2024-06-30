import ky from 'ky'

export const fetchStoredData = async (city: string, start: string, end: string): Promise<any> => {
	const response = await ky.get(`/api/bikedata?city=${city}&start=${start}&end=${end}`).json()
	return response
}
