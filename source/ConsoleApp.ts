async function main() {

}

main().then(() => {
	process.exit();
}).catch(error => {
	console.log('An error occurred.');
	console.log(error);
	process.exit();
});
