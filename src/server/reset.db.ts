import mongoose from 'mongoose'
import { mongoUrl } from '#src/config.json'

interface CustomError extends Error {
	stack?: string
}

// Function to reset the database
const resetDatabase = async (): Promise<void> => {
	try {
		// Connect to the MongoDB server
		await mongoose.connect(mongoUrl)
		console.log('Connected successfully to server')

		// Drop the database
		await mongoose.connection.db.dropDatabase()
		console.log(`Database bikedata reset successfully`)
	} catch (err) {
		const error = err as CustomError
		console.error(error.stack || error.message)
	} finally {
		// Close the connection
		await mongoose.connection.close()
	}
}

// Execute the function
resetDatabase().catch((err) => {
	const error = err as CustomError
	console.error('Failed to reset the database', error.stack || error.message)
})
