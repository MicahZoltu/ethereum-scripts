import fetch from 'node-fetch'
import * as microEthSigner from 'micro-eth-signer'
import { keccak_256 } from '@noble/hashes/sha3'
import { EncodableArray, encodeMethod } from '@zoltu/ethereum-abi-encoder'
import { sleep } from './node'
import { ISignedTransaction, IUnsignedTransaction1559, serializeTransactionToString, signTransaction } from './ethereum'
import { parseBlock, parseBytes32, parseData, parseJsonRpcResponse, parseLogs, parseQuantity, parseTransactionReceipt, serializeAddress, serializeBytes32, serializeData, serializeQuantity, TransactionReceipt } from './ethereum-wire'
import { PartiallyRequired } from './typescript'
import { bytes32String, bytesToUnsigned } from './bigint'

export class EthereumClient {
	private nextRequestId: number = 1

	public constructor(
		private readonly protocolHostPortPath: string,
		private readonly extraHeaders: Record<string, string>,
	) {}

	public readonly callContractOffChain = async (to: bigint, methodSignature: string, parameters: EncodableArray) => {
		const data = await encodeMethod(async (message) => bytesToUnsigned(keccak_256(message)), methodSignature, parameters)
		return this.call({ to, data })
	}

	public readonly getLatestBlock = async () => {
		const block = await this.jsonRpcRequest('eth_getBlockByNumber', ['latest', false])
		return parseBlock(block)
	}

	public readonly getBalance = async (address: bigint) => {
		const response = await this.jsonRpcRequest('eth_getBalance', [serializeAddress(address), 'latest'])
		return parseQuantity(response)
	}

	public readonly getChainId = async () => {
		const response = await this.jsonRpcRequest('eth_chainId', [])
		return parseQuantity(response)
	}

	public readonly getTransactionCount = async (address: bigint) => {
		const response = await this.jsonRpcRequest('eth_getTransactionCount', [serializeAddress(address), 'latest'])
		return parseQuantity(response)
	}

	public readonly getTransactionReceipt = async (hash: bigint) => {
		const response = await this.jsonRpcRequest('eth_getTransactionReceipt', [serializeBytes32(hash)])
		return parseTransactionReceipt(response)
	}

	public readonly call = async (transaction: PartiallyRequired<Partial<IUnsignedTransaction1559>, 'to' | 'data'>) => {
		const result = await this.jsonRpcRequest('eth_call', [{
			type: '0x2',
			...transaction.from ? { from: serializeAddress(transaction.from) } : {},
			...transaction.chainId ? { chainId: serializeQuantity(transaction.chainId) } : {},
			...transaction.nonce ? { nonce: serializeQuantity(transaction.nonce) } : {},
			...transaction.maxFeePerGas ? { maxFeePerGas: serializeQuantity(transaction.maxFeePerGas) } : {},
			...transaction.maxPriorityFeePerGas ? { maxPriorityFeePerGas: serializeQuantity(transaction.maxPriorityFeePerGas) } : {},
			...transaction.gasLimit ? { gas: serializeQuantity(transaction.gasLimit) } : {},
			to: transaction.to === null ? null : serializeAddress(transaction.to),
			...transaction.value ? { value: serializeQuantity(transaction.value) } : {},
			data: serializeData(transaction.data),
			...transaction.accessList ? { accessList: transaction.accessList.map(item => ({
				address: serializeAddress(item.address),
				storageKeys: item.storageKeys.map(serializeBytes32),
			}))} : {},
		}, 'latest'])

		return parseData(result)
	}

	public readonly estimateGas = async (transaction: PartiallyRequired<Partial<IUnsignedTransaction1559>, 'to' | 'data'>) => {
		const result = await this.jsonRpcRequest('eth_estimateGas', [{
			type: '0x2',
			...transaction.from ? { from: serializeAddress(transaction.from) } : {},
			...transaction.chainId ? { chainId: serializeQuantity(transaction.chainId) } : {},
			...transaction.nonce ? { nonce: serializeQuantity(transaction.nonce) } : {},
			...transaction.maxFeePerGas ? { maxFeePerGas: serializeQuantity(transaction.maxFeePerGas) } : {},
			...transaction.maxPriorityFeePerGas ? { maxPriorityFeePerGas: serializeQuantity(transaction.maxPriorityFeePerGas) } : {},
			...transaction.gasLimit ? { gas: serializeQuantity(transaction.gasLimit) } : {},
			to: transaction.to === null ? null : serializeAddress(transaction.to),
			...transaction.value ? { value: serializeQuantity(transaction.value) } : {},
			data: serializeData(transaction.data),
			...transaction.accessList ? { accessList: transaction.accessList.map(item => ({
				address: serializeAddress(item.address),
				storageKeys: item.storageKeys.map(serializeBytes32),
			}))} : {},
		}, 'latest'])

		return parseQuantity(result)
	}

	public readonly getLogs = async (startBlock: bigint, endBlock: bigint | 'latest', contractAddress: bigint, topics: readonly bigint[]) => {
		const rawLogs = await this.jsonRpcRequest('eth_getLogs', [{
			fromBlock: serializeQuantity(startBlock),
			toBlock: endBlock === 'latest' ? 'latest' : serializeQuantity(endBlock),
			address: serializeAddress(contractAddress),
			topics: topics.map(serializeBytes32)
		}])
		return parseLogs(rawLogs)
	}

	protected readonly jsonRpcRequest = async (method: string, params: readonly unknown[]) => {
		const request = { jsonrpc: '2.0', id: ++this.nextRequestId, method, params } as const
		const body = JSON.stringify(request)
		const response = await fetch(this.protocolHostPortPath, { method: 'POST', headers: { 'Content-Type': 'application/json', ...this.extraHeaders }, body })
		if (!response.ok) throw new Error(`${response.status}: ${response.statusText}\n${await response.text()}`)
		const rawJsonRpcResponse = await response.json()
		const jsonRpcResponse = parseJsonRpcResponse(rawJsonRpcResponse)
		if ('error' in jsonRpcResponse) {
			throw new Error(`JSON-RPC Response Error:\nRequest:\n${JSON.stringify(request)}\nResponse:\n${JSON.stringify(rawJsonRpcResponse)}`)
		}
		return jsonRpcResponse.result
	}
}

export class SigningEthereumClient extends EthereumClient {
	public constructor(
		protocolHostPortPath: string,
		extraHeaders: Record<string, string>,
		private readonly privateKey: bigint,
		private readonly maxFeePerGas: bigint,
		private readonly maxPriorityFeePerGas: bigint,
	) {
		super(protocolHostPortPath, extraHeaders)
	}

	public readonly callContractOnChain = async (to: bigint, methodSignature: string, parameters: EncodableArray, value: bigint = 0n) => {
		const data = await encodeMethod(async (message) => bytesToUnsigned(keccak_256(message)), methodSignature, parameters)
		return await this.sendTransaction({ to, data, value })
	}

	public readonly sendSignedTransaction = async (transaction: ISignedTransaction) => {
		const response = await this.jsonRpcRequest('eth_sendRawTransaction', [serializeTransactionToString(transaction)])
		return parseBytes32(response)
	}

	public readonly sendTransaction = async (transaction: PartiallyRequired<Partial<IUnsignedTransaction1559>, 'to' | 'data'>) => {
		const privateKey = this.privateKey
		if (privateKey === undefined) throw new Error(`Cannot send a transaction with an EthereumClient that was instantiated without a private key.`)
		const signerAddress = BigInt(microEthSigner.Address.fromPrivateKey(bytes32String(privateKey)))
		const nonce = transaction.nonce || await this.getTransactionCount(signerAddress)
		const chainId = await this.getChainId()
		const gasLimit = transaction.gasLimit || await this.estimateGas({
			...transaction,
			from: signerAddress,
			chainId,
			nonce,
		})
		const signedTransaction = await signTransaction(privateKey, {
			type: '1559',
			accessList: transaction.accessList || [],
			chainId,
			data: transaction.data,
			from: signerAddress,
			gasLimit,
			maxFeePerGas: transaction.maxFeePerGas || this.maxFeePerGas,
			maxPriorityFeePerGas: transaction.maxPriorityFeePerGas || this.maxPriorityFeePerGas,
			nonce,
			to: transaction.to,
			value: transaction.value || 0n,
		})
		const transactionHash = await this.sendSignedTransaction(signedTransaction)
		return {
			transactionHash,
			receipt: waitForReceipt(this, transactionHash),
		}
	}
}

export async function waitForReceipt(client: Pick<EthereumClient, 'getTransactionReceipt'>, transactionHash: bigint): Promise<Exclude<TransactionReceipt, null>>
export async function waitForReceipt(client: Pick<EthereumClient, 'getTransactionReceipt'>, transactionHash: bigint, timeoutMilliseconds?: number): Promise<TransactionReceipt>
export async function waitForReceipt(client: Pick<EthereumClient, 'getTransactionReceipt'>, transactionHash: bigint, timeoutMilliseconds?: number): Promise<TransactionReceipt> {
	const startTime = Date.now()
	while (true) {
		const receipt = await client.getTransactionReceipt(transactionHash)
		if (receipt !== null) return receipt
		if (timeoutMilliseconds !== undefined && Date.now() - startTime > timeoutMilliseconds) return null
		await sleep(250)
	}
}
