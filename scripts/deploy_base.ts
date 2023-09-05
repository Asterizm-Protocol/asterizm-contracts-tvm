import {Address, WalletTypes} from "locklift";
import { Chains } from './base/base_chains';
import { ChainTypes } from './base/base_chain_types';
import { parseArgs } from './base/base_parce_args';
import { NetworkTypes } from './base/base_network_types';

require('dotenv').config();

async function main() {

    let trace;
    const commandArgs = parseArgs(process.argv.slice(5));
    const network = commandArgs.network;

    const chains = network == NetworkTypes.localhost || network == NetworkTypes.testnet || network == NetworkTypes.testnetVenom ? Chains.testnet : Chains.mainnet;

    const signer = (await locklift.keystore.getSigner("0"))!;

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
    let trustedAddresses = [];
    let currentChain;
    for (let i = 0; i < chains.length; i++) {
        if (chains[i].isCurrent) {
            currentChain = chains[i];
        }

        chainIds.push(chains[i].id);
        chainTypes.push(chains[i].chainType);
        if (chains[i].trustAddresses.gas.uint != '0') {
            trustedAddresses.push(chains[i].trustAddresses.gas.uint);
        }
    }

    currentChain = currentChain ? currentChain : chains[0];

    let translatorAddress;
    // translatorAddress = new Address("0:520237b291e5af75605228ede9b9fb56ddcd30574251d27490ca0a0418bf5fab");
    if (!translatorAddress) {
        const { contract: translatorObj } = await locklift.factory.deployContract({
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
        translatorAddress = translatorObj.address;

        trace = await locklift.tracing.trace(
            translatorObj.methods.addChains({
                _chainIds: chainIds,
                _chainTypes: chainTypes,
            }).send({
                from: ownerWallet.address,
                amount: locklift.utils.toNano(1)
            })
        );
    }

    const translator = locklift.factory.getDeployedContract("AsterizmTranslator", translatorAddress);


    const AsterizmInitializerTransfer = locklift.factory.getContractArtifacts("AsterizmInitializerTransfer");
    const AsterizmClientTransfer = locklift.factory.getContractArtifacts("AsterizmClientTransfer");

    let initializerAddress;
    // initializerAddress = new Address("0:7dc4f2de520a9317aa4e24dcc08e18955d92765de70665dd0e1ca07935d2f5af");
    if (!initializerAddress) {
        const { contract: initializer } = await locklift.factory.deployContract({
            contract: "AsterizmInitializer",
            publicKey: signer.publicKey,
            initParams: {
                owner_: owner,
                translatorLib_: translator.address,
                initializerTransferCode_: AsterizmInitializerTransfer.code,
                clientTransferCode_: AsterizmClientTransfer.code,
            },
            constructorParams: {},
            value: locklift.utils.toNano(1.5),
        });
        initializerAddress = initializer.address;

        trace = await locklift.tracing.trace(
            translator.methods.setInitializer({
                _initializerReceiver: initializer.address,
            }).send({
                from: ownerWallet.address,
                amount: locklift.utils.toNano(1)
            })
        );
    }

    const initializer = locklift.factory.getDeployedContract("AsterizmInitializer", initializerAddress);

    console.log("\nDeployment was done\n");
    console.log("Owner address: %s", owner.toString());
    console.log("Translator address: %s", translator.address.toString());
    console.log("Initializer address: %s\n", initializer.address.toString());
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
