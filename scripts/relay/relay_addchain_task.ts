import {Address, WalletTypes} from "locklift";
import { NetworkTypes } from '../base/base_network_types';
import { parseArgs } from '../base/base_parce_args';
import {Chains} from "../base/base_chains";

require('dotenv').config();

async function main() {
    let trace;
    const commandArgs = parseArgs(process.argv.slice(5));
    const network = commandArgs.network;
    const chainId = commandArgs.chainId;
    const chainType = commandArgs.chainType;

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

    const chains = network == NetworkTypes.localhost || network == NetworkTypes.testnet || network == NetworkTypes.testnetVenom ? Chains.testnet : Chains.mainnet;
    let chainIds = [];
    let chainTypes = [];
    let trustedAddresses = [];
    let currentChain;
    for (let i = 0; i < chains.length; i++) {
        if (chains[i].networkName == network) {
            currentChain = chains[i];
        }

        chainIds.push(chains[i].id);
        chainTypes.push(chains[i].chainType);
        if (chains[i].trustAddresses.gas.uint != '0') {
            trustedAddresses.push(chains[i].trustAddresses.gas.uint);
        }
    }

    currentChain = currentChain ? currentChain : chains[0];
    const translator = locklift.factory.getDeployedContract("AsterizmTranslator", new Address(currentChain.contractAddresses.translator.address));

    trace = await locklift.tracing.trace(
        translator.methods.addChain({
            _chainId: chainId,
            _chainType: chainType
        }).send({
            from: ownerWallet.address,
            amount: locklift.utils.toNano(2)
        })
    );

    console.log("\nChain added successfully\n");
    console.log("Translator contract address: %s", translator.address);
    console.log("Transfer hash: %s\n", trace.inMessage.hash);
}

main()
    .then(() => process.exit(0))
    .catch(e => {
        console.log(e);
        process.exit(1);
    });
