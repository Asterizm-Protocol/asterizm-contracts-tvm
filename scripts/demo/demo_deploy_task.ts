import {Address, WalletTypes} from "locklift";
import {EverWalletAccount} from "everscale-standalone-client/nodejs";
const bigInt = require("big-integer");
import { HashVersions } from '../base/base_hash_versions';
import { parseArgs } from '../base/base_parce_args';
import { NetworkTypes } from '../base/base_network_types';

require('dotenv').config();

async function main() {
    const commandArgs = parseArgs(process.argv.slice(5));
    const network = commandArgs.network;
    const initializer = locklift.factory.getDeployedContract("AsterizmInitializer", new Address(commandArgs.initializer));
    const externalRelayAddress = commandArgs.externalRelay;
    let trace;
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


    const { contract: demo } = await locklift.factory.deployContract({
        contract: "AsterizmDemo",
        publicKey: signer.publicKey,
        initParams: {
            owner_: owner,
            initializerLib_: initializer.address,
            notifyTransferSendingResult_: true,
            disableHashValidation_: false,
            hashVersion_: HashVersions.CrosschainV1,
            nonce_: locklift.utils.getRandomNonce().toFixed(),
        },
        constructorParams: {},
        value: locklift.utils.toNano(2),
    });
    console.log(`AsterizmDemo: ${demo.address.toString()}`);

    if (externalRelayAddress != undefined) {
        const externalRelay = locklift.factory.getDeployedContract("AsterizmTranslator", new Address(externalRelayAddress));
        trace = await locklift.tracing.trace(
            demo.methods.setExternalRelay({
                _externalRelay: externalRelay.address,
            }).send({
                from: ownerWallet.address,
                amount: locklift.utils.toNano(1)
            })
        );
    }
    console.log("\nDeployment was done.\n");
    console.log("Owner address: %s", owner.toString());
    console.log("Initializer address: %s", initializer.address.toString());
    if (externalRelayAddress != undefined) {
        console.log("External relay address: %s", externalRelayAddress);
        console.log("AsterizmDemo address: %s\n", demo.address.toString());
    } else {
        console.log("AsterizmDemo address: %s\n", demo.address.toString());
    }

}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
