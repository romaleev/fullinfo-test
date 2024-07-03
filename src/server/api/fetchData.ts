import ky from 'ky'
import { Network, NetworkResponse, Station, StationsResponse, NetworkCache } from '#src/interfaces'
import { networkCacheMinutes, networksUrl, networkUrl } from '#root/config.json'
import { getTemplateLiteral } from '#src/util'

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

	try {
		const response = await ky.get(networksUrl)?.json<NetworkResponse>()
		const networks: Network[] = response?.networks

		const network =
			networks?.find((network) => network?.location?.city?.toLowerCase() === city.toLowerCase()) ||
			null

		// Update cache with network data and timestamp
		if (network) {
			networkCache[city] = {
				network,
				timestamp: Date.now(),
			}
		}

		return network
	} catch (error) {
		console.log(error)
		return null
	}
}

export const fetchCityData = async (city: string): Promise<Station[]> => {
	const network = await fetchNetwork(city)
	if (!network) {
		throw new Error(`No network found for city: ${city}`)
	}

	try {
		const response = await ky
			.get(getTemplateLiteral(networkUrl, { network }))
			?.json<StationsResponse>()

		return response?.network?.stations || []
	} catch (error) {
		console.log(error)
		return []
	}
}
