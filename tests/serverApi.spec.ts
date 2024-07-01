import express from 'express'
import request from 'supertest'
import { setupApiEndpoints } from '#server/serverApi'
import { BikeDataModel } from '#server/db/storeData'

// Mock the BikeDataModel
jest.mock('#server/db/storeData')

describe('GET /api/bikedata', () => {
	let app: express.Express

	beforeAll(() => {
		app = express()
		setupApiEndpoints(app)
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	it('should return bike data for the specified city and date range', async () => {
		// Mock data to be returned by the BikeDataModel
		const mockBikeData = [
			{ city: 'testCity', timestamp: '2024-06-29T15:28:49.555Z' },
			{ city: 'testCity', timestamp: '2024-06-29T16:28:49.555Z' },
		]
		;(BikeDataModel.find as jest.Mock).mockReturnValue({
			exec: jest.fn().mockResolvedValue(mockBikeData),
		})

		const response = await request(app).get('/api/bikedata').query({
			city: 'testCity',
			start: '2024-06-29T00:00:00.000Z',
			end: '2024-06-29T23:59:59.999Z',
		})

		expect(response.status).toBe(200)
		expect(response.body).toEqual(mockBikeData)
		expect(BikeDataModel.find).toHaveBeenCalledWith({
			city: 'testCity',
			timestamp: {
				$gte: new Date('2024-06-29T00:00:00.000Z'),
				$lte: new Date('2024-06-29T23:59:59.999Z'),
			},
		})
	})

	it('should handle errors gracefully', async () => {
		;(BikeDataModel.find as jest.Mock).mockReturnValue({
			exec: jest.fn().mockRejectedValue(new Error('Database error')),
		})

		const response = await request(app).get('/api/bikedata').query({
			city: 'testCity',
			start: '2024-06-29T00:00:00.000Z',
			end: '2024-06-29T23:59:59.999Z',
		})

		expect(response.status).toBe(500)
		expect(response.body).toEqual({ message: 'Database error' })
	})
})
