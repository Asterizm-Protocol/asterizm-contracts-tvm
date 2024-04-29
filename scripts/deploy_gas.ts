import {Address, WalletTypes} from "locklift";
import { NetworkTypes } from './base/base_network_types';
import { HashVersions } from './base/base_hash_versions';
import { parseArgs } from './base/base_parce_args';
import {Chains} from "./base/base_chains";

require('dotenv').config();

async function main() {
    let trace;
    const commandArgs = parseArgs(process.argv.slice(5));
    const network = commandArgs.network;
    const initializer = locklift.factory.getDeployedContract("AsterizmInitializer", new Address(commandArgs.initializer));
    const minUsdAmount = commandArgs.minUsdAmount;
    const maxUsdAmount = commandArgs.maxUsdAmount;
    const minUsdAmountPerChain = commandArgs.minUsdAmountPerChain;
    const maxUsdAmountPerChain = commandArgs.maxUsdAmountPerChain;
    const externalRelayAddress = commandArgs.externalRelay;
    const decimals = commandArgs.decimals ? commandArgs.decimals : 9;
    const pauseInSeconds = commandArgs.pause ? commandArgs.pause : 0; // Use this shit for avoid callbacks errors

    let owner;
    let ownerPubkey;
    let tokenRootAddress;
    if (network == NetworkTypes.localhost) {
        owner = new Address(process.env.LOCALHOST_OWNER_ADDRESS || '');
        ownerPubkey = process.env.LOCALHOST_OWNER_KEY || '';
        tokenRootAddress = new Address('0:4ead8fa1a11d62cc0e73f6d0ecb7cdb23db1d61f21cb78901035357765e0fad0');
    } else if (network == NetworkTypes.testnet) {
        owner = new Address(process.env.TESTNET_EVER_OWNER_ADDRESS || '');
        ownerPubkey = process.env.TESTNET_EVER_OWNER_KEY || '';
        tokenRootAddress = new Address('0:8c6dcaa30727458527e99a479dae92a92a51c24e235e5b531659e201204d79ee');
    } else if (network == NetworkTypes.testnetVenom) {
        owner = new Address(process.env.TESTNET_VENOM_OWNER_ADDRESS || '');
        ownerPubkey = process.env.TESTNET_VENOM_OWNER_KEY || '';
        // tokenRootAddress = new Address('0:d5756401c0e2ad938bb980e72846f22f02b15d83c2c9190f93c0c2ff44771336');
        tokenRootAddress = new Address('0:4a2219d92ed7971c16093c04dc2f442925fcfb4f1c7f18fc4b6b18cf100b27aa');
    } else if (network == NetworkTypes.venom) {
        owner = new Address(process.env.MAINNET_VENOM_OWNER_ADDRESS || '');
        ownerPubkey = process.env.MAINNET_VENOM_OWNER_KEY || '';
        tokenRootAddress = new Address('0:8c6dcaa30727458527e99a479dae92a92a51c24e235e5b531659e201204d79ee');
    } else {
        owner = new Address(process.env.MAINNET_EVER_OWNER_ADDRESS || '');
        ownerPubkey = process.env.MAINNET_EVER_OWNER_KEY || '';
        tokenRootAddress = new Address('0:8c6dcaa30727458527e99a479dae92a92a51c24e235e5b531659e201204d79ee');
    }

    const ownerWallet = await locklift.factory.accounts.addExistingAccount({
        address: owner,
        type: WalletTypes.MsigAccount,
        mSigType: "multisig2",
    });
    // const ownerWallet = await locklift.factory.accounts.addExistingAccount({
    //     publicKey: ownerPubkey,
    //     type: WalletTypes.WalletV3,
    // });
    // const ownerWallet = await locklift.factory.accounts.addExistingAccount({
    //     address: owner,
    //     type: WalletTypes.EverWallet,
    // });

    const chains = network == NetworkTypes.localhost || network == NetworkTypes.testnet || network == NetworkTypes.testnetVenom ? Chains.testnet : Chains.mainnet;
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
    currentChain = currentChain ? currentChain : chains[0];
    const signer = (await locklift.keystore.getSigner(currentChain.giverId || '0'))!;

    let gasAddress;
    // gasAddress = new Address("0:bbc77c9530eb2911428f0073348fbf4c7c9c77566b5fb91a17133ccb29bbc34e");
    if (!gasAddress) {
        const {contract: gasObject} = await locklift.factory.deployContract({
            contract: "GasStation",
            publicKey: signer.publicKey,
            initParams: {
                owner_: owner,
                initializerLib_: initializer.address,
                notifyTransferSendingResult_: false,
                disableHashValidation_: true,
                nonce_: locklift.utils.getRandomNonce().toFixed(),
                hashVersion_: HashVersions.CrosschainV1,
            },
            constructorParams: {},
            value: locklift.utils.toNano(2),
        });
        gasAddress = gasObject.address;
    }

    const gas = locklift.factory.getDeployedContract("GasStation", gasAddress);
    console.log("GasSender address: %s", gas.address.toString());

    if (pauseInSeconds > 0) {
        console.log("Pause in seconds: %s", pauseInSeconds.toString());
        await new Promise(f => setTimeout(f, pauseInSeconds * 1000));
    }

    if (externalRelayAddress != undefined) {
        const externalRelay = locklift.factory.getDeployedContract("AsterizmTranslator", new Address(externalRelayAddress));
        trace = await locklift.tracing.trace(
            gas.methods.setExternalRelay({
                _externalRelay: externalRelay.address,
            }).send({
                from: ownerWallet.address,
                amount: locklift.utils.toNano(1)
            })
        );
    }

    if (minUsdAmount != undefined) {
        trace = await locklift.tracing.trace(
            gas.methods.setMinUsdAmount({
                _amount: minUsdAmount
            }).send({
                from: ownerWallet.address,
                amount: locklift.utils.toNano(1)
            })
        );
    }

    if (maxUsdAmount != undefined) {
        trace = await locklift.tracing.trace(
            gas.methods.setMaxUsdAmount({
                _amount: maxUsdAmount
            }).send({
                from: ownerWallet.address,
                amount: locklift.utils.toNano(1)
            })
        );
    }

    if (minUsdAmountPerChain != undefined) {
        trace = await locklift.tracing.trace(
            gas.methods.setMinUsdAmountPerChain({
                _amount: minUsdAmountPerChain
            }).send({
                from: ownerWallet.address,
                amount: locklift.utils.toNano(1)
            })
        );
    }

    if (maxUsdAmountPerChain != undefined) {
        trace = await locklift.tracing.trace(
            gas.methods.setMaxUsdAmountPerChain({
                _amount: maxUsdAmountPerChain
            }).send({
                from: ownerWallet.address,
                amount: locklift.utils.toNano(1)
            })
        );
    }

    trace = await locklift.tracing.trace(
        gas.methods.addStableCoin({
            _tokenRoot: tokenRootAddress,
            _decimals: decimals
        }).send({
            from: ownerWallet.address,
            amount: locklift.utils.toNano(2)
        })
    );

    console.log("\nDeployment was done");
    console.log("TestToken (ATT) address: %s", tokenRootAddress.toString());
    console.log("Initializer address: %s", initializer.address.toString());
    if (externalRelayAddress != undefined) {
        console.log("External relay address: %s", externalRelayAddress);
        console.log("GasSender address: %s\n", gas.address.toString());
    } else {
        console.log("GasSender address: %s\n", gas.address.toString());
    }
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
