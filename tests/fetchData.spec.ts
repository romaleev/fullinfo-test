import ky from 'ky'
import { fetchCityData } from '#server/api/fetchData'
import { NetworkResponse, StationsResponse, Network, Station } from '#src/interfaces'

jest.mock('ky')

const mockNetworkResponse: NetworkResponse = {
	networks: [
		{
			id: 'network1',
			location: { city: 'New York' },
		} as Network,
	],
}

const mockEmptyNetworkResponse: NetworkResponse = {
	networks: [],
}

const mockStationsResponse: StationsResponse = {
	network: {
		stations: [
			{ id: 'station1', free_bikes: 5 } as Station,
			{ id: 'station2', free_bikes: 3 } as Station,
		],
	},
}

describe('fetchCityData', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('should fetch and return stations data for a city', async () => {
		;(ky.get as jest.Mock).mockImplementation((url) => {
			if (url === 'http://api.citybik.es/v2/networks?fields=id,location') {
				return {
					json: async () => mockNetworkResponse,
				}
			} else if (url === 'http://api.citybik.es/v2/networks/network1?fields=stations') {
				return {
					json: async () => mockStationsResponse,
				}
			}
			return {
				json: async () => ({}),
			}
		})

		const city = 'New York'
		const stations = await fetchCityData(city)

		expect(stations).toEqual(mockStationsResponse.network.stations)
		expect(ky.get).toHaveBeenCalledWith('http://api.citybik.es/v2/networks?fields=id,location')
		expect(ky.get).toHaveBeenCalledWith(
			'http://api.citybik.es/v2/networks/network1?fields=stations',
		)
	})

	it('should throw an error if no network is found for the city', async () => {
		;(ky.get as jest.Mock).mockImplementation((url) => {
			if (url === 'http://api.citybik.es/v2/networks?fields=id,location') {
				return {
					json: async () => mockEmptyNetworkResponse,
				}
			}
			return {
				json: async () => ({}),
			}
		})

		const city = 'Unknown City'
		await expect(fetchCityData(city)).rejects.toThrow(`No network found for city: ${city}`)
	})
})
