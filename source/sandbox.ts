import * as Ethjs from 'ethjs';

async function doWork() {
	const eth = new Ethjs(new Ethjs.HttpProvider('http://localhost:8545'));
	const netVersion = await eth.net_version();
	console.log(`Network Version: ${netVersion}`);
}

doWork().then(() => {
	process.exit(0);
}).catch(error => {
	console.log(error);
	process.exit(1);
});
