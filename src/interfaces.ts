export interface Network {
	id: string
	location: {
		city: string
		country: string
	}
}

export interface Station {
	id: string
	name: string
	timestamp: string
	free_bikes: number
}

export interface NetworkResponse {
	networks: Network[]
}

export interface StationsResponse {
	network: {
		stations: Station[]
	}
}

export interface BikeData {
	city: string
	timestamp: string
	averageFreeBikes: number
}

export interface ChartData {
	timestamp: string
	[key: string]: number | string
}

export interface NetworkCache {
	network: Network | null
	timestamp: number
}

export interface CityStations {
	[city: string]: Station[]
}
