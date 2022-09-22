import { checksummedAddress, signMessage } from "./utils/ethereum"
import { main } from "./utils/node"
import { promptForPrivateKey, promptForString } from "./utils/prompts"

main(async () => {
	const { privateKey, address } = await promptForPrivateKey()
	const message = await promptForString(`Message to sign: `)
	const messageSignature = await signMessage(privateKey, message)
	console.log(`{
	"address": "${checksummedAddress(address)}",
	"msg": "${message}",
	"sig": "0x${messageSignature.r.toString(16).padStart(64, '0')}${messageSignature.s.toString(16).padStart(64, '0')}${(messageSignature.v).toString(16).padStart(2, '0')}",
	"version": "2"
}`)
})
