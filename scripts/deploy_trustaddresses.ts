import {Address, WalletTypes} from "locklift";
import { Chains } from './base/base_chains';
import { NetworkTypes } from './base/base_network_types';
import { parseArgs } from './base/base_parce_args';

require('dotenv').config();

async function main() {
    let trace;
    const commandArgs = parseArgs(process.argv.slice(5));
    const network = commandArgs.network;
    const targetAddress = commandArgs.targetAddress;

    const chains = network == NetworkTypes.localhost || network == NetworkTypes.testnet || network == NetworkTypes.testnetVenom ?
        Chains.testnet : Chains.mainnet;
  
    const targetContract = locklift.factory.getDeployedContract("AsterizmDemo", new Address(targetAddress));

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
    //   address: owner,
    //   type: WalletTypes.EverWallet,
    // });

    let chainIds = [];
    let trustedAddresses = [];
    for (let i = 0; i < chains.length; i++) {
        chainIds.push(chains[i].id);
        if (chains[i].trustAddresses.gas.uint != '0') {
          trustedAddresses.push(chains[i].trustAddresses.gas.uint);
        }
    }

    console.log([chainIds, trustedAddresses]);

    trace = await locklift.tracing.trace(
        targetContract.methods.addTrustedAddresses({
            _chainIds: chainIds,
            _trustedAddresses: trustedAddresses
        }).send({
            from: ownerWallet.address,
            amount: locklift.utils.toNano(2)
        })
    );

    console.log("\nAdded trusted addresses successfully\n");
    console.log("Target contract address: %s", targetContract.address);
    console.log("Transfer hash: %s\n", trace.inMessage.hash);
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
