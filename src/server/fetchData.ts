import ky from 'ky'
import { Network, NetworkResponse, Station, StationsResponse, NetworkCache } from '#src/interfaces'
import { networkCacheMinutes } from '#src/config.json'

// In-memory cache with timestamp
const networkCache: { [city: string]: NetworkCache } = {}

const isCacheValid = (city: string): boolean => {
	const currentTime = Date.now()
	const cacheValidityPeriod = networkCacheMinutes * 60 * 1000 // Convert minutes to milliseconds
	return networkCache[city] && currentTime - networkCache[city].timestamp < cacheValidityPeriod
}

const fetchNetwork = async (city: string): Promise<Network | null> => {
	if (isCacheValid(city)) {
		return networkCache[city].network
	}

	const response = await ky
		.get('http://api.citybik.es/v2/networks?fields=id,location')
		.json<NetworkResponse>()
	const networks: Network[] = response.networks

	const network =
		networks.find((network) => network.location.city.toLowerCase() === city.toLowerCase()) || null

	// Update cache with network data and timestamp
	networkCache[city] = {
		network,
		timestamp: Date.now(),
	}

	return network
}

export const fetchCityData = async (city: string): Promise<Station[]> => {
	const network = await fetchNetwork(city)
	if (!network) {
		throw new Error(`No network found for city: ${city}`)
	}

	const response = await ky
		.get(`http://api.citybik.es/v2/networks/${network.id}?fields=stations`)
		.json<StationsResponse>()
	return response.network.stations
}
