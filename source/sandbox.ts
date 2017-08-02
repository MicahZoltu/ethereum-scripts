import * as Ethjs from 'ethjs';
import * as EthjsAbi from 'ethjs-abi';
import { Abi, AbiEvent } from 'ethjs-shared';

const start_block = 2378196; // serpent rep upload block number
const end_block = 4086410; // serpent rep freeze block number
const oasis_contract_address = '0x83ce340889c15a3b4d38cfcd1fc93e5d8497691f';
const etherdelta_contract_address = '0x8d12A197cB00D4747a1fe03395095ce2A5CC6819';
const serpent_rep_contract_address = '0x48c80F1f4D53D5951e5D5438B54Cba84f29F32a5';
const deposit_log_signature = Ethjs.keccak256('Deposit(address,address,uint256,uint256)');

const oasis_abi: Abi[] = [
	{
		"constant":true,
		"inputs":[],
		"name":"last_offer_id",
		"outputs":[{"name":"num_offers","type":"uint256"}],
		"payable":false,
		"type":'function' as 'function',
	}, {
		"constant":true,
		"inputs":[{"name":"index","type":"uint256"}],
		"name":"offers",
		"outputs":[
			{"name":"sell_how_much","type":"uint256"},
			{"name":"sell_which_token","type":"address"},
			{"name":"buy_how_much","type":"uint256"},
			{"name":"buy_which_token","type":"address"},
			{"name":"owner","type":"address"},
			{"name":"active","type":"bool"},
			{"name":"timestamp","type":"uint64"},
		],
		"payable":false,
		"type":'function' as 'function',
	}
];

const etherdelta_deposit_event_abi: AbiEvent = {
	"type":"event",
	"name":"Deposit",
	"anonymous":false,
	"inputs":[
		{"name":"token", "indexed":false, "type":"address"},
		{"name":"user", "indexed":false, "type":"address"},
		{"name":"amount", "indexed":false, "type":"uint256"},
		{"name":"balance", "indexed":false, "type":"uint256"}
	],
};

const etherdelta_abi: Abi[] = [
	{
		"type":"function",
		"name":"tokens",
		"payable":false,
		"constant":true,
		"inputs":[
			{"name":"","type":"address"},
			{"name":"","type":"address"}
		],
		"outputs":[
			{"name":"tokens_escrowed","type":"uint256"}
		],
	}
];

async function doWork() {
	const eth = new Ethjs(new Ethjs.HttpProvider('http://localhost:8545'));
	const net_id = await eth.net_version();
	console.log(`Network ID: ${net_id}`);

	await processOasis(eth);
	await processEtherdelta(eth);
}

// iterate over all Oasis orders and look for ones holding REP and print address
async function processOasis(eth: Ethjs) {
	const oasis = await eth.contract(oasis_abi).at(oasis_contract_address);
	const { num_offers } = await oasis.last_offer_id();
	const foundOwners = {};
	let sum = new Ethjs.BN(0);
	for (let i = 0; i <= num_offers; ++i) {
		process.stdout.write(`\r[Oasis] Found: ${Object.keys(foundOwners).length}; Completion: ${Math.floor(i*100/num_offers)}%`);
		const {sell_how_much, sell_which_token, buy_how_much, buy_which_token, owner, active, timestamp} = await oasis.offers(new Ethjs.BN(i));
		if (!active) continue;
		if (sell_which_token.toLowerCase() !== serpent_rep_contract_address.toLowerCase()) continue;
		sum = sum.add(sell_how_much);
		foundOwners[owner] = ((owner in foundOwners) ? new Ethjs.BN(foundOwners[owner], 10).add(sell_how_much) : sell_how_much).toString(10);
	}
	console.log();
	console.log(`[Oasis] Total REP Escrowed: ~${sum.div(new Ethjs.BN('1000000000000000000', 10)).toString(10)}`)
	console.log(`[Oasis] ${JSON.stringify(foundOwners, null, '\t')}`);
}

// iterate over all EtherDelta deposit logs and look for any that still have a balance and print address
async function processEtherdelta(eth: Ethjs) {
	const etherdelta = await eth.contract(etherdelta_abi).at(etherdelta_contract_address);
	let i = start_block;
	const collected_addresses = {};
	while (i <= end_block) {
		process.stdout.write(`\r[EtherDelta] Found: ${Object.keys(collected_addresses).length}; Completion: ${Math.floor((i-start_block)*100/(end_block - start_block))}%`);
		const from_block = i;
		const to_block = i + 5000;
		i += 5001;
		const logs = await eth.getLogs({
			fromBlock: `0x${from_block.toString(16)}`,
			toBlock: `0x${to_block.toString(16)}`,
			address: etherdelta_contract_address,
			topics: [deposit_log_signature],
		});
		for (let log of logs) {
			const decoded = EthjsAbi.decodeEvent(etherdelta_deposit_event_abi, log.data);
			if (decoded.token.toLowerCase() !== serpent_rep_contract_address.toLowerCase()) continue;
			collected_addresses[decoded.user] = true;
		}
	}
	let sum = new Ethjs.BN(0);
	const remaining_addresses = {};
	for (let address in collected_addresses) {
		if (collected_addresses.hasOwnProperty(address)) {
			const { tokens_escrowed } = await etherdelta.tokens(serpent_rep_contract_address, address);
			if (tokens_escrowed == 0) continue;
			sum = sum.add(tokens_escrowed);
			remaining_addresses[address] = tokens_escrowed.toString(10);
		}
	}
	console.log();
	console.log(`[EtherDelta] Total REP Escrowed: ~${sum.div(new Ethjs.BN('1000000000000000000', 10)).toString(10)}`)
	console.log(`[EtherDelta] ${JSON.stringify(remaining_addresses, null, '\t')}`);
}

doWork().then(() => {
	process.exit(0);
}).catch(error => {
	console.log(error);
	process.exit(1);
});
