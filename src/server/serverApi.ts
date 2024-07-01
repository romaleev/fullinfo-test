import express from 'express'
import { BikeDataModel } from '#server/db/storeData'

export const setupApiEndpoints = (app: express.Express): void => {
	app.get('/api/bikedata', async (req, res) => {
		const { city, start, end } = req.query as { city: string; start: string; end: string }

		try {
			const startDate = new Date(start)
			const endDate = new Date(end)

			// Adjust endDate to include the entire day
			endDate.setUTCHours(23, 59, 59, 999)

			const bikeData = await BikeDataModel.find({
				city,
				timestamp: {
					$gte: startDate,
					$lte: endDate,
				},
			}).exec()

			res.json(bikeData)
		} catch (error) {
			const err = error as Error
			res.status(500).json({ message: err.message })
		}
	})
}
