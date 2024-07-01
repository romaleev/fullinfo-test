import mongoose from 'mongoose'

const bikeDataSchema = new mongoose.Schema({
	city: { type: String, required: true },
	timestamp: { type: Date, required: true },
	averageFreeBikes: { type: Number, required: true },
})

export const BikeDataModel = mongoose.model('BikeData', bikeDataSchema)

export const storeBikeData = async (
	city: string,
	averageFreeBikes: number,
	timestamp: Date,
): Promise<void> => {
	const bikeData = new BikeDataModel({
		city,
		timestamp,
		averageFreeBikes,
	})
	await bikeData.save()
}
