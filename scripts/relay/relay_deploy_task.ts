import {Address, WalletTypes} from "locklift";
import { Chains } from '../base/base_chains';
import { ChainTypes } from '../base/base_chain_types';
import { parseArgs } from '../base/base_parce_args';
import { NetworkTypes } from '../base/base_network_types';

require('dotenv').config();

async function main() {
    const commandArgs = parseArgs(process.argv.slice(5));
    const network = commandArgs.network;
    const initializer = locklift.factory.getDeployedContract("AsterizmInitializer", new Address(commandArgs.initializer));

    const chains = network == NetworkTypes.localhost || network == NetworkTypes.testnet || network == NetworkTypes.testnetVenom ? Chains.testnet : Chains.mainnet;
    const signer = (await locklift.keystore.getSigner("0"))!;
    let trace;

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

    let chainIds = [];
    let chainTypes = [];
    let currentChain;
    for (let i = 0; i < chains.length; i++) {
        if (chains[i].networkName == network) {
            currentChain = chains[i];
        }

        chainIds.push(chains[i].id);
        chainTypes.push(chains[i].chainType);
    }

    const { contract: externalTranslatorObj1 } = await locklift.factory.deployContract({
        contract: "AsterizmTranslator",
        publicKey: signer.publicKey,
        initParams: {
            owner_: owner,
            localChainId_: currentChain ? currentChain.id : chainIds[0],
            localChainType_: ChainTypes.TVM,
            nonce_: locklift.utils.getRandomNonce().toFixed(),
        },
        constructorParams: {},
        value: locklift.utils.toNano(1.5),
    });
    const externalTranslator = locklift.factory.getDeployedContract("AsterizmTranslator", externalTranslatorObj1.address);
    trace = await locklift.tracing.trace(
        externalTranslator.methods.addChains({
            _chainIds: chainIds,
            _chainTypes: chainTypes,
        }).send({
            from: ownerWallet.address,
            amount: locklift.utils.toNano(1)
        })
    );
    trace = await locklift.tracing.trace(
        externalTranslator.methods.setInitializer({
            _initializerReceiver: initializer.address,
        }).send({
            from: ownerWallet.address,
            amount: locklift.utils.toNano(0.1)
        })
    );

    console.log("\nDeployment was done.\n");
    console.log("Owner address: %s", owner.toString());
    console.log("Initializer address: %s", initializer.address.toString());
    console.log("External relay address: %s\n", externalTranslator.address.toString());
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
