import {Address, WalletTypes} from "locklift";
import { Chains } from './base/base_chains';
import { NetworkTypes } from './base/base_network_types';
import { parseArgs } from './base/base_parce_args';

require('dotenv').config();

async function main() {
    let trace;
    const commandArgs = parseArgs(process.argv.slice(5));
    const network = commandArgs.network;
    const contractAddress = commandArgs.contractAddress;
    const trustedChainId = commandArgs.trustedChainId;
    const trustedAddress = commandArgs.trustedAddress;

    let owner;
    let ownerPubkey;
    if (network == NetworkTypes.localhost) {
        owner = new Address(process.env.LOCALHOST_OWNER_ADDRESS || '');
        ownerPubkey = process.env.LOCALHOST_OWNER_KEY || '';
    } else if (network == NetworkTypes.testnet) {
        owner = new Address(process.env.TESTNET_EVER_OWNER_ADDRESS || '');
        ownerPubkey = process.env.TESTNET_EVER_OWNER_KEY || '';
    } else if (network == NetworkTypes.testnetVenom) {
        owner = new Address(process.env.TESTNET_VENOM_OWNER_ADDRESS || '');
        ownerPubkey = process.env.TESTNET_VENOM_OWNER_KEY || '';
    } else if (network == NetworkTypes.venom) {
        owner = new Address(process.env.MAINNET_VENOM_OWNER_ADDRESS || '');
        ownerPubkey = process.env.MAINNET_VENOM_OWNER_KEY || '';
    } else {
        owner = new Address(process.env.MAINNET_EVER_OWNER_ADDRESS || '');
        ownerPubkey = process.env.MAINNET_EVER_OWNER_KEY || '';
    }

    const ownerWallet = await locklift.factory.accounts.addExistingAccount({
        address: owner,
        type: WalletTypes.MsigAccount,
        mSigType: "multisig2",
    });
  
    const targetContract = locklift.factory.getDeployedContract("AsterizmDemo", new Address(contractAddress));

    trace = await locklift.tracing.trace(
        targetContract.methods.addTrustedAddresses({
            _chainIds: [trustedChainId],
            _trustedAddresses: [trustedAddress]
        }).send({
            from: ownerWallet.address,
            amount: locklift.utils.toNano(2)
        })
    );

    console.log("\nAdded trusted address successfully\n");
    console.log("Target contract address: %s", targetContract.address);
    console.log("Transfer hash: %s\n", trace.inMessage.hash);
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
