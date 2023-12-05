import axios from 'axios'

export async function uploadMockRequest(testData: {
	id: number
	number: number
}) {
	try {
		 await axios
			.post(
				'',testData
			)
			.then((res) => {
				console.log('scuccess', res)
			})
	} catch (err) {
		console.error('error', err)
	}
}
