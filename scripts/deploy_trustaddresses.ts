import {Address, WalletTypes} from "locklift";
import { Chains } from './base/base_chains';
import { NetworkTypes } from './base/base_network_types';
import { parseArgs } from './base/base_parce_args';

require('dotenv').config();

async function main() {
    const commandArgs = parseArgs(process.argv.slice(5));

    const chains = commandArgs.network == NetworkTypes.localhost || commandArgs.network == NetworkTypes.testnet || commandArgs.network == NetworkTypes.testnetVenom ?
        Chains.testnet : Chains.mainnet;
  
    const gas = locklift.factory.getDeployedContract("GasStation", new Address('0:10d7a2eed64bf120c34a71e8ff802e57e467e7728c48a7145408347d572a4158'));

    let owner;
    let ownerPubkey;
    let tokenRootAddress;
    if (commandArgs.network == NetworkTypes.localhost) {
        owner = new Address(process.env.LOCALHOST_OWNER_ADDRESS || '');
        ownerPubkey = process.env.LOCALHOST_OWNER_KEY || '';
        tokenRootAddress = new Address('0:4ead8fa1a11d62cc0e73f6d0ecb7cdb23db1d61f21cb78901035357765e0fad0');
    } else if (commandArgs.network == NetworkTypes.testnet) {
        owner = new Address(process.env.TESTNET_EVER_OWNER_ADDRESS || '');
        ownerPubkey = process.env.TESTNET_EVER_OWNER_KEY || '';
        tokenRootAddress = new Address('0:8c6dcaa30727458527e99a479dae92a92a51c24e235e5b531659e201204d79ee');
    } else if (commandArgs.network == NetworkTypes.testnetVenom) {
        owner = new Address(process.env.TESTNET_VENOM_OWNER_ADDRESS || '');
        ownerPubkey = process.env.TESTNET_VENOM_OWNER_KEY || '';
        tokenRootAddress = new Address('0:d5756401c0e2ad938bb980e72846f22f02b15d83c2c9190f93c0c2ff44771336');
    } else {
        owner = new Address(process.env.MAINNET_EVER_OWNER_ADDRESS || '');
        ownerPubkey = process.env.MAINNET_EVER_OWNER_KEY || '';
        tokenRootAddress = new Address('0:8c6dcaa30727458527e99a479dae92a92a51c24e235e5b531659e201204d79ee');
    }

    // const ownerWallet = await locklift.factory.accounts.addExistingAccount({
    //     address: owner,
    //     type: WalletTypes.MsigAccount,
    //     mSigType: "multisig2",
    // });
    // const ownerWallet = await locklift.factory.accounts.addExistingAccount({
    //     publicKey: ownerPubkey,
    //     type: WalletTypes.WalletV3,
    // });
    const ownerWallet = await locklift.factory.accounts.addExistingAccount({
      address: owner,
      type: WalletTypes.EverWallet,
    });

    let chainIds = [];
    let trustedAddresses = [];
    for (let i = 0; i < chains.length; i++) {
        chainIds.push(chains[i].id);
        trustedAddresses.push(chains[i].trustAddresses.gas);
    }



    // let tracing = await locklift.tracing.trace(
    //     gas.methods.addTrustedAddresses({
    //         _chainIds: chainIds,
    //         _trustedAddresses: trustedAddresses
    //     }).send({
    //         from: ownerWallet.address,
    //         amount: locklift.utils.toNano(1)
    //     })
    // );
    await gas.methods.addTrustedAddresses({
        _chainIds: chainIds,
        _trustedAddresses: trustedAddresses
    }).send({
        from: ownerWallet.address,
        amount: locklift.utils.toNano(1)
    });
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
