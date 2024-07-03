import ky from 'ky'
import { fetchCityData } from '#server/api/fetchData'
import { NetworkResponse, StationsResponse, Network, Station } from '#src/interfaces'
import { networksUrl, networkUrl } from '#root/config.json'
import { getTemplateLiteral } from '#src/util'

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

	const networkUrlCompiled = getTemplateLiteral(networkUrl, { network: { id: 'network1' } })

	it('should fetch and return stations data for a city', async () => {
		;(ky.get as jest.Mock).mockImplementation((url) => {
			if (url === networksUrl) {
				return {
					json: async () => mockNetworkResponse,
				}
			} else if (url === networkUrlCompiled) {
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
		expect(ky.get).toHaveBeenCalledWith(networksUrl)
		expect(ky.get).toHaveBeenCalledWith(networkUrlCompiled)
	})

	it('should throw an error if no network is found for the city', async () => {
		;(ky.get as jest.Mock).mockImplementation((url) => {
			if (url === networksUrl) {
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
