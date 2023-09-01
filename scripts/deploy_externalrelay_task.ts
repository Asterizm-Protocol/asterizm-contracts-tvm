import {Address, WalletTypes} from "locklift";
import { Chains } from './base/base_chains';
import { ChainTypes } from './base/base_chain_types';

require('dotenv').config();

async function main() {

    const isTestnet = true;
    const chains = isTestnet ? Chains.testnet : Chains.mainnet;
    const signer = (await locklift.keystore.getSigner("0"))!;
    let trace;

    //TODO: change it for different chains deployment!
    const owner = new Address(process.env.LOCALHOST_OWNER_ADDRESS || '');
    const ownerPubkey = process.env.LOCALHOST_OWNER_KEY || '';
    // const owner = new Address(process.env.TESTNET_EVER_OWNER_ADDRESS || '');
    // const ownerPubkey = process.env.TESTNET_EVER_OWNER_KEY || '';
    // const owner = new Address(process.env.TESTNET_VENOM_OWNER_ADDRESS || '');
    // const ownerPubkey = process.env.TESTNET_VENOM_OWNER_KEY || '';

    const ownerWallet = await locklift.factory.accounts.addExistingAccount({
        address: owner,
        type: WalletTypes.MsigAccount,
        mSigType: "multisig2",
    });

    const initializer = locklift.factory.getDeployedContract(
        "AsterizmInitializer",
        new Address("0:4c543da2b79ec6f00c3ba1f98ebe98ac5911676403707bef30705bc7e3a4b78b") // TODO: chainge it
    );
    const relayFee = 100;
    const relaySystemFee = 10;

    let chainIds = [];
    let chainTypes = [];
    let currentChain;
    for (let i = 0; i < chains.length; i++) {
        if (chains[i].isCurrent) {
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
    console.log(`Translator deployed at: ${externalTranslator.address.toString()}`);
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
            amount: locklift.utils.toNano(1)
        })
    );
    
    trace = await locklift.tracing.trace(
        initializer.methods.manageTrustedRelay({
            _relayAddress: externalTranslator.address,
            _fee: relayFee,
            _systemFee: relaySystemFee,
        }).send({
            from: ownerWallet.address,
            amount: locklift.utils.toNano(1)
        })
    );
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
