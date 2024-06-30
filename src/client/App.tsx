import React, { useEffect, useState, useRef } from 'react'
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
} from 'recharts'
import dateFormat from 'dateformat'
import { fetchStoredData } from '#client/client.api'
import { BikeData, ChartData } from '#src/interfaces'
import config from '#src/config.json'
import '#client/App.css'

const { cities } = config

const App: React.FC = () => {
	const [data, setData] = useState<ChartData[]>([])
	const [start, setStart] = useState(
		dateFormat(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-mm-dd'),
	)
	const [end, setEnd] = useState(dateFormat(new Date(), 'yyyy-mm-dd'))
	const didMount = useRef(false)

	useEffect(() => {
		const fetchData = async () => {
			const results: BikeData[][] = await Promise.all(
				cities.map((city) => fetchStoredData(city, start, end)),
			)
			const combinedData: { [timestamp: string]: ChartData } = {}

			results.forEach((cityData, cityIndex) => {
				cityData.forEach((entry: BikeData) => {
					const timestamp = entry.timestamp
					if (!combinedData[timestamp]) {
						combinedData[timestamp] = { timestamp }
					}
					combinedData[timestamp][cities[cityIndex]] = entry.averageFreeBikes
				})
			})

			setData(Object.values(combinedData))
		}

		if (!didMount.current) {
			fetchData()
			didMount.current = true
		}
	}, [start, end])

	const renderLines = () => {
		return cities.map((city, index) => (
			<Line
				key={city}
				type="monotone"
				dataKey={city}
				stroke={`hsl(${(index * 360) / cities.length}, 70%, 50%)`}
				strokeWidth={3}
				name={city}
				dot={false}
			/>
		))
	}

	return (
		<div className="container">
			<h1>Bike Data</h1>
			<div className="controls">
				<label>
					Start Date:
					<input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
				</label>
				<label>
					End Date:
					<input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
				</label>
			</div>
			<div className="chart-container">
				<ResponsiveContainer width="100%" height={400}>
					<LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
						<CartesianGrid strokeDasharray="3 3" />
						<XAxis
							dataKey="timestamp"
							tickFormatter={(tick) => dateFormat(new Date(tick), 'mm-dd HH:00')}
							interval={0}
						/>
						<YAxis />
						<Tooltip
							labelFormatter={(label) => dateFormat(new Date(label), 'mmmm dS, yyyy HH:00')}
						/>
						<Legend />
						{renderLines()}
					</LineChart>
				</ResponsiveContainer>
			</div>
		</div>
	)
}

export default App
