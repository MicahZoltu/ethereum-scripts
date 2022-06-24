export async function sleep(milliseconds: number) {
	return new Promise(resolve => setTimeout(resolve, milliseconds))
}

export function main(func: () => Promise<void>) {
	func().catch(error => {
		console.error('An error occurred.')
		console.error(error)
		if ('data' in error) console.error(error.data)
		debugger
		process.exit(1)
	})
}
